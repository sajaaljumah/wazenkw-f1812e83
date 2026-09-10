CREATE OR REPLACE FUNCTION public.is_guardian_of(_parent UUID, _child UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.family_relationships
    WHERE parent_user_id = _parent AND child_user_id = _child AND status = 'active'
  )
$$;
REVOKE ALL ON FUNCTION public.is_guardian_of(UUID, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_guardian_of(UUID, UUID) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.calculate_age(DATE) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.calculate_age(DATE) TO authenticated, service_role;