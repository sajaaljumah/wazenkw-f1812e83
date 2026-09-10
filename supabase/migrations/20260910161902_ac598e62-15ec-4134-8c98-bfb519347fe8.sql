CREATE OR REPLACE FUNCTION public.can_monitor_child(_child UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.family_relationships fr
    WHERE fr.child_user_id = _child
      AND fr.parent_user_id = auth.uid()
      AND fr.status = 'active'
      AND (
        COALESCE((fr.permissions->>'can_monitor')::boolean, false)
        OR COALESCE((fr.permissions->>'can_fund')::boolean, false)
      )
  )
$$;

REVOKE ALL ON FUNCTION public.can_monitor_child(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_monitor_child(UUID) TO authenticated, service_role;