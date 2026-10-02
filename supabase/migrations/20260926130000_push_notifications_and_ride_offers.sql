-- OS push notifications (Expo push API, sent from Postgres via pg_net),
-- ride offers to replace the Rust DRIVER_NOTIFY_CHANNELS long-poll,
-- and contact fields for orders coming from the customer app or Zazu.
--
-- To add a notification later (e.g. arrived_pickup / arrived_dropoff):
--   1. add the enum value (alter type public.delivery_status add value ...)
--   2. uncomment/add its WHEN branch in notify_order_status_change() below
--      (arrived_pickup / arrived_dropoff already have their message text)
--   3. handle its `type` in the app's notification tap handler

create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------------------
-- Order source + contact phones
-- ---------------------------------------------------------------------------
-- Zazu sends the customer phone and (sometimes) the vendor/pickup contact in
-- its API request; for customer-app orders Rust copies the customer's phone
-- from their profile. Phones are stored as E.164 text (e.g. +2348012345678).
--
-- NOTE: the current "delivery_orders" policy is `using (true)` and anon has
-- select, so these columns are world-readable until that policy is tightened.

alter table public.app_delivery_orders
  add column if not exists source text not null default 'app'
    check (source in ('app', 'zazu')),
  add column if not exists customer_phone text,
  add column if not exists pickup_contact_name text,
  add column if not exists pickup_contact_phone text;

-- ---------------------------------------------------------------------------
-- Push tokens
-- ---------------------------------------------------------------------------
-- One row per device install. Clients never touch the table directly: they go
-- through register/unregister RPCs, so a device that switches accounts moves
-- its token to the new user instead of hitting an RLS conflict.

create table if not exists public.app_push_tokens (
  token      text primary key,
  user_id    uuid not null references auth.users (id) on delete cascade,
  app        text not null check (app in ('customer', 'rider')),
  platform   text not null check (platform in ('ios', 'android')),
  updated_at timestamptz not null default now()
);

create index if not exists app_push_tokens_user_app_idx
  on public.app_push_tokens (user_id, app);

alter table public.app_push_tokens enable row level security;
revoke all on table public.app_push_tokens from anon, authenticated;

create or replace function public.register_push_token(
  p_token text,
  p_app text,
  p_platform text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  insert into public.app_push_tokens (token, user_id, app, platform, updated_at)
  values (p_token, auth.uid(), p_app, p_platform, now())
  on conflict (token) do update
    set user_id    = excluded.user_id,
        app        = excluded.app,
        platform   = excluded.platform,
        updated_at = now();
end;
$$;

create or replace function public.unregister_push_token(p_token text)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.app_push_tokens
  where token = p_token and user_id = auth.uid();
$$;

revoke execute on function public.register_push_token(text, text, text) from public, anon;
revoke execute on function public.unregister_push_token(text) from public, anon;
grant execute on function public.register_push_token(text, text, text) to authenticated;
grant execute on function public.unregister_push_token(text) to authenticated;

-- ---------------------------------------------------------------------------
-- send_push: the one place that talks to Expo
-- ---------------------------------------------------------------------------
-- Fire-and-forget: pg_net queues the request and sends it after the
-- transaction commits, so a slow or failing push never blocks an order update.
-- p_channel must match an Android channel created in the app.

create or replace function public.send_push(
  p_user_id uuid,
  p_app text,
  p_title text,
  p_body text,
  p_data jsonb default '{}'::jsonb,
  p_channel text default 'default',
  p_respect_prefs boolean default true
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_messages jsonb;
begin
  if p_user_id is null then
    return;
  end if;

  -- app_settings.delivery_alerts: missing row or null means "on"
  if p_respect_prefs and exists (
    select 1 from public.app_settings s
    where s.id = p_user_id and s.delivery_alerts is false
  ) then
    return;
  end if;

  select jsonb_agg(jsonb_build_object(
           'to',        t.token,
           'title',     p_title,
           'body',      p_body,
           'data',      p_data,
           'sound',     'default',
           'priority',  'high',
           'channelId', p_channel
         ))
    into v_messages
    from public.app_push_tokens t
   where t.user_id = p_user_id
     and t.app = p_app;

  -- No device registered (e.g. Zazu customers): nothing to send
  if v_messages is null then
    return;
  end if;

  perform net.http_post(
    url     := 'https://exp.host/--/api/v2/push/send',
    body    := v_messages,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Accept',       'application/json'
    )
  );
end;
$$;

revoke execute on function public.send_push(uuid, text, text, text, jsonb, text, boolean)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Customer notifications on order changes
-- ---------------------------------------------------------------------------

create or replace function public.notify_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_type  text;
  v_title text;
  v_body  text;
  v_rider text;
begin
  v_type := case
    when new.status = 'delivered' and old.status is distinct from 'delivered'
      then 'trip_complete'
    -- Uncomment once the enum values exist
    -- (pending → arriving_pickup → arrived_pickup → in_transit → arrived_dropoff → delivered):
    -- when new.status = 'arrived_dropoff' and old.status is distinct from 'arrived_dropoff'
    --   then 'rider_arrived_dropoff'
    when new.status = 'in_transit' and old.status is distinct from 'in_transit'
      then 'pickup_made'
    -- when new.status = 'arrived_pickup' and old.status is distinct from 'arrived_pickup'
    --   then 'rider_arrived_pickup'
    when new.driver_id is not null and old.driver_id is null
      then 'rider_found'
    else null
  end;

  if v_type is null then
    return new;
  end if;

  if v_type = 'rider_found' then
    select u.username into v_rider
      from public.app_custom_users u
     where u.id = new.driver_id;
  end if;

  case v_type
    when 'rider_found' then
      v_title := 'Rider found';
      v_body  := coalesce(v_rider, 'Your rider') || ' is heading to pick up your package.';
    when 'rider_arrived_pickup' then
      v_title := 'Rider at pickup';
      v_body  := 'Your rider has arrived at the pickup point.';
    when 'pickup_made' then
      v_title := 'Package picked up';
      v_body  := 'Your package is on its way' ||
                 coalesce(' to ' || new.dropoff_name, '') || '.';
    when 'rider_arrived_dropoff' then
      v_title := 'Rider has arrived';
      v_body  := 'Your rider is at the drop-off. Share your delivery code to receive the package.';
    when 'trip_complete' then
      v_title := 'Delivered';
      v_body  := 'Your package has been delivered. Thanks for using ASAP!';
  end case;

  perform public.send_push(
    new.client_id,
    'customer',
    v_title,
    v_body,
    jsonb_build_object('type', v_type, 'order_id', new.id)
  );

  return new;
end;
$$;

drop trigger if exists app_delivery_orders_notify on public.app_delivery_orders;
create trigger app_delivery_orders_notify
  after update of status, driver_id on public.app_delivery_orders
  for each row
  execute function public.notify_order_status_change();

-- ---------------------------------------------------------------------------
-- Ride offers (replaces the Rust DRIVER_NOTIFY_CHANNELS long-poll)
-- ---------------------------------------------------------------------------
-- Rust (assign_driver) inserts one row per driver it offers the order to and
-- records the answer via /drivers/driver-response. Drivers can only read their
-- own offers; all writes go through Rust.

create table if not exists public.app_ride_offers (
  id           uuid primary key default gen_random_uuid(),
  order_id     bigint not null references public.app_delivery_orders (id) on delete cascade,
  driver_id    uuid not null references auth.users (id) on delete cascade,
  status       text not null default 'pending'
                 check (status in ('pending', 'accepted', 'rejected', 'expired')),
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  responded_at timestamptz
);

-- At most one open offer per order at a time
create unique index if not exists app_ride_offers_one_pending_per_order
  on public.app_ride_offers (order_id)
  where status = 'pending';

create index if not exists app_ride_offers_driver_status_idx
  on public.app_ride_offers (driver_id, status);

alter table public.app_ride_offers enable row level security;
revoke all on table public.app_ride_offers from anon, authenticated;
grant select on table public.app_ride_offers to authenticated;

drop policy if exists "Drivers read own offers" on public.app_ride_offers;
create policy "Drivers read own offers"
  on public.app_ride_offers
  for select
  to authenticated
  using (driver_id = auth.uid());

create or replace function public.notify_ride_offer()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_pickup text;
begin
  select o.pickup_name into v_pickup
    from public.app_delivery_orders o
   where o.id = new.order_id;

  -- Offers are the rider's work queue, so they ignore delivery_alerts
  perform public.send_push(
    new.driver_id,
    'rider',
    'New delivery request',
    coalesce('Pickup: ' || v_pickup, 'Tap to view and accept.'),
    jsonb_build_object('type', 'ride_offer', 'offer_id', new.id, 'order_id', new.order_id),
    'ride_offers',
    false
  );

  return new;
end;
$$;

drop trigger if exists app_ride_offers_notify on public.app_ride_offers;
create trigger app_ride_offers_notify
  after insert on public.app_ride_offers
  for each row
  execute function public.notify_ride_offer();

-- What a driver may see before accepting: no phones, no codes.
create or replace function public.get_offer_details(p_offer_id uuid)
returns table (
  offer_id            uuid,
  order_id            bigint,
  status              text,
  expires_at          timestamptz,
  pickup_name         text,
  pickup_lat          numeric,
  pickup_long         numeric,
  dropoff_name        text,
  dropoff_lat         numeric,
  dropoff_long        numeric,
  package_type        text,
  package_description text
)
language sql
stable
security definer
set search_path = ''
as $$
  select f.id, o.id, f.status, f.expires_at,
         o.pickup_name, o.pickup_lat, o.pickup_long,
         o.dropoff_name, o.dropoff_lat, o.dropoff_long,
         o.package_type, o.package_description
    from public.app_ride_offers f
    join public.app_delivery_orders o on o.id = f.order_id
   where f.id = p_offer_id
     and f.driver_id = auth.uid();
$$;

revoke execute on function public.get_offer_details(uuid) from public, anon;
grant execute on function public.get_offer_details(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: tables the apps subscribe to must be in the publication
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'app_delivery_orders',
    'app_delivery_orders_waypoints',
    'app_messages',
    'app_ride_offers'
  ] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then
      null; -- already published
    end;
  end loop;
end;
$$;
