-- Tell the assigned rider when an order they're on is cancelled: stop
-- heading to pickup, or, if they've already collected it, take the package
-- back (see app_returned). Same trigger as before, plus the
-- 'order_cancelled' branch (sent to the driver, not the customer, who
-- cancelled it).

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
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    if new.driver_id is not null then
      perform public.send_push(
        new.driver_id,
        'rider',
        'Order cancelled',
        'Order #' || new.order_code || ' was cancelled by the customer. ' ||
          case when new.is_pickup_code_authenticated
            then 'Please return the package to the pickup point.'
            else 'You don''t need to pick it up.'
          end,
        jsonb_build_object(
          'type', 'order_cancelled',
          'order_id', new.id,
          'return_to_pickup', new.is_pickup_code_authenticated
        ),
        'default',
        false
      );
    end if;
    return new;
  end if;

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
