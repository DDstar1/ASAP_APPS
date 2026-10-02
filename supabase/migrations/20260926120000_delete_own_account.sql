-- In-app account deletion (App Store guideline 5.1.1(v), Google Play account
-- deletion policy). Deleting the auth user cascades through app_custom_users,
-- app_delivery_orders, messages, settings, saved locations, package images,
-- rider status, back_custom_users and telegram_vendor.
--
-- Refuses while the caller is on either side of a delivery that has a rider
-- assigned and isn't delivered yet, so a rider can't vanish mid-trip and a
-- customer can't vanish while a rider is on the way.
create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  if exists (
    select 1
    from public.app_delivery_orders o
    where (o.driver_id = uid or o.client_id = uid)
      and o.driver_id is not null
      and o.status <> 'delivered'
  ) then
    raise exception 'ACTIVE_DELIVERY'
      using hint = 'Finish or hand over the ongoing delivery before deleting the account.';
  end if;

  delete from auth.users where id = uid;
end;
$$;

revoke execute on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
