-- app_custom_users had a `for all using (true)` policy and back_drivers had no
-- RLS at all, so anyone holding the (public) anon key could read every user's
-- phone and every rider's bank details, and edit any profile.
--
-- After this:
--   app_custom_users  read: your own row + the other party on any of your orders
--                     insert: your own row (signup)
--                     update: your own profileImage only
--   back_drivers      read: your own row + the rider on any of your orders,
--                     and never the bank / email / location / key columns
--                     writes: Rust only (service_role)
-- Signed-out (anon) callers get nothing. Rust uses service_role and the
-- notify/offer functions are security definer, so neither is affected.

-- True when the signed-in user and p_user are client and driver on the same
-- order (either way round). Security definer so the policies below don't
-- depend on app_delivery_orders' own RLS.
create or replace function public.shares_order_with(p_user uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.app_delivery_orders o
     where (o.client_id = auth.uid() and o.driver_id = p_user)
        or (o.driver_id = auth.uid() and o.client_id = p_user)
  );
$$;

revoke execute on function public.shares_order_with(uuid) from public, anon;
grant execute on function public.shares_order_with(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- app_custom_users
-- ---------------------------------------------------------------------------
drop policy if exists "custom_table_policy" on public.app_custom_users;

revoke all on table public.app_custom_users from anon;
revoke insert, update, delete, truncate, references, trigger
  on table public.app_custom_users from authenticated;

grant select on table public.app_custom_users to authenticated;
-- Signup inserts the profile right after auth.signUp (email autoconfirm is on,
-- so there's a session). custom_role is only 'rider' | 'client'.
grant insert (id, username, phone, custom_role)
  on table public.app_custom_users to authenticated;
-- The only profile edit the apps make; role and phone stay put
grant update ("profileImage") on table public.app_custom_users to authenticated;
-- Account deletion goes through delete_own_account()

drop policy if exists "Users read own and order contacts" on public.app_custom_users;
create policy "Users read own and order contacts"
  on public.app_custom_users for select
  to authenticated
  using (id = auth.uid() or public.shares_order_with(id));

drop policy if exists "Users create own profile" on public.app_custom_users;
create policy "Users create own profile"
  on public.app_custom_users for insert
  to authenticated
  with check (id = auth.uid());

drop policy if exists "Users update own profile" on public.app_custom_users;
create policy "Users update own profile"
  on public.app_custom_users for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- back_drivers (written by Rust)
-- ---------------------------------------------------------------------------
alter table public.back_drivers enable row level security;

revoke all on table public.back_drivers from anon, authenticated;

-- Rider app: own status and tier. Customer app: the order's rider's vehicle,
-- licence and phone. account_number, bank_code, email, driver_location and
-- driver_pubkey are not granted, so the apps can't select them at all.
grant select (driver_id, name, phone, vehicle, vehicle_type, license_number, status, tier)
  on table public.back_drivers to authenticated;

drop policy if exists "Drivers read own and order riders" on public.back_drivers;
create policy "Drivers read own and order riders"
  on public.back_drivers for select
  to authenticated
  using (driver_id = auth.uid() or public.shares_order_with(driver_id));
