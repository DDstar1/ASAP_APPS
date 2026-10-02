-- Chat messages were readable and writable by anyone ("Message Policy" was
-- using (true) for all roles, including anon). Now:
--   read:   only the sender and receiver
--   send:   only as yourself, only to the other side of an order you're on
--           (customer <-> assigned driver), and a photo must sit in that
--           order's chat_images folder
--   update: only the receiver, and only is_read (marking as read)
--   delete: nobody (service_role still bypasses all of this)

drop policy if exists "Message Policy" on public.app_messages;

revoke all on table public.app_messages from anon;
revoke all on table public.app_messages from authenticated;
grant select, insert on table public.app_messages to authenticated;
grant update (is_read) on table public.app_messages to authenticated;

-- True when sender and receiver are this order's customer and driver, in
-- either direction. Security definer so it doesn't depend on the policies
-- on app_delivery_orders.
create or replace function public.is_order_chat_pair(
  p_order_id bigint,
  p_sender uuid,
  p_receiver uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
      from public.app_delivery_orders o
     where o.id = p_order_id
       and o.driver_id is not null
       and (
         (o.client_id = p_sender and o.driver_id = p_receiver)
         or (o.driver_id = p_sender and o.client_id = p_receiver)
       )
  );
$$;

revoke execute on function public.is_order_chat_pair(bigint, uuid, uuid) from public, anon;
grant execute on function public.is_order_chat_pair(bigint, uuid, uuid) to authenticated;

create policy "app_messages_select_own"
  on public.app_messages for select
  to authenticated
  using (auth.uid() in (sender_id, receiver_id));

create policy "app_messages_insert_participant"
  on public.app_messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_order_chat_pair(delivery_order_id, sender_id, receiver_id)
    and (
      image_url is null
      or image_url like delivery_order_id::text || '/%'
    )
  );

create policy "app_messages_update_receiver"
  on public.app_messages for update
  to authenticated
  using (receiver_id = auth.uid())
  with check (receiver_id = auth.uid());
