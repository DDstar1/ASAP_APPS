-- One login per person. Signup only writes auth.users + app_custom_users;
-- every other role is a row added later under the same user id:
--   driver    back_drivers.driver_id   (rider app → Rust /admin/create-drivers)
--   vendor    telegram_vendor.user_id  (website, one row per store)
-- The row is the grant, so there's no role flag to drift out of sync.
-- custom_role on app_custom_users is no longer relied on for access.
--
-- my_access() tells the apps and website which panels to offer the
-- signed-in user. It decides nothing by itself: RLS still guards the data.
-- Investor access joins this once invest_accounts exists.
create or replace function public.my_access()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'profile', exists (
      select 1 from public.app_custom_users u where u.id = auth.uid()
    ),
    'driver', exists (
      select 1 from public.back_drivers d where d.driver_id = auth.uid()
    ),
    'vendor_ids', coalesce((
      select jsonb_agg(v.id order by v.created_at)
        from public.telegram_vendor v
       where v.user_id = auth.uid()
    ), '[]'::jsonb)
  );
$$;

revoke execute on function public.my_access() from public, anon;
grant execute on function public.my_access() to authenticated;
