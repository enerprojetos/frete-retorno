-- 0) ENUM DE STATUS
do $$ begin
  create type public.match_request_status as enum ('PENDING','ACCEPTED','REJECTED','CANCELLED');
exception
  when duplicate_object then null;
end $$;

-- 1) TABELA
create table if not exists public.match_request (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  freight_id uuid not null references public.freight(id) on delete cascade,
  trip_id uuid not null references public.trip(id) on delete cascade,

  status public.match_request_status not null default 'PENDING',
  proposed_by_role text not null check (proposed_by_role in ('DRIVER','SHIPPER')),

  -- participantes (snapshot)
  driver_user_id uuid not null,
  shipper_user_id uuid not null,

  -- snapshots para UI (não dependem de JOIN e não quebram por RLS)
  driver_display_name text not null,
  shipper_display_name text not null,

  freight_pickup_label text not null,
  freight_dropoff_label text not null,
  trip_origin_label text not null,
  trip_destination_label text not null,

  responded_by uuid null,
  responded_at timestamptz null,

  cancelled_by uuid null,
  cancelled_at timestamptz null,

  constraint uq_match_request_pair unique (freight_id, trip_id)
);

create index if not exists ix_match_request_shipper_user_id on public.match_request(shipper_user_id);
create index if not exists ix_match_request_driver_user_id on public.match_request(driver_user_id);
create index if not exists ix_match_request_status on public.match_request(status);

-- 2) updated_at automático (usa sua function já existente)
drop trigger if exists trg_match_request_updated_at on public.match_request;
create trigger trg_match_request_updated_at
before update on public.match_request
for each row execute procedure public.set_updated_at();

-- 3) RLS
alter table public.match_request enable row level security;

-- participantes (ou admin) podem ver
drop policy if exists "match_request_select_participants" on public.match_request;
create policy "match_request_select_participants"
on public.match_request for select
using (
  public.is_admin()
  or driver_user_id = auth.uid()
  or shipper_user_id = auth.uid()
);

-- insert: só o próprio motorista (ou admin) cria solicitação via client
-- (na prática vamos criar via RPC, mas deixo coerente)
drop policy if exists "match_request_insert_driver" on public.match_request;
create policy "match_request_insert_driver"
on public.match_request for insert
with check (
  public.is_admin()
  or driver_user_id = auth.uid()
);

-- update/delete: travados no client (vamos fazer via RPC security definer)
drop policy if exists "match_request_update_admin_only" on public.match_request;
create policy "match_request_update_admin_only"
on public.match_request for update
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "match_request_delete_admin_only" on public.match_request;
create policy "match_request_delete_admin_only"
on public.match_request for delete
using (public.is_admin());

-- 4) RPC: motorista solicita match (PENDING)
create or replace function public.propose_match_request(
  p_trip_id uuid,
  p_freight_id uuid
) returns public.match_request
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trip public.trip;
  v_freight public.freight;
  v_driver_name text;
  v_shipper_name text;
  v_row public.match_request;
begin
  if auth.uid() is null then
    raise exception 'NOT_AUTHENTICATED';
  end if;

  select * into v_trip from public.trip where id = p_trip_id;
  if not found then raise exception 'TRIP_NOT_FOUND'; end if;

  if not public.is_admin() and v_trip.driver_user_id <> auth.uid() then
    raise exception 'FORBIDDEN_TRIP';
  end if;

  select * into v_freight from public.freight where id = p_freight_id;
  if not found then raise exception 'FREIGHT_NOT_FOUND'; end if;

  if v_freight.status <> 'OPEN' then
    raise exception 'FREIGHT_NOT_OPEN';
  end if;

  if v_freight.shipper_user_id is null then
    raise exception 'FREIGHT_WITHOUT_OWNER';
  end if;

  v_driver_name := coalesce((select full_name from public.profiles where id = v_trip.driver_user_id), 'Motorista');
  v_shipper_name := coalesce((select company_name from public.shipper_profiles where user_id = v_freight.shipper_user_id), 'Empresa');

  insert into public.match_request (
    freight_id, trip_id,
    status, proposed_by_role,
    driver_user_id, shipper_user_id,
    driver_display_name, shipper_display_name,
    freight_pickup_label, freight_dropoff_label,
    trip_origin_label, trip_destination_label
  ) values (
    v_freight.id, v_trip.id,
    'PENDING', 'DRIVER',
    v_trip.driver_user_id, v_freight.shipper_user_id,
    v_driver_name, v_shipper_name,
    v_freight.pickup_label, v_freight.dropoff_label,
    v_trip.origin_label, v_trip.destination_label
  )
  on conflict (freight_id, trip_id) do update
    set updated_at = now()
  returning * into v_row;

  return v_row;
end $$;

grant execute on function public.propose_match_request(uuid, uuid) to authenticated;

-- 5) RPC: empresa responde (ACCEPTED/REJECTED)
create or replace function public.shipper_respond_match_request(
  p_match_request_id uuid,
  p_decision text,               -- 'ACCEPT' | 'REJECT'
  p_close_freight boolean default false
) returns public.match_request
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.match_request;
  v_new_status public.match_request_status;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select * into v_row from public.match_request where id = p_match_request_id;
  if not found then raise exception 'MATCH_REQUEST_NOT_FOUND'; end if;

  if not public.is_admin() and v_row.shipper_user_id <> auth.uid() then
    raise exception 'FORBIDDEN_SHIPPER';
  end if;

  if v_row.status <> 'PENDING' then
    raise exception 'INVALID_STATUS';
  end if;

  if upper(p_decision) = 'ACCEPT' then
    v_new_status := 'ACCEPTED';
  elsif upper(p_decision) = 'REJECT' then
    v_new_status := 'REJECTED';
  else
    raise exception 'INVALID_DECISION';
  end if;

  update public.match_request
    set status = v_new_status,
        responded_by = auth.uid(),
        responded_at = now()
  where id = v_row.id
  returning * into v_row;

  -- opcional: fechar o frete quando aceitar
  if v_new_status = 'ACCEPTED' and p_close_freight then
    update public.freight set status = 'CLOSED' where id = v_row.freight_id;
  end if;

  return v_row;
end $$;

grant execute on function public.shipper_respond_match_request(uuid, text, boolean) to authenticated;

-- 6) RPC: motorista cancela enquanto está pendente
create or replace function public.driver_cancel_match_request(
  p_match_request_id uuid
) returns public.match_request
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.match_request;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select * into v_row from public.match_request where id = p_match_request_id;
  if not found then raise exception 'MATCH_REQUEST_NOT_FOUND'; end if;

  if not public.is_admin() and v_row.driver_user_id <> auth.uid() then
    raise exception 'FORBIDDEN_DRIVER';
  end if;

  if v_row.status <> 'PENDING' then
    raise exception 'INVALID_STATUS';
  end if;

  update public.match_request
    set status = 'CANCELLED',
        cancelled_by = auth.uid(),
        cancelled_at = now()
  where id = v_row.id
  returning * into v_row;

  return v_row;
end $$;

grant execute on function public.driver_cancel_match_request(uuid) to authenticated;

-- 7) RPC: detalhes + CONTATO (só se ACCEPTED)
create or replace function public.get_match_request_detail(
  p_match_request_id uuid
) returns table (
  id uuid,
  status public.match_request_status,

  freight_id uuid,
  trip_id uuid,

  freight_pickup_label text,
  freight_dropoff_label text,
  trip_origin_label text,
  trip_destination_label text,

  shipper_display_name text,
  driver_display_name text,

  shipper_contact_name text,
  shipper_contact_phone text,
  driver_phone text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.match_request;
begin
  if auth.uid() is null then raise exception 'NOT_AUTHENTICATED'; end if;

  select * into v_row from public.match_request where id = p_match_request_id;
  if not found then raise exception 'MATCH_REQUEST_NOT_FOUND'; end if;

  if not public.is_admin()
     and v_row.driver_user_id <> auth.uid()
     and v_row.shipper_user_id <> auth.uid() then
    raise exception 'FORBIDDEN';
  end if;

  return query
  select
    v_row.id,
    v_row.status,
    v_row.freight_id,
    v_row.trip_id,
    v_row.freight_pickup_label,
    v_row.freight_dropoff_label,
    v_row.trip_origin_label,
    v_row.trip_destination_label,
    v_row.shipper_display_name,
    v_row.driver_display_name,

    case when v_row.status = 'ACCEPTED'
      then (select sp.contact_name from public.shipper_profiles sp where sp.user_id = v_row.shipper_user_id)
      else null end as shipper_contact_name,

    case when v_row.status = 'ACCEPTED'
      then (select sp.contact_phone from public.shipper_profiles sp where sp.user_id = v_row.shipper_user_id)
      else null end as shipper_contact_phone,

    case when v_row.status = 'ACCEPTED'
      then (select p.phone from public.profiles p where p.id = v_row.driver_user_id)
      else null end as driver_phone;
end $$;

grant execute on function public.get_match_request_detail(uuid) to authenticated;
