-- 1. Arabic is the default language for new Wazen users
ALTER TABLE public.profiles ALTER COLUMN language SET DEFAULT 'ar';
UPDATE public.profiles SET language = 'ar' WHERE language IS NULL OR language = '';

-- 2. Family seats can be individually switched off (data-driven, no rule in code)
ALTER TABLE public.family_members
  ADD COLUMN IF NOT EXISTS seat_suspended boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION private.is_family_seat_entitled(_user uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH me AS (
    SELECT fm.* FROM public.family_members fm WHERE fm.user_id = _user
  ), sub AS (
    SELECT s.* FROM public.subscriptions s
    JOIN me ON me.family_id = s.family_id
    WHERE s.subscription_type = 'family'
  )
  SELECT COALESCE((
    SELECT CASE
      WHEN me.seat_suspended THEN false
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
$function$;

-- 3. Demo-only subscription configuration (per account, editable at any time)
WITH demo AS (
  SELECT u.id, split_part(u.email, '@', 1) AS handle
  FROM auth.users u
  WHERE u.email LIKE '%@wazen.app'
)
UPDATE public.subscriptions s
SET plan = 'premium',
    status = 'active',
    started_at = COALESCE(s.started_at, now() - interval '22 months'),
    current_period_start = date_trunc('month', now()),
    current_period_end = date_trunc('month', now()) + interval '1 month',
    renewal_at = date_trunc('month', now()) + interval '1 month',
    cancel_at_period_end = false,
    cancelled_at = NULL,
    updated_at = now()
FROM demo
WHERE demo.id = s.user_id
  AND demo.handle IN ('mariam', 'dana', 'hessa', 'deema');

WITH demo AS (
  SELECT u.id, split_part(u.email, '@', 1) AS handle
  FROM auth.users u
  WHERE u.email LIKE '%@wazen.app'
)
UPDATE public.subscriptions s
SET plan = 'free',
    status = 'inactive',
    current_period_start = NULL,
    current_period_end = NULL,
    renewal_at = NULL,
    cancel_at_period_end = false,
    cancelled_at = NULL,
    updated_at = now()
FROM demo
WHERE demo.id = s.user_id
  AND demo.handle IN ('yousef', 'yaqoub', 'saad', 'khaled', 'abdulrahman', 'fahad');

-- Layan and Reem stay covered by the family subscription seat;
-- Yousef, Abdulrahman and Fahad have their family seats switched off for the demo.
WITH demo AS (
  SELECT u.id, split_part(u.email, '@', 1) AS handle
  FROM auth.users u
  WHERE u.email LIKE '%@wazen.app'
)
UPDATE public.family_members fm
SET seat_suspended = (demo.handle IN ('yousef', 'abdulrahman', 'fahad'))
FROM demo
WHERE demo.id = fm.user_id;