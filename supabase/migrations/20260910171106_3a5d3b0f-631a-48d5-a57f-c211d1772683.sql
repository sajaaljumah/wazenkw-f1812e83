-- 1. Enums
DO $$ BEGIN
  CREATE TYPE public.subscription_type AS ENUM ('individual','family');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.billing_period AS ENUM ('monthly','yearly');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 2. Families (no names by design)
CREATE TABLE IF NOT EXISTS public.families (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.families TO authenticated;
GRANT ALL ON public.families TO service_role;
ALTER TABLE public.families ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  family_id uuid NOT NULL REFERENCES public.families(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  member_role text NOT NULL CHECK (member_role IN ('parent','child')),
  seat_kind text NOT NULL DEFAULT 'included' CHECK (seat_kind IN ('included','additional')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS family_members_family_idx ON public.family_members(family_id);

GRANT SELECT ON public.family_members TO authenticated;
GRANT ALL ON public.family_members TO service_role;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

-- 3. Configurable pricing
CREATE TABLE IF NOT EXISTS public.subscription_prices (
  key text PRIMARY KEY,
  subscription_type public.subscription_type NOT NULL,
  billing_period public.billing_period NOT NULL,
  amount numeric NOT NULL,
  additional_child_amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'KWD',
  included_parent_count integer NOT NULL DEFAULT 1,
  included_child_count integer NOT NULL DEFAULT 0,
  stripe_price_id text,
  stripe_additional_child_price_id text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.subscription_prices TO authenticated;
GRANT SELECT ON public.subscription_prices TO anon;
GRANT ALL ON public.subscription_prices TO service_role;
ALTER TABLE public.subscription_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can read active prices" ON public.subscription_prices;
CREATE POLICY "Anyone can read active prices" ON public.subscription_prices
  FOR SELECT TO anon, authenticated USING (active);

INSERT INTO public.subscription_prices
  (key, subscription_type, billing_period, amount, additional_child_amount, included_parent_count, included_child_count)
VALUES
  ('individual_monthly','individual','monthly',2.500,0,1,0),
  ('individual_yearly','individual','yearly',25.000,0,1,0),
  ('family_monthly','family','monthly',5.000,1.000,2,4),
  ('family_yearly','family','yearly',50.000,10.000,2,4)
ON CONFLICT (key) DO NOTHING;

-- 4. Subscription columns
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS subscription_type public.subscription_type NOT NULL DEFAULT 'individual',
  ADD COLUMN IF NOT EXISTS family_id uuid REFERENCES public.families(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS billing_period public.billing_period NOT NULL DEFAULT 'monthly',
  ADD COLUMN IF NOT EXISTS price_key text REFERENCES public.subscription_prices(key),
  ADD COLUMN IF NOT EXISTS included_parent_count integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS included_child_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS additional_child_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS renewal_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_family_unique
  ON public.subscriptions(family_id) WHERE family_id IS NOT NULL;

-- keep renewal date aligned with the billing period end
CREATE OR REPLACE FUNCTION public.wazen_sync_subscription_shape()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.renewal_at := COALESCE(NEW.current_period_end, NEW.renewal_at);
  IF NEW.subscription_type = 'individual' THEN
    NEW.family_id := NULL;
    NEW.included_parent_count := 1;
    NEW.included_child_count := 0;
    NEW.additional_child_count := 0;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wazen_sync_subscription_shape ON public.subscriptions;
CREATE TRIGGER wazen_sync_subscription_shape
  BEFORE INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.wazen_sync_subscription_shape();

-- 5. Helpers
CREATE OR REPLACE FUNCTION public.family_id_of(_user uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT family_id FROM public.family_members WHERE user_id = _user LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.family_id_of(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.family_id_of(uuid) TO authenticated, service_role;

-- is a member's seat covered by the family subscription?
CREATE OR REPLACE FUNCTION public.is_family_seat_entitled(_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT fm.* FROM public.family_members fm WHERE fm.user_id = _user
  ), sub AS (
    SELECT s.* FROM public.subscriptions s
    JOIN me ON me.family_id = s.family_id
    WHERE s.subscription_type = 'family'
  )
  SELECT COALESCE((
    SELECT CASE
      WHEN sub.plan <> 'premium' THEN false
      WHEN sub.status NOT IN ('active','trialing') THEN false
      WHEN sub.current_period_end IS NOT NULL AND sub.current_period_end <= now() THEN false
      WHEN me.member_role = 'parent' THEN
        (SELECT count(*) FROM public.family_members f2
          WHERE f2.family_id = me.family_id AND f2.member_role = 'parent'
            AND f2.created_at <= me.created_at) <= sub.included_parent_count
      WHEN me.seat_kind = 'included' THEN true
      ELSE
        (SELECT count(*) FROM public.family_members f3
          WHERE f3.family_id = me.family_id AND f3.member_role = 'child'
            AND f3.seat_kind = 'additional' AND f3.created_at <= me.created_at) <= sub.additional_child_count
    END
    FROM me, sub
  ), false);
$$;

REVOKE ALL ON FUNCTION public.is_family_seat_entitled(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_family_seat_entitled(uuid) TO authenticated, service_role;

-- premium access now also flows from a family subscription
CREATE OR REPLACE FUNCTION public.has_premium_access(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = _user_id
      AND s.plan = 'premium'
      AND s.status IN ('active','trialing')
      AND (s.current_period_end IS NULL OR s.current_period_end > now())
  ) OR public.is_family_seat_entitled(_user_id);
$$;

-- automatic seat assignment: included until the base allowance is used up
CREATE OR REPLACE FUNCTION public.wazen_assign_family_seat()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  allowance integer;
  used integer;
BEGIN
  IF NEW.member_role = 'child' THEN
    SELECT COALESCE(NULLIF(s.included_child_count, 0), 4) INTO allowance
    FROM public.subscriptions s WHERE s.family_id = NEW.family_id;
    allowance := COALESCE(allowance, 4);
    SELECT count(*) INTO used FROM public.family_members fm
      WHERE fm.family_id = NEW.family_id AND fm.member_role = 'child'
        AND fm.id <> NEW.id AND fm.seat_kind = 'included';
    NEW.seat_kind := CASE WHEN used < allowance THEN 'included' ELSE 'additional' END;
  ELSE
    NEW.seat_kind := 'included';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wazen_assign_family_seat ON public.family_members;
CREATE TRIGGER wazen_assign_family_seat
  BEFORE INSERT ON public.family_members
  FOR EACH ROW EXECUTE FUNCTION public.wazen_assign_family_seat();

-- keep additional_child_count on the family subscription in sync
CREATE OR REPLACE FUNCTION public.wazen_recount_additional_children()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  fam uuid := COALESCE(NEW.family_id, OLD.family_id);
BEGIN
  UPDATE public.subscriptions s
  SET additional_child_count = (
        SELECT count(*) FROM public.family_members fm
        WHERE fm.family_id = fam AND fm.member_role = 'child' AND fm.seat_kind = 'additional'
      ),
      updated_at = now()
  WHERE s.family_id = fam;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS wazen_recount_additional_children ON public.family_members;
CREATE TRIGGER wazen_recount_additional_children
  AFTER INSERT OR UPDATE OR DELETE ON public.family_members
  FOR EACH ROW EXECUTE FUNCTION public.wazen_recount_additional_children();

DROP TRIGGER IF EXISTS wazen_touch_family_members ON public.family_members;
CREATE TRIGGER wazen_touch_family_members
  BEFORE UPDATE ON public.family_members
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS wazen_touch_families ON public.families;
CREATE TRIGGER wazen_touch_families
  BEFORE UPDATE ON public.families
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS wazen_touch_prices ON public.subscription_prices;
CREATE TRIGGER wazen_touch_prices
  BEFORE UPDATE ON public.subscription_prices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 6. Policies
DROP POLICY IF EXISTS "Members can read their family" ON public.families;
CREATE POLICY "Members can read their family" ON public.families
  FOR SELECT TO authenticated USING (id = public.family_id_of(auth.uid()));

DROP POLICY IF EXISTS "Members can read their family members" ON public.family_members;
CREATE POLICY "Members can read their family members" ON public.family_members
  FOR SELECT TO authenticated USING (family_id = public.family_id_of(auth.uid()));

DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscriptions;
CREATE POLICY "Users can view their own subscription" ON public.subscriptions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Family members can view the family subscription" ON public.subscriptions;
CREATE POLICY "Family members can view the family subscription" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (family_id IS NOT NULL AND family_id = public.family_id_of(auth.uid()));

-- 7. Seed the existing demo family (parents + their four linked children)
DO $$
DECLARE
  fam uuid;
  parent_a uuid := '24ef9684-9969-49d5-a367-265e93e7f1d8'; -- Yousef
  parent_b uuid := 'b6c5b289-b6ef-443b-9984-dda0a4b8b6e0'; -- Mariam
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.family_members) THEN
    INSERT INTO public.families DEFAULT VALUES RETURNING id INTO fam;

    INSERT INTO public.family_members (family_id, user_id, member_role)
    VALUES (fam, parent_a, 'parent'), (fam, parent_b, 'parent');

    UPDATE public.subscriptions SET
      subscription_type = 'family',
      family_id = fam,
      plan = 'premium',
      status = 'active',
      billing_period = 'monthly',
      price_key = 'family_monthly',
      included_parent_count = 2,
      included_child_count = 4,
      started_at = COALESCE(started_at, now() - interval '1 month'),
      current_period_start = COALESCE(current_period_start, date_trunc('month', now())),
      current_period_end = COALESCE(current_period_end, date_trunc('month', now()) + interval '1 month')
    WHERE user_id = parent_b;

    INSERT INTO public.family_members (family_id, user_id, member_role)
    SELECT fam, p.id, 'child'
    FROM public.profiles p
    WHERE p.id IN (
      SELECT DISTINCT child_user_id FROM public.family_relationships
      WHERE parent_user_id IN (parent_a, parent_b) AND status = 'active'
    )
    ORDER BY p.created_at;
  END IF;
END $$;

UPDATE public.subscriptions
SET price_key = CASE WHEN plan = 'premium' THEN 'individual_monthly' ELSE NULL END
WHERE subscription_type = 'individual' AND price_key IS NULL;