-- Orders are now created by the customer app before checkout:
--
--   app   create_order(...)                -> awaiting_payment row, returns order_ref
--   app   POST /payments/korapay/initialize { order_ref, price, ... }
--   Rust  finds the row by order_ref, checks the price against its own quote,
--         writes price + payment_reference (+ codes), replies
--         { checkout_url, reference, order_ref }
--   app   POST /riders/ride-request { order_ref, ... } once paid
--
-- The app only supplies what it knows (places, package, contact). Price,
-- codes, driver and status are never taken from the client. If initialize
-- fails the app discards the row with discard_unpaid_order(); anything left
-- behind is swept with the other stale awaiting_payment orders.
--
-- Also here: assigned-mode ride offers (Rust's ASSIGNED_DISPATCH_SOURCES)
-- get their own push title and expose responded_at so the rider app can show
-- the Start-only card.

-- ---------------------------------------------------------------------------
-- order_ref + price
-- ---------------------------------------------------------------------------
-- order_ref is what ride-request, assign-driver and the confirm endpoints
-- look orders up by. The default fills existing rows; Zazu orders set their
-- own. price is in naira and only Rust writes it.
alter table public.app_delivery_orders
  add column if not exists order_ref uuid not null default gen_random_uuid(),
  add column if not exists price numeric
    constraint app_delivery_orders_price_check check (price >= 0);

create unique index if not exists app_delivery_orders_order_ref_key
  on public.app_delivery_orders (order_ref);

-- ---------------------------------------------------------------------------
-- create_order: the only way the app creates an order
-- ---------------------------------------------------------------------------
-- order_code is the human-readable label (ASAP-XXXX-XXXX) shown on cards,
-- pushes and support; order_ref is the API key. The column's 'asap' default
-- is unique, so every order must get its own code here.
drop function if exists public.create_order(
  double precision, double precision, text,
  double precision, double precision, text,
  text, text, text, text
);

create function public.create_order(
  p_pickup_lat          double precision,
  p_pickup_long         double precision,
  p_pickup_name         text,
  p_dropoff_lat         double precision,
  p_dropoff_long        double precision,
  p_dropoff_name        text,
  p_package_type        text default null,
  p_package_description text default null,
  p_image_url           text default null,
  p_customer_phone      text default null
)
returns table (order_id bigint, order_ref uuid, order_code text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_chars constant text := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  v_code  text;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- 36^8 codes, so a clash is rare; try a few times before giving up
  for attempt in 1..5 loop
    v_code := 'ASAP-';
    for i in 1..9 loop
      v_code := v_code || case
        when i = 5 then '-'
        else substr(v_chars, 1 + floor(random() * 36)::int, 1)
      end;
    end loop;

    begin
      return query
      insert into public.app_delivery_orders as o (
        client_id, status, source, order_code,
        pickup_lat, pickup_long, pickup_name,
        dropoff_lat, dropoff_long, dropoff_name,
        package_type, package_description, image_url,
        customer_phone
      )
      values (
        auth.uid(), 'awaiting_payment', 'app', v_code,
        p_pickup_lat, p_pickup_long, p_pickup_name,
        p_dropoff_lat, p_dropoff_long, p_dropoff_name,
        p_package_type, p_package_description, p_image_url,
        p_customer_phone
      )
      returning o.id, o.order_ref, o.order_code;
      return;
    exception when unique_violation then
      -- order_code taken; go round again with a new one
    end;
  end loop;

  raise exception 'Could not generate a unique order code';
end;
$$;

revoke execute on function public.create_order(
  double precision, double precision, text,
  double precision, double precision, text,
  text, text, text, text
) from public, anon;
grant execute on function public.create_order(
  double precision, double precision, text,
  double precision, double precision, text,
  text, text, text, text
) to authenticated;

-- ---------------------------------------------------------------------------
-- discard_unpaid_order: initialize failed before a charge existed
-- ---------------------------------------------------------------------------
-- Once Rust has written payment_reference a charge may exist, so those go
-- through POST /payments/korapay/cancel instead (Rust checks Korapay first).
create or replace function public.discard_unpaid_order(p_order_ref uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  update public.app_delivery_orders
     set status       = 'cancelled',
         cancelled_at = now(),
         cancelled_by = auth.uid(),
         modified_at  = now()
   where order_ref = p_order_ref
     and client_id = auth.uid()
     and status = 'awaiting_payment'
     and payment_reference is null;
$$;

revoke execute on function public.discard_unpaid_order(uuid) from public, anon;
grant execute on function public.discard_unpaid_order(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Assigned-mode offers
-- ---------------------------------------------------------------------------
-- Rust inserts assigned offers as status 'accepted' with responded_at null;
-- the rider confirms with Start (driver-response fills responded_at).
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
    case when new.status = 'accepted'
      then 'New delivery assigned'
      else 'New delivery request'
    end,
    coalesce('Pickup: ' || v_pickup, 'Tap to view and accept.'),
    jsonb_build_object('type', 'ride_offer', 'offer_id', new.id, 'order_id', new.order_id),
    'ride_offers',
    false
  );

  return new;
end;
$$;

-- The return columns change, so the function has to be dropped first
drop function if exists public.get_offer_details(uuid);

-- What a driver may see before accepting: no phones, no codes.
create function public.get_offer_details(p_offer_id uuid)
returns table (
  offer_id      uuid,
  order_id      bigint,
  status        text,
  expires_at    timestamptz,
  responded_at  timestamptz,
  pickup_name   text,
  pickup_lat    numeric,
  pickup_long   numeric,
  dropoff_name  text,
  dropoff_lat   numeric,
  dropoff_long  numeric,
  package_type  text,
  image_url     text
)
language sql
stable
security definer
set search_path = ''
as $$
  select f.id, o.id, f.status, f.expires_at, f.responded_at,
         o.pickup_name, o.pickup_lat, o.pickup_long,
         o.dropoff_name, o.dropoff_lat, o.dropoff_long,
         o.package_type, o.image_url
    from public.app_ride_offers f
    join public.app_delivery_orders o on o.id = f.order_id
   where f.id = p_offer_id
     and f.driver_id = auth.uid();
$$;

revoke execute on function public.get_offer_details(uuid) from public, anon;
grant execute on function public.get_offer_details(uuid) to authenticated;
