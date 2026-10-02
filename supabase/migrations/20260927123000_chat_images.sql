-- Photos in chat: a message can carry an image (with or without text).
-- image_url holds the object path in the private chat_images bucket
-- ("<order_id>/<file>.jpg"); the apps turn it into a short-lived signed URL.
alter table public.app_messages
  add column if not exists image_url text;

insert into storage.buckets (id, name, public)
values ('chat_images', 'chat_images', false)
on conflict (id) do nothing;

-- Only the order's customer and assigned driver can upload or view its photos.
-- The first folder of the object path is the order id.
create or replace function public.is_order_participant(p_path text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.app_delivery_orders o
     where (storage.foldername(p_path))[1] ~ '^[0-9]+$'
       and o.id = ((storage.foldername(p_path))[1])::bigint
       and auth.uid() in (o.client_id, o.driver_id)
  );
$$;

revoke execute on function public.is_order_participant(text) from public, anon;
grant execute on function public.is_order_participant(text) to authenticated;

drop policy if exists "chat_images_insert" on storage.objects;
create policy "chat_images_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'chat_images'
    and public.is_order_participant(name)
  );

drop policy if exists "chat_images_select" on storage.objects;
create policy "chat_images_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'chat_images'
    and public.is_order_participant(name)
  );
