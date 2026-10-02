-- append_waypoints still pointed at the pre-rename tables
-- (delivery_orders_waypoints, riders_current_status) and never set the
-- rider id, so the rider app's sync failed and nothing reached the
-- customer's live map. It also let any signed-in user write points for any
-- order; now only the order's assigned driver can.
create or replace function public.append_waypoints(
  p_order_id      bigint,
  p_new_waypoints jsonb,
  p_current_lat   double precision,
  p_current_lng   double precision
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  rider_uuid      uuid := auth.uid();
  waypoint_count  int;
  total_waypoints int;
begin
  if rider_uuid is null or not exists (
    select 1
      from public.app_delivery_orders
     where id = p_order_id
       and driver_id = rider_uuid
  ) then
    raise exception 'not the assigned driver for order %', p_order_id
      using errcode = '42501';
  end if;

  waypoint_count := jsonb_array_length(p_new_waypoints);

  -- One row per point; each insert reaches the customer through realtime
  insert into public.app_delivery_orders_waypoints (order_id, lat, long, created_at)
  select p_order_id,
         (w->>'lat')::double precision,
         (w->>'lng')::double precision,
         coalesce((w->>'timestamp')::timestamptz, now())
    from jsonb_array_elements(p_new_waypoints) w;

  update public.app_riders_current_status
     set latitude = p_current_lat,
         longitude = p_current_lng,
         updated_at = now()
   where id = rider_uuid;

  select count(*)
    into total_waypoints
    from public.app_delivery_orders_waypoints
   where order_id = p_order_id;

  return jsonb_build_object(
    'success', true,
    'order_id', p_order_id,
    'driver_id', rider_uuid,
    'waypoints_received', waypoint_count,
    'total_waypoints_in_db', total_waypoints,
    'current_lat', p_current_lat,
    'current_lng', p_current_lng,
    'updated_at', now()
  );
end;
$$;

revoke execute on function public.append_waypoints(bigint, jsonb, double precision, double precision) from public, anon;
grant execute on function public.append_waypoints(bigint, jsonb, double precision, double precision) to authenticated;
