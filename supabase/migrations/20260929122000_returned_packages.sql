-- Packages going back to the sender. When a customer cancels after the
-- rider has collected the package (pickup code entered), the order is
-- cancelled with no refund and Rust opens a return here: the rider takes the
-- package back to the pickup point and shows the return code, and the
-- customer enters it to confirm they've received the package back.
--
-- return_code is generated later (Rust, alongside pickup/dropoff codes), so
-- it's nullable for now. The customer must never read it, or they could
-- confirm without receiving anything: authenticated users get every column
-- except return_code, and the rider reads it through get_return_code().

create table if not exists public.app_returned (
  id                            bigint generated always as identity primary key,
  order_id                      bigint not null unique
                                  references public.app_delivery_orders (id) on delete cascade,
  client_id                     uuid not null
                                  references public.app_custom_users (id) on delete cascade,
  driver_id                     uuid
                                  references public.app_custom_users (id) on delete set null,
  -- Where the package goes back to: the order's pickup point
  return_lat                    numeric not null,
  return_long                   numeric not null,
  return_name                   text,
  return_code                   text,
  is_return_code_authenticated  boolean not null default false,
  status                        text not null default 'returning'
                                  check (status in ('returning', 'returned')),
  created_at                    timestamptz not null default now(), -- return opened (order cancelled)
  returned_at                   timestamptz                         -- package handed back
);

create index if not exists app_returned_driver_id_idx on public.app_returned (driver_id);
create index if not exists app_returned_client_id_idx on public.app_returned (client_id);

alter table public.app_returned enable row level security;

-- Only Rust (service_role) writes; the customer and rider only read
revoke all on table public.app_returned from anon, authenticated;
grant select (
  id, order_id, client_id, driver_id,
  return_lat, return_long, return_name,
  is_return_code_authenticated, status, created_at, returned_at
) on table public.app_returned to authenticated;

create policy "app_returned_select_participant"
  on public.app_returned for select
  to authenticated
  using (auth.uid() in (client_id, driver_id));

-- The rider's copy of the return code, to show the customer at hand-back
create or replace function public.get_return_code(p_order_id bigint)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select r.return_code
    from public.app_returned r
   where r.order_id = p_order_id
     and r.driver_id = auth.uid();
$$;

revoke execute on function public.get_return_code(bigint) from public, anon;
grant execute on function public.get_return_code(bigint) to authenticated;
