-- Every store gets a Telegram bot from the pool, without the vendor ever
-- handling the token.
--
-- Zazu fills telegram_bots with unpaired bots (token + created_at; vendor_id
-- null). public.pair_bots() hands free bots to stores that have none, oldest
-- store first, and runs:
--   1. when a store is created      (same write as becoming a vendor)
--   2. when Zazu adds bots to pool  (stores that waited on an empty pool)
--   3. daily via pg_cron            (safety net)
--   4. once at the end of this file (backfills today's stores without a bot)
--
-- A paired bot starts inactive; it runs once there's a subscription.
-- bot_username (display name) is chosen by the vendor on the bot page.
-- bot_id is Telegram's numeric id, the part of the token before ':', filled
-- here if Zazu left it null.
--
-- Keeping the pool topped up is Zazu's job; pairing logic lives only here.
-- Prerequisite: Database -> Extensions -> enable pg_cron (step 3 is skipped
-- with a notice otherwise).

create or replace function public.pair_bots()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_vendor bigint;
  v_bot bigint;
  v_paired integer := 0;
  v_waiting integer;
begin
  loop
    -- skip locked: concurrent runs never claim the same store or bot
    select v.id
      into v_vendor
      from public.telegram_vendor v
     where not exists (
             select 1 from public.telegram_bots b where b.vendor_id = v.id
           )
     order by v.created_at, v.id
     limit 1
       for update skip locked;
    exit when v_vendor is null;

    select b.id
      into v_bot
      from public.telegram_bots b
     where b.vendor_id is null
     order by b.created_at, b.id
     limit 1
       for update skip locked;
    exit when v_bot is null;

    update public.telegram_bots b
       set vendor_id = v_vendor,
           is_active = false,
           -- bot_id is text live but bigint in the old schema dump;
           -- populate_record converts the token's id to whichever it is
           bot_id = coalesce(
             b.bot_id,
             case when split_part(b.bot_token, ':', 1) ~ '^[0-9]+$'
                  then (jsonb_populate_record(
                          null::public.telegram_bots,
                          jsonb_build_object('bot_id', split_part(b.bot_token, ':', 1))
                        )).bot_id
             end
           )
     where b.id = v_bot;

    v_paired := v_paired + 1;
    v_vendor := null;
    v_bot := null;
  end loop;

  if v_vendor is not null then
    select count(*)
      into v_waiting
      from public.telegram_vendor v
     where not exists (
             select 1 from public.telegram_bots b where b.vendor_id = v.id
           );
    raise warning 'Telegram bot pool is empty; % store(s) waiting for a bot', v_waiting;
  end if;

  return v_paired;
end;
$$;

-- Server-side only (triggers, cron, SQL editor)
revoke execute on function public.pair_bots() from public, anon, authenticated;

create or replace function public.pair_bots_trigger()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.pair_bots();
  return null;
end;
$$;

revoke execute on function public.pair_bots_trigger() from public, anon, authenticated;

-- Earlier draft of this file used a per-row function; replaced by the above
drop trigger if exists pair_bot_with_new_vendor on public.telegram_vendor;
drop function if exists public.pair_bot_with_new_vendor();

-- 1. A new store
drop trigger if exists pair_bots_on_vendor_insert on public.telegram_vendor;
create trigger pair_bots_on_vendor_insert
  after insert on public.telegram_vendor
  for each statement execute function public.pair_bots_trigger();

-- 2. Zazu adds bots to the pool
drop trigger if exists pair_bots_on_bot_insert on public.telegram_bots;
create trigger pair_bots_on_bot_insert
  after insert on public.telegram_bots
  for each statement execute function public.pair_bots_trigger();

-- Fast lookup of free bots
create index if not exists telegram_bots_unpaired_idx
  on public.telegram_bots (created_at, id)
  where vendor_id is null;

-- 3. Daily safety net, 03:00 UTC
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    if exists (select 1 from cron.job where jobname = 'pair-bots-daily') then
      perform cron.unschedule('pair-bots-daily');
    end if;
    perform cron.schedule('pair-bots-daily', '0 3 * * *', 'select public.pair_bots()');
  else
    raise notice 'pg_cron is not enabled; daily pair-bots job not scheduled';
  end if;
end;
$$;

-- Vendors name their bot (column grant; RLS from the lockdown migration
-- still limits it to their own store's bot)
grant update (bot_username) on table public.telegram_bots to authenticated;

-- 4. Backfill stores that were created before pairing existed
select public.pair_bots();
