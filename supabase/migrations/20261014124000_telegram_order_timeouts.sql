-- Vendor response + automatic cancel-and-refund for Telegram orders.
--
-- A paid order is cancelled (status 'cancelled', refund_status 'pending') when:
--   vendor_declined     the vendor taps "Can't fulfil" (any time before pickup)
--   vendor_no_response  48h after the order with no Accept / Can't fulfil
--   pickup_timeout      1h after a rider is assigned with no pickup code entered
--
-- Refunds stay with Zazu: it picks up refund_status = 'pending', refunds the
-- customer, messages them and sets 'refunded' (or 'failed'). Zazu also has to
-- release the rider / cancel the delivery for pickup_timeout orders.
--
-- Zazu writes driver_assigned_at (with driver_name/phone) and
-- pickup_confirmed_at (when the pickup code is entered); the 1h clock reads
-- them. 48h counts from created_at, so Zazu should insert the order once paid.
--
-- Vendors still can't write telegram_orders directly; their only write is
-- vendor_respond_order(), scoped to their own stores.
--
-- Strikes: every cancel above counts against the store (Can't fulfil, 48h no
-- response, 1h pickup timeout). The 5th since strikes_reset_at switches the
-- store's bot off and suspends it; the vendor can't switch it back on. Only
-- support reinstates, after the vendor calls:
--   update public.telegram_bots
--      set suspended_at = null, strikes_reset_at = now()
--    where vendor_id = <store id>;
--
-- New stores must accept the vendor guidelines (guidelines_accepted_at).

alter table public.telegram_orders
  add column if not exists vendor_response text
    constraint telegram_orders_vendor_response_check
      check (vendor_response in ('accepted', 'declined')),
  add column if not exists vendor_responded_at timestamptz,
  add column if not exists driver_assigned_at timestamptz,
  add column if not exists pickup_confirmed_at timestamptz,
  add column if not exists cancel_reason text
    constraint telegram_orders_cancel_reason_check
      check (cancel_reason in ('vendor_declined', 'vendor_no_response', 'pickup_timeout')),
  add column if not exists cancelled_at timestamptz,
  add column if not exists refund_status text
    constraint telegram_orders_refund_status_check
      check (refund_status in ('pending', 'refunded', 'failed'));

-- Zazu's refund queue
create index if not exists telegram_orders_refund_pending_idx
  on public.telegram_orders (cancelled_at)
  where refund_status = 'pending';

-- ---------------------------------------------------------------------------
-- Vendor: Accept or Can't fulfil
-- ---------------------------------------------------------------------------
create or replace function public.vendor_respond_order(p_order bigint, p_accept boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_accept then
    -- Accept once, while the order is still waiting on the vendor
    update public.telegram_orders o
       set vendor_response = 'accepted',
           vendor_responded_at = now(),
           updated_at = now()
     where o.id = p_order
       and public.owns_vendor(o.vendor_id)
       and o.status = 'paid'
       and o.vendor_response is null;
  else
    -- Can't fulfil: allowed until the rider has the package, even after Accept
    update public.telegram_orders o
       set vendor_response = 'declined',
           vendor_responded_at = now(),
           status = 'cancelled',
           cancel_reason = 'vendor_declined',
           cancelled_at = now(),
           refund_status = 'pending',
           updated_at = now()
     where o.id = p_order
       and public.owns_vendor(o.vendor_id)
       and o.status in ('paid', 'in_progress')
       and o.pickup_confirmed_at is null;
  end if;

  if not found then
    raise exception 'This order can no longer be changed' using errcode = 'P0001';
  end if;
end;
$$;

revoke execute on function public.vendor_respond_order(bigint, boolean) from public, anon;
grant execute on function public.vendor_respond_order(bigint, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Timeouts
-- ---------------------------------------------------------------------------
create or replace function public.expire_telegram_orders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_no_response integer;
  v_pickup integer;
begin
  update public.telegram_orders o
     set status = 'cancelled',
         cancel_reason = 'vendor_no_response',
         cancelled_at = now(),
         refund_status = 'pending',
         updated_at = now()
   where o.status = 'paid'
     and o.vendor_response is null
     and o.created_at < now() - interval '48 hours';
  get diagnostics v_no_response = row_count;

  update public.telegram_orders o
     set status = 'cancelled',
         cancel_reason = 'pickup_timeout',
         cancelled_at = now(),
         refund_status = 'pending',
         updated_at = now()
   where o.status in ('paid', 'in_progress')
     and o.driver_assigned_at < now() - interval '1 hour'
     and o.pickup_confirmed_at is null;
  get diagnostics v_pickup = row_count;

  return v_no_response + v_pickup;
end;
$$;

-- Server-side only (cron, SQL editor)
revoke execute on function public.expire_telegram_orders() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Strikes: 5 vendor-side cancels suspend the store's bot
-- ---------------------------------------------------------------------------
alter table public.telegram_bots
  add column if not exists suspended_at timestamptz,
  add column if not exists strikes_reset_at timestamptz;

-- Vendor-side cancels since support last reinstated the store's bot
create or replace function public.count_strikes(p_vendor bigint)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select count(*)::integer
    from public.telegram_orders o
   where o.vendor_id = p_vendor
     and o.cancel_reason is not null
     and o.cancelled_at > coalesce(
           (select b.strikes_reset_at from public.telegram_bots b where b.vendor_id = p_vendor),
           '-infinity'::timestamptz
         );
$$;

revoke execute on function public.count_strikes(bigint) from public, anon, authenticated;

-- The overview's "x of 5 strikes", for stores the caller owns (else 0)
create or replace function public.vendor_strikes(p_vendor bigint)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select case when public.owns_vendor(p_vendor) then public.count_strikes(p_vendor) else 0 end;
$$;

revoke execute on function public.vendor_strikes(bigint) from public, anon;
grant execute on function public.vendor_strikes(bigint) to authenticated;

create or replace function public.suspend_bot_on_strikes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if public.count_strikes(new.vendor_id) >= 5 then
    update public.telegram_bots b
       set is_active = false,
           suspended_at = now()
     where b.vendor_id = new.vendor_id
       and b.suspended_at is null;
  end if;

  return null;
end;
$$;

revoke execute on function public.suspend_bot_on_strikes() from public, anon, authenticated;

drop trigger if exists suspend_bot_on_strikes on public.telegram_orders;
create trigger suspend_bot_on_strikes
  after update of cancel_reason on public.telegram_orders
  for each row
  when (new.cancel_reason is not null and old.cancel_reason is null)
  execute function public.suspend_bot_on_strikes();

-- Vendors see the suspension; a suspended bot can't be switched on or renamed
grant select (suspended_at) on table public.telegram_bots to authenticated;

drop policy if exists "Vendors switch own bots on and off" on public.telegram_bots;
create policy "Vendors switch own bots on and off"
  on public.telegram_bots for update to authenticated
  using (public.owns_vendor(vendor_id) and suspended_at is null)
  with check (public.owns_vendor(vendor_id) and suspended_at is null);

-- ---------------------------------------------------------------------------
-- Vendor guidelines, accepted before a store is created
-- ---------------------------------------------------------------------------
alter table public.telegram_vendor
  add column if not exists guidelines_accepted_at timestamptz;

grant insert (guidelines_accepted_at) on table public.telegram_vendor to authenticated;

-- Existing stores keep null; every new store must carry the acceptance
drop policy if exists "Vendors create own stores" on public.telegram_vendor;
create policy "Vendors create own stores"
  on public.telegram_vendor for insert to authenticated
  with check (user_id = auth.uid() and guidelines_accepted_at is not null);

-- ---------------------------------------------------------------------------
-- Schedule
-- ---------------------------------------------------------------------------
-- Every 5 minutes, so a timed-out order is cancelled within ~5 min
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'expire-telegram-orders') then
      perform cron.unschedule('expire-telegram-orders');
    end if;
    perform cron.schedule('expire-telegram-orders', '*/5 * * * *', 'select public.expire_telegram_orders()');
  else
    raise notice 'pg_cron is not enabled; expire-telegram-orders job not scheduled';
  end if;
end;
$$;
