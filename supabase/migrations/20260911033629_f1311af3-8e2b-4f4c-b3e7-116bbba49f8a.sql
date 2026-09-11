UPDATE public.profiles SET full_name = split_part(btrim(full_name), ' ', 1) WHERE full_name LIKE '% %';

ALTER TABLE public.assets
  ADD COLUMN IF NOT EXISTS holding_purpose text,
  ADD COLUMN IF NOT EXISTS zakat_treatment text;

CREATE TABLE IF NOT EXISTS public.metal_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metal text NOT NULL CHECK (metal IN ('gold_24k','silver')),
  price_per_gram numeric NOT NULL CHECK (price_per_gram > 0),
  currency text NOT NULL DEFAULT 'KWD',
  as_of date NOT NULL DEFAULT CURRENT_DATE,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (metal, as_of, currency)
);
GRANT SELECT ON public.metal_rates TO authenticated;
GRANT ALL ON public.metal_rates TO service_role;
ALTER TABLE public.metal_rates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "metal rates readable by signed-in users" ON public.metal_rates;
CREATE POLICY "metal rates readable by signed-in users" ON public.metal_rates FOR SELECT TO authenticated USING (true);

CREATE TABLE IF NOT EXISTS public.zakat_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  zakat_start_date date,
  zakat_due_date date,
  hijri_start_date text,
  hijri_due_date text,
  nisab_method text NOT NULL DEFAULT 'gold' CHECK (nisab_method IN ('gold','silver')),
  gold_nisab_grams numeric NOT NULL DEFAULT 85,
  silver_nisab_grams numeric NOT NULL DEFAULT 595,
  current_nisab_kwd numeric,
  hawl_status text NOT NULL DEFAULT 'not_started' CHECK (hawl_status IN ('not_started','in_progress','completed')),
  status text NOT NULL DEFAULT 'below_nisab' CHECK (status IN ('below_nisab','hawl_in_progress','due','recorded')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.zakat_profiles TO authenticated;
GRANT ALL ON public.zakat_profiles TO service_role;
ALTER TABLE public.zakat_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own zakat profile" ON public.zakat_profiles;
CREATE POLICY "own zakat profile" ON public.zakat_profiles FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP TRIGGER IF EXISTS zakat_profiles_updated_at ON public.zakat_profiles;
CREATE TRIGGER zakat_profiles_updated_at BEFORE UPDATE ON public.zakat_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.zakat_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  calculation_date date NOT NULL DEFAULT CURRENT_DATE,
  nisab_value_kwd numeric NOT NULL DEFAULT 0,
  eligible_assets_total_kwd numeric NOT NULL DEFAULT 0,
  deductions_kwd numeric NOT NULL DEFAULT 0,
  zakatable_amount_kwd numeric NOT NULL DEFAULT 0,
  zakat_rate numeric NOT NULL DEFAULT 0.025,
  zakat_due_kwd numeric NOT NULL DEFAULT 0,
  hawl_status text NOT NULL DEFAULT 'in_progress',
  methodology_reference text NOT NULL DEFAULT 'Kuwait Zakat House — https://www.zakathouse.org.kw/calculate.aspx',
  breakdown jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.zakat_calculations TO authenticated;
GRANT ALL ON public.zakat_calculations TO service_role;
ALTER TABLE public.zakat_calculations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own zakat calculations read" ON public.zakat_calculations;
CREATE POLICY "own zakat calculations read" ON public.zakat_calculations FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "own zakat calculations insert" ON public.zakat_calculations;
CREATE POLICY "own zakat calculations insert" ON public.zakat_calculations FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS zakat_calculations_user_date_idx ON public.zakat_calculations (user_id, calculation_date DESC);

CREATE TABLE IF NOT EXISTS public.zakat_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  calculation_id uuid REFERENCES public.zakat_calculations(id) ON DELETE CASCADE,
  asset_type text NOT NULL,
  asset_id uuid,
  eligible boolean NOT NULL DEFAULT true,
  eligibility_reason text,
  value_kwd numeric NOT NULL DEFAULT 0,
  calculation_method text,
  calculation_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.zakat_assets TO authenticated;
GRANT ALL ON public.zakat_assets TO service_role;
ALTER TABLE public.zakat_assets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own zakat assets read" ON public.zakat_assets;
CREATE POLICY "own zakat assets read" ON public.zakat_assets FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "own zakat assets insert" ON public.zakat_assets;
CREATE POLICY "own zakat assets insert" ON public.zakat_assets FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.zakat_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  calculation_id uuid REFERENCES public.zakat_calculations(id) ON DELETE SET NULL,
  amount_kwd numeric NOT NULL CHECK (amount_kwd > 0),
  currency text NOT NULL DEFAULT 'KWD',
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  payment_type text NOT NULL DEFAULT 'zakat' CHECK (payment_type = 'zakat'),
  recipient text,
  status text NOT NULL DEFAULT 'paid' CHECK (status IN ('paid','pending')),
  notes text,
  transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.zakat_payments TO authenticated;
GRANT ALL ON public.zakat_payments TO service_role;
ALTER TABLE public.zakat_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own zakat payments read" ON public.zakat_payments;
CREATE POLICY "own zakat payments read" ON public.zakat_payments FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "own zakat payments insert" ON public.zakat_payments;
CREATE POLICY "own zakat payments insert" ON public.zakat_payments FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE INDEX IF NOT EXISTS zakat_payments_user_idx ON public.zakat_payments (user_id, payment_date DESC);

INSERT INTO public.metal_rates (metal, price_per_gram, currency, as_of, source)
VALUES ('gold_24k', 30.500, 'KWD', CURRENT_DATE, 'manual'),
       ('silver', 0.360, 'KWD', CURRENT_DATE, 'manual')
ON CONFLICT (metal, as_of, currency) DO NOTHING;