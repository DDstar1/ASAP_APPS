-- app_delivery_orders still had the original "delivery_orders" policy
-- (for all to public using (true)) plus Supabase's default grants, so anyone
-- with the public anon key could read, edit or delete every order. Rust
-- (service_role) now does all writes; the apps only create and discard
-- unpaid orders through the create_order / discard_unpaid_order RPCs, which
-- are security definer and unaffected by this.
--   customers  read their own orders (client_id)
--   drivers    read orders assigned to them (driver_id)
-- Realtime follows the same policies, so each app only hears about its own
-- rows. Rust (service_role) bypasses RLS and isn't affected.
--
-- Deploy only once the app builds without direct writes are out (the
-- customer card's cancel used to delete the row). Anything else still using
-- the anon key on this table (Telegram bot, website) loses access.

-- Only the policies below should apply; drop anything left from before
do $$
declare
  p record;
begin
  for p in
    select policyname, tablename
      from pg_policies
     where schemaname = 'public'
       and tablename = 'app_delivery_orders'
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end;
$$;

alter table public.app_delivery_orders enable row level security;
revoke all on table public.app_delivery_orders from anon, authenticated;
grant select on table public.app_delivery_orders to authenticated;

create policy "Customers read own orders"
  on public.app_delivery_orders for select
  to authenticated
  using (client_id = auth.uid());

create policy "Drivers read assigned orders"
  on public.app_delivery_orders for select
  to authenticated
  using (driver_id = auth.uid());
