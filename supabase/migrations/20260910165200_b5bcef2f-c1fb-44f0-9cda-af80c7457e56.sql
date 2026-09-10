REVOKE ALL ON FUNCTION public.create_default_subscription() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_default_subscription() FROM anon;
REVOKE ALL ON FUNCTION public.create_default_subscription() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.create_default_subscription() TO service_role;