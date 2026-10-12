-- back_custom_users, back_ride_request and back_trips are Rust's tables (written
-- with service_role), but they kept Supabase's default grants, so anyone with
-- the public anon key could read customers' emails/phones and every ride's
-- pickup, dropoff and phone numbers. Same treatment as back_drivers in
-- 20261002120000:
--   back_custom_users  the customer reads their own row (customer app checks
--                      its Rust account exists); no keys exposed
--   back_ride_request  apps don't read it
--   back_trips         the rider reads their own trips' reference + fare
--                      (rider app earnings)
-- Rust (service_role) bypasses RLS and isn't affected.

-- Only the policies below should apply; drop anything left from before
do $$
declare
  p record;
begin
  for p in
    select policyname, tablename
      from pg_policies
     where schemaname = 'public'
       and tablename in ('back_custom_users', 'back_ride_request', 'back_trips')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- back_custom_users (Rust's "riders" = customers)
-- ---------------------------------------------------------------------------
alter table public.back_custom_users enable row level security;
revoke all on table public.back_custom_users from anon, authenticated;
grant select (rider_id, name, email, phone)
  on table public.back_custom_users to authenticated;

create policy "Customers read own account"
  on public.back_custom_users for select
  to authenticated
  using (rider_id = auth.uid());

-- ---------------------------------------------------------------------------
-- back_ride_request
-- ---------------------------------------------------------------------------
alter table public.back_ride_request enable row level security;
revoke all on table public.back_ride_request from anon, authenticated;

-- ---------------------------------------------------------------------------
-- back_trips
-- ---------------------------------------------------------------------------
alter table public.back_trips enable row level security;
revoke all on table public.back_trips from anon, authenticated;
grant select (driver_id, reference, fare_estimate)
  on table public.back_trips to authenticated;

create policy "Drivers read own trips"
  on public.back_trips for select
  to authenticated
  using (driver_id = auth.uid());
