CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO service_role;

CREATE OR REPLACE FUNCTION private.family_id_of(_user uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT family_id FROM public.family_members WHERE user_id = _user LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION private.is_family_seat_entitled(_user uuid)
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

REVOKE ALL ON FUNCTION private.family_id_of(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.is_family_seat_entitled(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.family_id_of(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_family_seat_entitled(uuid) TO authenticated, service_role;
GRANT USAGE ON SCHEMA private TO authenticated;

-- repoint policies at the private helpers
DROP POLICY IF EXISTS "Members can read their family" ON public.families;
CREATE POLICY "Members can read their family" ON public.families
  FOR SELECT TO authenticated USING (id = private.family_id_of(auth.uid()));

DROP POLICY IF EXISTS "Members can read their family members" ON public.family_members;
CREATE POLICY "Members can read their family members" ON public.family_members
  FOR SELECT TO authenticated USING (family_id = private.family_id_of(auth.uid()));

DROP POLICY IF EXISTS "Family members can view the family subscription" ON public.subscriptions;
CREATE POLICY "Family members can view the family subscription" ON public.subscriptions
  FOR SELECT TO authenticated
  USING (family_id IS NOT NULL AND family_id = private.family_id_of(auth.uid()));

-- premium check runs as the caller; RLS already scopes what they can read
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
      AND s.status IN ('active','trialing')
      AND (s.current_period_end IS NULL OR s.current_period_end > now())
  ) OR private.is_family_seat_entitled(_user_id);
$$;

DROP FUNCTION IF EXISTS public.family_id_of(uuid);
DROP FUNCTION IF EXISTS public.is_family_seat_entitled(uuid);