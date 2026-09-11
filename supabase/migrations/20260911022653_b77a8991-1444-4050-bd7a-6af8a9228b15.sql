-- ============ Part 1: parent-paid expenses ============
alter table public.transactions
  add column if not exists beneficiary_user_id uuid references auth.users(id) on delete set null,
  add column if not exists paid_by_parent boolean not null default false,
  add column if not exists deducted_from_child boolean not null default false,
  add column if not exists payment_method text,
  add column if not exists linked_transaction_id uuid references public.transactions(id) on delete set null;

create index if not exists transactions_beneficiary_idx on public.transactions (beneficiary_user_id);

create or replace function public.can_fund_child(_child_user_id uuid)
returns boolean
language sql
stable
security definer
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

revoke all on function public.can_fund_child(uuid) from public;
grant execute on function public.can_fund_child(uuid) to authenticated, service_role;

-- Fail-closed validation of the beneficiary link.
create or replace function public.wazen_validate_transaction_beneficiary()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.beneficiary_user_id is null then
    if new.paid_by_parent then
      raise exception 'A parent-paid expense must name the family member it was for';
    end if;
    new.deducted_from_child := false;
    return new;
  end if;

  if new.beneficiary_user_id = new.user_id then
    return new;
  end if;

  if not public.is_guardian_of(new.user_id, new.beneficiary_user_id) then
    raise exception 'You can only record spending for a family member linked to you';
  end if;

  return new;
end;
$$;

drop trigger if exists wazen_validate_transaction_beneficiary on public.transactions;
create trigger wazen_validate_transaction_beneficiary
before insert or update on public.transactions
for each row execute function public.wazen_validate_transaction_beneficiary();

drop policy if exists "Beneficiaries view spending recorded for them" on public.transactions;
create policy "Beneficiaries view spending recorded for them"
on public.transactions for select to authenticated
using (beneficiary_user_id = auth.uid());

drop policy if exists "Funding guardians record child deductions" on public.transactions;
create policy "Funding guardians record child deductions"
on public.transactions for insert to authenticated
with check (
  public.can_fund_child(user_id)
  and paid_by_parent = true
  and deducted_from_child = true
  and beneficiary_user_id = user_id
);

-- ============ Part 2: assets ============
do $$ begin
  create type public.asset_kind as enum ('stock', 'gold', 'silver', 'real_estate');
exception when duplicate_object then null; end $$;

create table if not exists public.assets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind public.asset_kind not null,
  name text not null,
  symbol text,
  currency text not null default 'KWD',
  purchase_date date not null,
  quantity numeric(18,4) not null default 1 check (quantity > 0),
  unit_cost numeric(18,3) not null check (unit_cost >= 0),
  current_unit_value numeric(18,3) not null check (current_unit_value >= 0),
  purity text,
  property_type text,
  monthly_rent numeric(18,3) not null default 0 check (monthly_rent >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists assets_user_idx on public.assets (user_id, kind);

grant select, insert, update, delete on public.assets to authenticated;
grant all on public.assets to service_role;
alter table public.assets enable row level security;

drop policy if exists "Users manage own assets" on public.assets;
create policy "Users manage own assets"
on public.assets for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop trigger if exists set_assets_updated_at on public.assets;
create trigger set_assets_updated_at
before update on public.assets
for each row execute function public.set_updated_at();

-- Children and teenagers never own assets.
create or replace function public.wazen_assets_adults_only()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  stage text;
begin
  select life_stage::text into stage from public.profiles where id = new.user_id;
  if stage in ('child', 'teenager') then
    raise exception 'Assets are only available to independent adult accounts';
  end if;
  return new;
end;
$$;

drop trigger if exists wazen_assets_adults_only on public.assets;
create trigger wazen_assets_adults_only
before insert or update on public.assets
for each row execute function public.wazen_assets_adults_only();

create table if not exists public.asset_valuations (
  id uuid primary key default gen_random_uuid(),
  asset_id uuid not null references public.assets(id) on delete cascade,
  valued_on date not null,
  unit_value numeric(18,3) not null check (unit_value >= 0),
  created_at timestamptz not null default now(),
  unique (asset_id, valued_on)
);

create index if not exists asset_valuations_asset_idx on public.asset_valuations (asset_id, valued_on);

grant select, insert, update, delete on public.asset_valuations to authenticated;
grant all on public.asset_valuations to service_role;
alter table public.asset_valuations enable row level security;

drop policy if exists "Users manage own asset history" on public.asset_valuations;
create policy "Users manage own asset history"
on public.asset_valuations for all to authenticated
using (exists (select 1 from public.assets a where a.id = asset_id and a.user_id = auth.uid()))
with check (exists (select 1 from public.assets a where a.id = asset_id and a.user_id = auth.uid()));
