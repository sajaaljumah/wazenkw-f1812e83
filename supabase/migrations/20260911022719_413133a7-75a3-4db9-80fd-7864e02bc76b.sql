create or replace function public.can_fund_child(_child_user_id uuid)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select exists (
    select 1 from public.family_relationships fr
    where fr.parent_user_id = auth.uid()
      and fr.child_user_id = _child_user_id
      and fr.status = 'active'
      and coalesce((fr.permissions->>'can_fund')::boolean, false)
  )
$$;

revoke all on function public.wazen_validate_transaction_beneficiary() from public;
revoke all on function public.wazen_validate_transaction_beneficiary() from anon;
revoke all on function public.wazen_validate_transaction_beneficiary() from authenticated;
revoke all on function public.wazen_assets_adults_only() from public;
revoke all on function public.wazen_assets_adults_only() from anon;
revoke all on function public.wazen_assets_adults_only() from authenticated;
