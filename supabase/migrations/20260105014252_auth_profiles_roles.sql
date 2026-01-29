-- 1) enum de role (opcional: pode ser TEXT, mas enum ajuda)
do $$ begin
  create type public.user_role as enum ('SHIPPER', 'DRIVER', 'OPERATOR');
exception
  when duplicate_object then null;
end $$;

-- 2) profiles (campos comuns)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null,
  full_name text not null,
  phone text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3) shipper_profiles (empresa/dono do equipamento)
create table if not exists public.shipper_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  company_name text not null,
  document_type text not null check (document_type in ('CNPJ','CPF')),
  document_number text not null,
  city text not null,
  state text not null,
  contact_name text not null,
  contact_phone text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4) driver_profiles (motorista)
create table if not exists public.driver_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  base_city text not null,
  base_state text not null,
  cnh_category text not null, -- ex: "C", "D", "E"
  years_experience int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5) vehicles (caminhões/implementos)
create table if not exists public.vehicles (
  id bigserial primary key,
  driver_user_id uuid not null references public.driver_profiles(user_id) on delete cascade,
  label text not null, -- ex: "Cavalo + prancha 3 eixos"
  plate text null,
  body_type text not null, -- ex: "PRANCHA", "GUINDASTE", "MUNCK", etc.
  max_payload_kg int not null default 0,
  length_m numeric(10,2) null,
  width_m numeric(10,2) null,
  height_m numeric(10,2) null,
  has_winch boolean not null default false,
  has_crane boolean not null default false,
  notes text null,
  created_at timestamptz not null default now()
);

create index if not exists ix_vehicles_driver_user_id on public.vehicles(driver_user_id);

-- 6) admin_users (lista de admins)
create table if not exists public.admin_users (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- 7) helper: is_admin()
create or replace function public.is_admin()
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.admin_users a
    where a.user_id = auth.uid()
  );
$$;

-- 8) trigger: criar profile ao cadastrar no auth.users
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role text;
  v_name text;
  v_phone text;
begin
  -- dados que vêm do signUp(options.data)
  v_role := coalesce(new.raw_user_meta_data->>'role', 'DRIVER');
  v_name := coalesce(new.raw_user_meta_data->>'full_name', 'Sem nome');
  v_phone := coalesce(new.raw_user_meta_data->>'phone', 'Sem telefone');

  insert into public.profiles (id, role, full_name, phone)
  values (new.id, v_role::public.user_role, v_name, v_phone)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

-- 9) updated_at automático (simples)
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_shipper_updated_at on public.shipper_profiles;
create trigger trg_shipper_updated_at
before update on public.shipper_profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists trg_driver_updated_at on public.driver_profiles;
create trigger trg_driver_updated_at
before update on public.driver_profiles
for each row execute procedure public.set_updated_at();
