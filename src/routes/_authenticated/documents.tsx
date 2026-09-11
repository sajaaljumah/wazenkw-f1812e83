import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/wazen/AppShell";
import { DisclosurePanel, EmptyState, Panel } from "@/components/wazen/dashboard/primitives";
import { Button } from "@/components/ui/button";
import {
  AlertIcon,
  CameraIcon,
  CheckIcon,
  DeleteIcon,
  DocumentIcon,
  ICON_STROKE,
  RetryIcon,
  SpinnerIcon,
  UploadIcon,
} from "@/components/wazen/icons";
import { useWazenLocale } from "@/components/wazen/WazenLocale";
import { useProfile } from "@/hooks/use-wazen-auth";
import {
  useDeleteDocument,
  useDocuments,
  useRequestExtraction,
  useSaveDocumentRecord,
  useUpdateDocument,
  useUploadDocument,
} from "@/hooks/use-wazen-documents";
import { ExtractedFieldsForm } from "@/components/wazen/documents/ExtractedFieldsForm";
import {
  DOCUMENT_KINDS,
  emptyExtraction,
  extractionProvider,
  mergeExtraction,
  sampleExtraction,
  savesAsTransaction,
} from "@/lib/documents";
import type { DocumentKind, ExtractedFields, FinancialDocument } from "@/lib/documents";
import { DEFAULT_CURRENCY } from "@/lib/currency";
import { formatDate } from "@/lib/finance";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/documents")({
  head: () => ({
    meta: [
      { title: "Financial documents — Wazen" },
      {
        name: "description",
        content: "Upload invoices, gold and silver purchases, investment confirmations and property contracts, then review and save their details.",
      },
      { property: "og:title", content: "Financial documents — Wazen" },
      {
        property: "og:description",
        content: "Upload invoices, gold and silver purchases, investment confirmations and property contracts, then review and save their details.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DocumentsPage,
});

const KIND_KEY: Record<DocumentKind, string> = {
  receipt: "docReceipt",
  gold_invoice: "docGold",
  silver_invoice: "docSilver",
  stock_purchase: "docStock",
  property_contract: "docProperty",
  rental_contract: "docRental",
  other: "docOther",
};

const STATUS_KEY = {
  uploaded: "docStatusUploaded",
  awaiting_extraction: "docStatusAwaiting",
  review: "docStatusReview",
  saved: "docStatusSaved",
  failed: "docStatusFailed",
} as const;

type Step = "choose" | "preview" | "processing" | "review" | "saved" | "error";

function DocumentsPage() {
  const { t } = useWazenLocale();
  const { data: profile } = useProfile();
  const currency = profile?.base_currency || DEFAULT_CURRENCY;

  const documents = useDocuments();
  const upload = useUploadDocument();
  const update = useUpdateDocument();
  const remove = useDeleteDocument();
  const requestExtraction = useRequestExtraction();
  const saveRecord = useSaveDocumentRecord();

  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  const [kind, setKind] = useState<DocumentKind>("receipt");
  const [step, setStep] = useState<Step>("choose");
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [document, setDocument] = useState<FinancialDocument | null>(null);
  const [fields, setFields] = useState<ExtractedFields>(emptyExtraction(currency));
  const [notice, setNotice] = useState<string | null>(null);
  const [sampleShown, setSampleShown] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const reset = () => {
    if (localPreview) URL.revokeObjectURL(localPreview);
    setLocalPreview(null);
    setFileName(null);
    setDocument(null);
    setFields(emptyExtraction(currency));
    setNotice(null);
    setSampleShown(false);
    setErrorText(null);
    setStep("choose");
  };

  const onPick = async (file: File | undefined) => {
    if (!file) return;
    if (localPreview) URL.revokeObjectURL(localPreview);
    setLocalPreview(file.type.startsWith("image/") ? URL.createObjectURL(file) : null);
    setFileName(file.name);
    setStep("preview");
    try {
      const created = await upload.mutateAsync({ file, kind, title: file.name });
      setDocument(created);
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "upload failed");
      setStep("error");
    }
  };

  const runExtraction = async () => {
    if (!document) return;
    setStep("processing");
    try {
      const outcome = await requestExtraction.mutateAsync(document);
      if (outcome.status === "extracted") {
        setFields(mergeExtraction(emptyExtraction(currency), outcome.fields));
        await update.mutateAsync({ id: document.id, status: "review", extractionSource: extractionProvider().name });
        setNotice(null);
      } else {
        setNotice(t("aiNotConnectedBody"));
        await update.mutateAsync({ id: document.id, status: "review", errorMessage: null });
        setFields(emptyExtraction(currency));
      }
      setStep("review");
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "extraction failed");
      setStep("error");
    }
  };

  const save = async () => {
    if (!document) return;
    try {
      await saveRecord.mutateAsync({ document, fields });
      setStep("saved");
    } catch (error) {
      setErrorText(error instanceof Error ? error.message : "save failed");
      setStep("error");
    }
  };

  return (
    <AppShell>
      <div className="space-y-8 wazen-enter">
        <header className="wazen-card">
          <p className="wazen-label">{t("documentsNav")}</p>
          <h1 className="mt-3 text-3xl sm:text-4xl">{t("documentsTitle")}</h1>
          <p className="mt-3 max-w-xl text-muted-foreground">{t("documentsSubtitle")}</p>
        </header>

        <Panel title={t("chooseDocType")}>
          {step === "choose" ? (
            <div className="space-y-6">
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {DOCUMENT_KINDS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setKind(option)}
                    className={cn(
                      "wazen-interactive rounded-2xl border px-4 py-3 text-start text-sm",
                      kind === option
                        ? "border-primary/60 bg-secondary"
                        : "border-border/70 hover:bg-secondary/60",
                    )}
                  >
                    {t(KIND_KEY[option] as never)}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => fileInput.current?.click()}>
                  <UploadIcon className="size-4" strokeWidth={ICON_STROKE} />
                  {t("uploadFile")}
                </Button>
                <Button variant="secondary" onClick={() => cameraInput.current?.click()}>
                  <CameraIcon className="size-4" strokeWidth={ICON_STROKE} />
                  {t("takePhoto")}
                </Button>
              </div>
              <input
                ref={fileInput}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(event) => onPick(event.target.files?.[0])}
              />
              <input
                ref={cameraInput}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(event) => onPick(event.target.files?.[0])}
              />
            </div>
          ) : step === "preview" ? (
            <div className="space-y-5">
              <h3 className="text-lg">{t("previewTitle")}</h3>
              <DocumentPreview src={localPreview} name={fileName} />
              <div className="flex flex-wrap gap-2">
                <Button onClick={runExtraction} disabled={!document || upload.isPending}>
                  {upload.isPending ? <SpinnerIcon className="size-4 animate-spin" /> : null}
                  {t("continueLabel")}
                </Button>
                <Button variant="ghost" onClick={reset}>
                  {t("uploadAnother")}
                </Button>
              </div>
            </div>
          ) : step === "processing" ? (
            <div className="flex min-h-40 flex-col items-center justify-center gap-3 text-center">
              <SpinnerIcon className="size-6 animate-spin text-muted-foreground" />
              <p className="text-sm text-muted-foreground">{t("processingTitle")}</p>
            </div>
          ) : step === "review" ? (
            <div className="space-y-6">
              {notice ? (
                <div className="rounded-2xl border border-border/70 bg-secondary/60 p-4">
                  <p className="flex items-center gap-2 text-sm font-semibold">
                    <AlertIcon className="size-4" strokeWidth={ICON_STROKE} />
                    {t("aiNotConnectedTitle")}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">{notice}</p>
                  {!sampleShown ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-3"
                      onClick={() => {
                        setFields(sampleExtraction(kind, currency));
                        setSampleShown(true);
                      }}
                    >
                      {t("previewSample")}
                    </Button>
                  ) : (
                    <p className="mt-3 text-xs text-muted-foreground">{t("sampleNotice")}</p>
                  )}
                </div>
              ) : null}
              <div>
                <h3 className="text-lg">{t("reviewTitle")}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t("reviewSubtitle")}</p>
              </div>
              <DocumentPreview src={localPreview} name={fileName} compact />
              <ExtractedFieldsForm kind={kind} fields={fields} onChange={setFields} />
              {savesAsTransaction(kind) ? (
                <p className="text-xs text-muted-foreground">{t("createsExpenseNote")}</p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <Button onClick={save} disabled={saveRecord.isPending}>
                  {saveRecord.isPending ? <SpinnerIcon className="size-4 animate-spin" /> : null}
                  {t("saveRecord")}
                </Button>
                <Button variant="ghost" onClick={() => setStep("preview")}>
                  {t("backLabel")}
                </Button>
              </div>
            </div>
          ) : step === "saved" ? (
            <div className="space-y-4 text-center">
              <CheckIcon className="mx-auto size-6 text-chart-2" strokeWidth={ICON_STROKE} />
              <p className="text-lg">{t("savedTitle")}</p>
              <p className="text-sm text-muted-foreground">{t("savedBody")}</p>
              <Button
                onClick={() => {
                  reset();
                  toast.success(t("savedTitle"));
                }}
              >
                {t("uploadAnother")}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <AlertIcon className="size-4" strokeWidth={ICON_STROKE} />
                {t("errorTitle")}
              </p>
              {errorText ? <p className="text-sm text-muted-foreground">{errorText}</p> : null}
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setStep(document ? "preview" : "choose")}>
                  <RetryIcon className="size-4" strokeWidth={ICON_STROKE} />
                  {t("retryLabel")}
                </Button>
                <Button variant="ghost" onClick={reset}>
                  {t("uploadAnother")}
                </Button>
              </div>
            </div>
          )}
        </Panel>

        <DisclosurePanel title={t("myDocuments")} summary={t("documentHistorySummary")}>
          {documents.isLoading ? (
            <div className="flex min-h-24 items-center justify-center">
              <SpinnerIcon className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : (documents.data ?? []).length === 0 ? (
            <EmptyState
              icon={<DocumentIcon className="size-5" strokeWidth={ICON_STROKE} />}
              title={t("noDocuments")}
              description={t("noDocumentsDescription")}
            />
          ) : (
            <ul className="divide-y divide-border/70">
              {(documents.data ?? []).map((row) => (
                <li key={row.id} className="flex flex-wrap items-center gap-3 py-4 first:pt-0 last:pb-0">
                  <DocumentIcon className="size-4 shrink-0 text-muted-foreground" strokeWidth={ICON_STROKE} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{row.title || row.file_name || t("documentsNav")}</p>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {t(KIND_KEY[row.doc_type] as never)} · {t(STATUS_KEY[row.status])} · {formatDate(row.created_at)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t("deleteLabel")}
                    onClick={() => remove.mutate(row)}
                  >
                    <DeleteIcon className="size-4" strokeWidth={ICON_STROKE} />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </DisclosurePanel>
      </div>
    </AppShell>
  );
}

function DocumentPreview({
  src,
  name,
  compact,
}: {
  src: string | null;
  name: string | null;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center overflow-hidden rounded-2xl border border-border/70 bg-secondary/50",
        compact ? "max-h-40" : "max-h-72",
      )}
    >
      {src ? (
        <img src={src} alt={name ?? ""} className={cn("w-full object-contain", compact ? "max-h-40" : "max-h-72")} />
      ) : (
        <p className="px-6 py-10 text-sm text-muted-foreground">{name}</p>
      )}
    </div>
  );
}
