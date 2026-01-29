-- 1) OWNER COLUMNS
alter table public.freight
  add column if not exists shipper_user_id uuid;

alter table public.trip
  add column if not exists driver_user_id uuid;

-- 2) BACKFILL (se já existir dado antigo sem dono)
-- Se você já tem dados, eles ficarão sem owner. Para não quebrar, você tem 2 opções:
-- A) setar tudo para um admin específico (manual)
-- B) permitir null temporariamente e depois limpar
-- Aqui vamos apenas manter nullable por enquanto.

-- 3) DEFAULTS para novos registros (quando o front inserir sem passar owner)
-- Obs: isso só funciona se o insert for feito com usuário logado (auth.uid()).
alter table public.freight
  alter column shipper_user_id set default auth.uid();

alter table public.trip
  alter column driver_user_id set default auth.uid();

-- 4) INDEXES
create index if not exists ix_freight_shipper_user_id on public.freight(shipper_user_id);
create index if not exists ix_trip_driver_user_id on public.trip(driver_user_id);

-- 5) ENABLE RLS
alter table public.freight enable row level security;
alter table public.trip enable row level security;

-- 6) POLICIES: FREIGHT (SHIPPER owns)
drop policy if exists "freight_select_own_or_admin" on public.freight;
create policy "freight_select_own_or_admin"
on public.freight for select
using (
  public.is_admin()
  or shipper_user_id = auth.uid()
);

drop policy if exists "freight_insert_own_or_admin" on public.freight;
create policy "freight_insert_own_or_admin"
on public.freight for insert
with check (
  public.is_admin()
  or shipper_user_id = auth.uid()
);

drop policy if exists "freight_update_own_or_admin" on public.freight;
create policy "freight_update_own_or_admin"
on public.freight for update
using (
  public.is_admin()
  or shipper_user_id = auth.uid()
)
with check (
  public.is_admin()
  or shipper_user_id = auth.uid()
);

drop policy if exists "freight_delete_admin_only" on public.freight;
create policy "freight_delete_admin_only"
on public.freight for delete
using (public.is_admin());

-- 7) POLICIES: TRIP (DRIVER owns)
drop policy if exists "trip_select_own_or_admin" on public.trip;
create policy "trip_select_own_or_admin"
on public.trip for select
using (
  public.is_admin()
  or driver_user_id = auth.uid()
);

drop policy if exists "trip_insert_own_or_admin" on public.trip;
create policy "trip_insert_own_or_admin"
on public.trip for insert
with check (
  public.is_admin()
  or driver_user_id = auth.uid()
);

drop policy if exists "trip_update_own_or_admin" on public.trip;
create policy "trip_update_own_or_admin"
on public.trip for update
using (
  public.is_admin()
  or driver_user_id = auth.uid()
)
with check (
  public.is_admin()
  or driver_user_id = auth.uid()
);

drop policy if exists "trip_delete_admin_only" on public.trip;
create policy "trip_delete_admin_only"
on public.trip for delete
using (public.is_admin());
