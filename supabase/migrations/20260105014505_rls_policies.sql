-- PROFILES
alter table public.profiles enable row level security;

-- usuário vê o próprio profile
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
using (id = auth.uid() or public.is_admin())
with check (id = auth.uid() or public.is_admin());

-- SHIPPER_PROFILES
alter table public.shipper_profiles enable row level security;

drop policy if exists "shipper_select_own" on public.shipper_profiles;
create policy "shipper_select_own"
on public.shipper_profiles for select
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "shipper_upsert_own" on public.shipper_profiles;
create policy "shipper_upsert_own"
on public.shipper_profiles for insert
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "shipper_update_own" on public.shipper_profiles;
create policy "shipper_update_own"
on public.shipper_profiles for update
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

-- DRIVER_PROFILES
alter table public.driver_profiles enable row level security;

drop policy if exists "driver_select_own" on public.driver_profiles;
create policy "driver_select_own"
on public.driver_profiles for select
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "driver_upsert_own" on public.driver_profiles;
create policy "driver_upsert_own"
on public.driver_profiles for insert
with check (user_id = auth.uid() or public.is_admin());

drop policy if exists "driver_update_own" on public.driver_profiles;
create policy "driver_update_own"
on public.driver_profiles for update
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

-- VEHICLES
alter table public.vehicles enable row level security;

drop policy if exists "vehicles_select_own" on public.vehicles;
create policy "vehicles_select_own"
on public.vehicles for select
using (
  public.is_admin()
  or driver_user_id = auth.uid()
);

drop policy if exists "vehicles_insert_own" on public.vehicles;
create policy "vehicles_insert_own"
on public.vehicles for insert
with check (
  public.is_admin()
  or driver_user_id = auth.uid()
);

drop policy if exists "vehicles_update_own" on public.vehicles;
create policy "vehicles_update_own"
on public.vehicles for update
using (
  public.is_admin()
  or driver_user_id = auth.uid()
)
with check (
  public.is_admin()
  or driver_user_id = auth.uid()
);

-- ADMIN_USERS: só admin pode ver
alter table public.admin_users enable row level security;

drop policy if exists "admin_users_select_admin" on public.admin_users;
create policy "admin_users_select_admin"
on public.admin_users for select
using (public.is_admin());
