-- The telegram_* tables never had RLS and kept Supabase's default grants, so
-- anyone holding the public anon key could read every vendor's bank details,
-- every Telegram bot token, customers' phones, orders and payments, and edit
-- or delete any of it.
--
-- The website is the source of truth for vendor data and writes these tables
-- with the vendor's own session, so writes stay client-side but are scoped to
-- the vendor's own stores:
--   telegram_vendor        own stores (user_id = auth.uid())
--   telegram_vendor_menu   \
--   telegram_vendor_item    > rows of a store you own
--   telegram_bots          /  (bots: read without token, toggle is_active only)
--   telegram_orders        read your stores' orders (status is Zazu's)
--   telegram_custom_users  read name/phone of customers who ordered from you
--   telegram_cart          \ not used by the website
--   telegram_payments      / (Telegram bot service only)
-- Signed-out (anon) callers get nothing except vendor_name_taken().
-- Anything using service_role (Rust) bypasses RLS and isn't affected.
-- The Telegram bot service must use service_role too, or it loses access.

-- Only the policies below should apply; drop anything left from before
do $$
declare
  p record;
begin
  for p in
    select policyname, tablename
      from pg_policies
     where schemaname = 'public'
       and tablename in (
         'telegram_vendor', 'telegram_vendor_menu', 'telegram_vendor_item',
         'telegram_bots', 'telegram_orders', 'telegram_custom_users',
         'telegram_cart', 'telegram_payments'
       )
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end;
$$;

-- True when the signed-in user owns store p_vendor. Security definer so the
-- child-table policies don't depend on telegram_vendor's own RLS.
create or replace function public.owns_vendor(p_vendor bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.telegram_vendor v
     where v.id = p_vendor
       and v.user_id = auth.uid()
  );
$$;

revoke execute on function public.owns_vendor(bigint) from public, anon;
grant execute on function public.owns_vendor(bigint) to authenticated;

-- Store names are unique across vendors (telegram_orders.zazu_sub_name points
-- at them), but RLS hides other vendors' rows, so signup asks this instead.
-- Vendor signup checks before the account exists, hence anon too.
create or replace function public.vendor_name_taken(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.telegram_vendor v where lower(v.name) = lower(trim(p_name))
  );
$$;

revoke execute on function public.vendor_name_taken(text) from public;
grant execute on function public.vendor_name_taken(text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- telegram_vendor
-- ---------------------------------------------------------------------------
alter table public.telegram_vendor enable row level security;
revoke all on table public.telegram_vendor from anon, authenticated;

grant select, delete on table public.telegram_vendor to authenticated;
-- user_id is left to its auth.uid() default; order_history is the bot's
grant insert (name, address, open_time, close_time, lat, lng, allows_logistics,
              acct_type, phone, email, message_body, acct_details)
  on table public.telegram_vendor to authenticated;
grant update (name, address, open_time, close_time, lat, lng, allows_logistics,
              acct_type, phone, message_body, acct_details, updated_at)
  on table public.telegram_vendor to authenticated;

create policy "Vendors read own stores"
  on public.telegram_vendor for select to authenticated
  using (user_id = auth.uid());

create policy "Vendors create own stores"
  on public.telegram_vendor for insert to authenticated
  with check (user_id = auth.uid());

create policy "Vendors update own stores"
  on public.telegram_vendor for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "Vendors delete own stores"
  on public.telegram_vendor for delete to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- telegram_vendor_menu, telegram_vendor_item, telegram_bots
-- ---------------------------------------------------------------------------
alter table public.telegram_vendor_menu enable row level security;
alter table public.telegram_vendor_item enable row level security;
alter table public.telegram_bots enable row level security;

revoke all on table public.telegram_vendor_menu from anon, authenticated;
revoke all on table public.telegram_vendor_item from anon, authenticated;
revoke all on table public.telegram_bots from anon, authenticated;

grant select, insert, update, delete on table public.telegram_vendor_menu to authenticated;
grant select, insert, update, delete on table public.telegram_vendor_item to authenticated;
-- Bots are assigned server-side when a store is created; the token never
-- leaves the server, not even for the owning vendor. Vendors can see which
-- bot they have and switch it on/off, nothing else.
grant select (id, bot_id, bot_username, bot_link, vendor_id, is_active, created_at)
  on table public.telegram_bots to authenticated;
grant update (is_active) on table public.telegram_bots to authenticated;

create policy "Vendors manage own categories"
  on public.telegram_vendor_menu for all to authenticated
  using (public.owns_vendor(vendor_id))
  with check (public.owns_vendor(vendor_id));

create policy "Vendors manage own items"
  on public.telegram_vendor_item for all to authenticated
  using (public.owns_vendor(vendor_id))
  with check (public.owns_vendor(vendor_id));

create policy "Vendors read own bots"
  on public.telegram_bots for select to authenticated
  using (public.owns_vendor(vendor_id));

create policy "Vendors switch own bots on and off"
  on public.telegram_bots for update to authenticated
  using (public.owns_vendor(vendor_id))
  with check (public.owns_vendor(vendor_id));

-- ---------------------------------------------------------------------------
-- telegram_orders, telegram_custom_users
-- ---------------------------------------------------------------------------
alter table public.telegram_orders enable row level security;
alter table public.telegram_custom_users enable row level security;

revoke all on table public.telegram_orders from anon, authenticated;
revoke all on table public.telegram_custom_users from anon, authenticated;

-- Read-only for vendors: Zazu (service_role) writes orders, status included
grant select on table public.telegram_orders to authenticated;

create policy "Vendors read own orders"
  on public.telegram_orders for select to authenticated
  using (public.owns_vendor(vendor_id));

grant select (id, telegram_user_id, name, phone)
  on table public.telegram_custom_users to authenticated;

create policy "Vendors read their customers"
  on public.telegram_custom_users for select to authenticated
  using (
    exists (
      select 1
        from public.telegram_orders o
       where o.user_id = telegram_custom_users.telegram_user_id
         and public.owns_vendor(o.vendor_id)
    )
  );

-- ---------------------------------------------------------------------------
-- telegram_cart, telegram_payments (bot service only)
-- ---------------------------------------------------------------------------
alter table public.telegram_cart enable row level security;
alter table public.telegram_payments enable row level security;

revoke all on table public.telegram_cart from anon, authenticated;
revoke all on table public.telegram_payments from anon, authenticated;
