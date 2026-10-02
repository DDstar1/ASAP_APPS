-- Offers show the item photo instead of a free-text description.
-- The return columns change, so the function has to be dropped first.
drop function if exists public.get_offer_details(uuid);

-- What a driver may see before accepting: no phones, no codes.
create function public.get_offer_details(p_offer_id uuid)
returns table (
  offer_id      uuid,
  order_id      bigint,
  status        text,
  expires_at    timestamptz,
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
  select f.id, o.id, f.status, f.expires_at,
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
