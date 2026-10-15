-- vendor-item-images is a public bucket: images load by public URL without
-- any storage policy, so clients need no SELECT (listing) access at all.
-- Uploads go to "<vendor_id>/<timestamp>-<name>.<ext>", so writes are allowed
-- only into a folder named after a store the signed-in user owns.
--
-- Remove the old broad policies for this bucket in the dashboard
-- (Storage → Policies) — they are OR'd with these and would keep it open.

drop policy if exists "Vendors upload own item images" on storage.objects;
create policy "Vendors upload own item images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'vendor-item-images'
    -- case, not and: Postgres may evaluate the cast before the regex
    and case when (storage.foldername(name))[1] ~ '^[0-9]+$'
             then public.owns_vendor(((storage.foldername(name))[1])::bigint)
             else false end
  );

drop policy if exists "Vendors update own item images" on storage.objects;
create policy "Vendors update own item images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'vendor-item-images'
    -- case, not and: Postgres may evaluate the cast before the regex
    and case when (storage.foldername(name))[1] ~ '^[0-9]+$'
             then public.owns_vendor(((storage.foldername(name))[1])::bigint)
             else false end
  );

drop policy if exists "Vendors delete own item images" on storage.objects;
create policy "Vendors delete own item images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'vendor-item-images'
    -- case, not and: Postgres may evaluate the cast before the regex
    and case when (storage.foldername(name))[1] ~ '^[0-9]+$'
             then public.owns_vendor(((storage.foldername(name))[1])::bigint)
             else false end
  );
