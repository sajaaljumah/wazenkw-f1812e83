-- Parent → child management that works without the private server key.
-- Each function proves an active guardian link for auth.uid() and refuses demo accounts.

create or replace function public.wazen_is_demo_email(_email text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select lower(coalesce(_email, '')) in (
    'mariam@wazen.app','yousef@wazen.app','layan@wazen.app','abdulrahman@wazen.app',
    'reem@wazen.app','fahad@wazen.app','dana@wazen.app','yaqoub@wazen.app',
    'hessa@wazen.app','saad@wazen.app','saja@wazen.app','khaled@wazen.app','deema@wazen.app'
  )
$$;

create or replace function public.wazen_managed_child_email(_child uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare _email text;
begin
  if auth.uid() is null or not public.is_guardian_of(auth.uid(), _child) then
    raise exception 'NOT_LINKED';
  end if;
  select email into _email from auth.users where id = _child;
  return _email;
end; $$;

create or replace function public.wazen_assert_child_editable(_child uuid)
returns void
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_guardian_of(auth.uid(), _child) then
    raise exception 'NOT_LINKED';
  end if;
  if public.wazen_is_demo_email((select email from auth.users where id = auth.uid()))
     or public.wazen_is_demo_email((select email from auth.users where id = _child)) then
    raise exception 'DEMO_LOCKED';
  end if;
end; $$;

create or replace function public.wazen_update_managed_child(_child uuid, _full_name text, _language text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.wazen_assert_child_editable(_child);
  if length(trim(coalesce(_full_name, ''))) < 2 or length(trim(_full_name)) > 80 then
    raise exception 'Invalid name';
  end if;
  if _language not in ('ar', 'en') then raise exception 'Invalid language'; end if;
  update public.profiles set full_name = trim(_full_name), language = _language where id = _child;
end; $$;

create or replace function public.wazen_add_managed_child_transaction(
  _child uuid, _kind text, _category text, _merchant text, _note text, _amount numeric, _occurred_on date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare _id uuid; _currency text;
begin
  perform public.wazen_assert_child_editable(_child);
  if _kind not in ('expense', 'income') then raise exception 'Invalid kind'; end if;
  if _amount is null or _amount <= 0 or _amount > 100000 then raise exception 'Invalid amount'; end if;
  if length(trim(coalesce(_category, ''))) < 2 or length(_category) > 60 then raise exception 'Invalid category'; end if;
  select base_currency into _currency from public.profiles where id = _child;
  insert into public.transactions (user_id, kind, category, merchant, note, amount, currency, occurred_on, paid_by_parent, deducted_from_child)
  values (_child, _kind, trim(_category), nullif(trim(left(coalesce(_merchant, ''), 80)), ''),
          nullif(trim(left(coalesce(_note, ''), 200)), ''), _amount, coalesce(_currency, 'KWD'), _occurred_on, false, false)
  returning id into _id;
  return _id;
end; $$;

create or replace function public.wazen_delete_managed_child_transaction(_child uuid, _transaction uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.wazen_assert_child_editable(_child);
  delete from public.transactions where id = _transaction and user_id = _child;
end; $$;

revoke all on function public.wazen_managed_child_email(uuid) from public, anon;
revoke all on function public.wazen_assert_child_editable(uuid) from public, anon;
revoke all on function public.wazen_update_managed_child(uuid, text, text) from public, anon;
revoke all on function public.wazen_add_managed_child_transaction(uuid, text, text, text, text, numeric, date) from public, anon;
revoke all on function public.wazen_delete_managed_child_transaction(uuid, uuid) from public, anon;

grant execute on function public.wazen_is_demo_email(text) to authenticated, service_role;
grant execute on function public.wazen_managed_child_email(uuid) to authenticated, service_role;
grant execute on function public.wazen_assert_child_editable(uuid) to authenticated, service_role;
grant execute on function public.wazen_update_managed_child(uuid, text, text) to authenticated, service_role;
grant execute on function public.wazen_add_managed_child_transaction(uuid, text, text, text, text, numeric, date) to authenticated, service_role;
grant execute on function public.wazen_delete_managed_child_transaction(uuid, uuid) to authenticated, service_role;