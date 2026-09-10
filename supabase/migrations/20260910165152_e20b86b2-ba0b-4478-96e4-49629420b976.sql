CREATE TYPE public.subscription_plan AS ENUM ('free', 'premium');
CREATE TYPE public.subscription_status AS ENUM ('active', 'inactive', 'cancelled', 'past_due', 'trialing');

CREATE TABLE public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan public.subscription_plan NOT NULL DEFAULT 'free',
  status public.subscription_status NOT NULL DEFAULT 'inactive',
  stripe_customer_id text,
  stripe_subscription_id text UNIQUE,
  stripe_price_id text,
  started_at timestamptz,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  cancelled_at timestamptz,
  trial_ends_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX subscriptions_stripe_customer_idx ON public.subscriptions (stripe_customer_id);

GRANT SELECT ON public.subscriptions TO authenticated;
GRANT ALL ON public.subscriptions TO service_role;

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscription"
  ON public.subscriptions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER subscriptions_set_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.wazen_touch_updated_at();

-- Every new profile starts on the free plan.
CREATE OR REPLACE FUNCTION public.create_default_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan, status, started_at)
  VALUES (NEW.id, 'free', 'active', now())
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_create_default_subscription
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.create_default_subscription();

-- Backfill existing accounts.
INSERT INTO public.subscriptions (user_id, plan, status, started_at)
SELECT p.id, 'free', 'active', now() FROM public.profiles p
ON CONFLICT (user_id) DO NOTHING;

-- Demo premium accounts.
UPDATE public.subscriptions s
SET plan = 'premium',
    status = 'active',
    started_at = now() - interval '2 months',
    current_period_start = date_trunc('day', now()),
    current_period_end = date_trunc('day', now()) + interval '1 month'
WHERE s.user_id IN (SELECT id FROM auth.users WHERE email IN ('hessa@wazen.app', 'mariam@wazen.app'));

-- Backend-side premium check, usable in future premium-table policies.
CREATE OR REPLACE FUNCTION public.has_premium_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = _user_id
      AND s.plan = 'premium'
      AND s.status IN ('active', 'trialing')
      AND (s.current_period_end IS NULL OR s.current_period_end > now())
  );
$$;

REVOKE ALL ON FUNCTION public.has_premium_access(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_premium_access(uuid) TO authenticated, service_role;