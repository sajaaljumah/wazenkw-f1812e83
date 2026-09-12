-- Migration to allow authenticated users to delete their own account from auth.users
-- and to clean up test account sajaahdi05@gmail.com

-- 1. Delete test child account sajaahdi05@gmail.com
DELETE FROM auth.users WHERE lower(email) = 'sajaahdi05@gmail.com';

-- 2. Function allowing users to delete their own account
CREATE OR REPLACE FUNCTION public.delete_current_user()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  _uid UUID := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Delete from auth.users (cascades to all foreign key tables)
  DELETE FROM auth.users WHERE id = _uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_current_user() TO authenticated;
