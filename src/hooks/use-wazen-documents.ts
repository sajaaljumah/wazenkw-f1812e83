import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-wazen-auth";
import type {
  DocumentKind,
  DocumentStatus,
  ExtractedFields,
  FinancialDocument,
} from "@/lib/documents";
import { extractionProvider, savesAsTransaction } from "@/lib/documents";

const BUCKET = "financial-documents";

export function useDocuments() {
  const { user, loading } = useSession();
  return useQuery({
    queryKey: ["documents", user?.id],
    enabled: !loading && !!user,
    queryFn: async (): Promise<FinancialDocument[]> => {
      const { data, error } = await supabase
        .from("financial_documents")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as FinancialDocument[];
    },
  });
}

function useInvalidateDocuments() {
  const queryClient = useQueryClient();
  return async () => {
    await queryClient.invalidateQueries({ queryKey: ["documents"] });
  };
}

/** Uploads the file to the user's private folder and records the document row. */
export function useUploadDocument() {
  const { user } = useSession();
  const invalidate = useInvalidateDocuments();
  return useMutation({
    mutationFn: async ({
      file,
      kind,
      title,
    }: {
      file: File;
      kind: DocumentKind;
      title: string | null;
    }): Promise<FinancialDocument> => {
      const extension = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${user!.id}/${crypto.randomUUID()}.${extension}`;
      const upload = await supabase.storage.from(BUCKET).upload(path, file, {
        contentType: file.type || undefined,
        upsert: false,
      });
      if (upload.error) throw upload.error;

      const { data, error } = await supabase
        .from("financial_documents")
        .insert({
          user_id: user!.id,
          doc_type: kind,
          title,
          file_path: path,
          file_name: file.name,
          mime_type: file.type || null,
          file_size: file.size,
          status: "uploaded",
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as unknown as FinancialDocument;
    },
    onSuccess: invalidate,
  });
}

export function useUpdateDocument() {
  const invalidate = useInvalidateDocuments();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      extracted,
      extractionSource,
      errorMessage,
    }: {
      id: string;
      status?: DocumentStatus;
      extracted?: ExtractedFields;
      extractionSource?: string;
      errorMessage?: string | null;
    }) => {
      const patch: Record<string, unknown> = {};
      if (status) patch["status"] = status;
      if (extracted) patch["extracted"] = extracted;
      if (extractionSource) patch["extraction_source"] = extractionSource;
      if (errorMessage !== undefined) patch["error_message"] = errorMessage;
      const { error } = await supabase.from("financial_documents").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

export function useDeleteDocument() {
  const invalidate = useInvalidateDocuments();
  return useMutation({
    mutationFn: async (document: FinancialDocument) => {
      if (document.file_path) {
        await supabase.storage.from(BUCKET).remove([document.file_path]);
      }
      const { error } = await supabase.from("financial_documents").delete().eq("id", document.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });
}

/**
 * Asks the configured extraction provider to read the document. No AI service is
 * connected yet, so today this reports "unavailable" instead of inventing data.
 */
export function useRequestExtraction() {
  const invalidate = useInvalidateDocuments();
  return useMutation({
    mutationFn: async (document: FinancialDocument) => {
      await supabase
        .from("financial_documents")
        .update({ status: "awaiting_extraction" })
        .eq("id", document.id);
      const outcome = await extractionProvider().extract({
        documentId: document.id,
        kind: document.doc_type,
        filePath: document.file_path,
        mimeType: document.mime_type,
      });
      return outcome;
    },
    onSuccess: invalidate,
  });
}

/**
 * Saves the reviewed fields. Receipts and general documents also create a real
 * spending record so the money flows through the existing calculations.
 */
export function useSaveDocumentRecord() {
  const { user } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      document,
      fields,
    }: {
      document: FinancialDocument;
      fields: ExtractedFields;
    }) => {
      let transactionId: string | null = null;
      if (savesAsTransaction(document.doc_type) && fields.totalAmount && fields.totalAmount > 0) {
        const { data, error } = await supabase
          .from("transactions")
          .insert({
            user_id: user!.id,
            kind: "expense",
            category: fields.category || "Other",
            merchant: fields.vendor,
            amount: fields.totalAmount,
            currency: fields.currency,
            occurred_on: fields.documentDate ?? new Date().toISOString().slice(0, 10),
            payment_method: fields.paymentMethod,
            note: fields.note,
          })
          .select("id")
          .single();
        if (error) throw error;
        transactionId = (data as { id: string }).id;
      }

      const { error } = await supabase
        .from("financial_documents")
        .update({
          status: "saved",
          extracted: fields,
          saved_transaction_id: transactionId,
          error_message: null,
        })
        .eq("id", document.id);
      if (error) throw error;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["documents"] }),
        queryClient.invalidateQueries({ queryKey: ["transactions"] }),
      ]);
    },
  });
}
