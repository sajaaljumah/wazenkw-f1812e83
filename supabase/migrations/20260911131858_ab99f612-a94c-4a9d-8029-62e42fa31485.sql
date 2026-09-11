ALTER TABLE public.recurring_items
  ADD COLUMN IF NOT EXISTS frequency text NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS merchant text,
  ADD COLUMN IF NOT EXISTS start_date date NOT NULL DEFAULT date_trunc('month', now())::date,
  ADD COLUMN IF NOT EXISTS ends_on date,
  ADD COLUMN IF NOT EXISTS note text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'recurring_items_frequency_check') THEN
    ALTER TABLE public.recurring_items
      ADD CONSTRAINT recurring_items_frequency_check
      CHECK (frequency IN ('weekly','monthly','quarterly','yearly'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.financial_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  doc_type text NOT NULL DEFAULT 'receipt',
  title text,
  file_path text,
  file_name text,
  mime_type text,
  file_size integer,
  status text NOT NULL DEFAULT 'uploaded',
  extraction_source text NOT NULL DEFAULT 'manual',
  extracted jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  saved_transaction_id uuid REFERENCES public.transactions ON DELETE SET NULL,
  saved_asset_id uuid REFERENCES public.assets ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT financial_documents_doc_type_check CHECK (doc_type IN ('receipt','gold_invoice','silver_invoice','stock_purchase','property_contract','rental_contract','other')),
  CONSTRAINT financial_documents_status_check CHECK (status IN ('uploaded','awaiting_extraction','review','saved','failed'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.financial_documents TO authenticated;
GRANT ALL ON public.financial_documents TO service_role;
ALTER TABLE public.financial_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own documents" ON public.financial_documents;
CREATE POLICY "Users manage their own documents" ON public.financial_documents
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS financial_documents_user_created_idx
  ON public.financial_documents (user_id, created_at DESC);

DROP TRIGGER IF EXISTS financial_documents_touch_updated_at ON public.financial_documents;
CREATE TRIGGER financial_documents_touch_updated_at
  BEFORE UPDATE ON public.financial_documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Private document files: each user only reaches their own folder
DROP POLICY IF EXISTS "Users read their own financial documents" ON storage.objects;
CREATE POLICY "Users read their own financial documents" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'financial-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users upload their own financial documents" ON storage.objects;
CREATE POLICY "Users upload their own financial documents" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'financial-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users delete their own financial documents" ON storage.objects;
CREATE POLICY "Users delete their own financial documents" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'financial-documents' AND (storage.foldername(name))[1] = auth.uid()::text);