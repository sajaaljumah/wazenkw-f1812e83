-- Allow re-registering an account if previously marked as deleted.
-- Safely purges an account from auth.users and public tables ONLY IF it has been explicitly marked deleted.

CREATE OR REPLACE FUNCTION public.purge_deleted_user_by_email(target_email text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  _clean_email text := lower(trim(target_email));
  _uid uuid;
BEGIN
  IF _clean_email IS NULL OR _clean_email = '' THEN
    RETURN false;
  END IF;

  -- Only target accounts that are explicitly marked deleted in user metadata
  SELECT id INTO _uid
  FROM auth.users
  WHERE lower(email) = _clean_email
    AND (
      (raw_user_meta_data->>'is_deleted')::boolean = true
      OR raw_user_meta_data->>'account_status' = 'deleted'
    );

  IF _uid IS NOT NULL THEN
    DELETE FROM public.profiles WHERE id = _uid;
    DELETE FROM public.transactions WHERE user_id = _uid;
    DELETE FROM public.budgets WHERE user_id = _uid;
    DELETE FROM public.goals WHERE user_id = _uid;
    DELETE FROM public.recurring_items WHERE user_id = _uid;
    DELETE FROM public.zakat_payments WHERE user_id = _uid;
    DELETE FROM public.zakat_calculations WHERE user_id = _uid;
    DELETE FROM public.assets WHERE user_id = _uid;
    DELETE FROM public.family_relationships WHERE child_user_id = _uid OR parent_user_id = _uid;
    DELETE FROM public.family_members WHERE user_id = _uid;
    DELETE FROM public.subscriptions WHERE user_id = _uid;
    DELETE FROM public.documents WHERE user_id = _uid;
    DELETE FROM auth.users WHERE id = _uid;
    RETURN true;
  END IF;

  RETURN false;
END;
$$;

GRANT EXECUTE ON FUNCTION public.purge_deleted_user_by_email(text) TO anon, authenticated;
