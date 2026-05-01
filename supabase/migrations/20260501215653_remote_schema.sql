alter table "public"."app_delivery_orders" drop constraint "delivery_orders_client_id_fkey";

alter table "public"."app_delivery_orders" drop constraint "delivery_orders_driver_id_fkey1";

alter table "public"."app_delivery_orders_waypoints" drop constraint "delivery_orders_waypoints_order_id_fkey";

alter table "public"."app_messages" drop constraint "messages_delivery_order_id_fkey";

alter table "public"."app_messages" drop constraint "messages_receiver_id_fkey";

alter table "public"."app_messages" drop constraint "messages_sender_id_fkey";

alter table "public"."app_settings" drop constraint "settings_id_fkey";

alter table "public"."telegram_bots" drop constraint "telegram_bots_vendor_id_fkey";

alter table "public"."telegram_cart" drop constraint "telegram_cart_user_id_fkey";

alter table "public"."telegram_cart" drop constraint "telegram_cart_vendor_id_fkey";

alter table "public"."telegram_orders" drop constraint "telegram_orders_user_id_fkey";

alter table "public"."telegram_orders" drop constraint "telegram_orders_vendor_id_fkey";

alter table "public"."telegram_orders" drop constraint "telegram_orders_zazu_sub_name_fkey";

alter table "public"."telegram_vendor_item" drop constraint "telegram_vendor_item_menu_id_fkey";

alter table "public"."telegram_vendor_item" drop constraint "telegram_vendor_item_vendor_id_fkey";

alter table "public"."telegram_vendor_menu" drop constraint "telegram_vendor_menu_vendor_id_fkey";

alter table "public"."app_custom_users" alter column "custom_role" set default 'client'::public.custom_roles;

alter table "public"."app_custom_users" alter column "custom_role" set data type public.custom_roles using "custom_role"::text::public.custom_roles;

alter table "public"."app_delivery_orders" alter column "status" set default 'pending'::public.delivery_status;

alter table "public"."app_delivery_orders" alter column "status" set data type public.delivery_status using "status"::text::public.delivery_status;

alter table "public"."app_riders_current_status" alter column "active_mode" set default 'client'::public.custom_roles;

alter table "public"."app_riders_current_status" alter column "active_mode" set data type public.custom_roles using "active_mode"::text::public.custom_roles;

alter table "public"."telegram_vendor" add column "user_id" uuid default auth.uid();

alter table "public"."app_delivery_orders" add constraint "app_delivery_orders_client_id_fkey" FOREIGN KEY (client_id) REFERENCES public.app_custom_users(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."app_delivery_orders" validate constraint "app_delivery_orders_client_id_fkey";

alter table "public"."telegram_vendor" add constraint "telegram_vendor_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."telegram_vendor" validate constraint "telegram_vendor_user_id_fkey";

alter table "public"."app_delivery_orders" add constraint "delivery_orders_driver_id_fkey1" FOREIGN KEY (driver_id) REFERENCES public.app_custom_users(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."app_delivery_orders" validate constraint "delivery_orders_driver_id_fkey1";

alter table "public"."app_delivery_orders_waypoints" add constraint "delivery_orders_waypoints_order_id_fkey" FOREIGN KEY (order_id) REFERENCES public.app_delivery_orders(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."app_delivery_orders_waypoints" validate constraint "delivery_orders_waypoints_order_id_fkey";

alter table "public"."app_messages" add constraint "messages_delivery_order_id_fkey" FOREIGN KEY (delivery_order_id) REFERENCES public.app_delivery_orders(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."app_messages" validate constraint "messages_delivery_order_id_fkey";

alter table "public"."app_messages" add constraint "messages_receiver_id_fkey" FOREIGN KEY (receiver_id) REFERENCES public.app_custom_users(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."app_messages" validate constraint "messages_receiver_id_fkey";

alter table "public"."app_messages" add constraint "messages_sender_id_fkey" FOREIGN KEY (sender_id) REFERENCES public.app_custom_users(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."app_messages" validate constraint "messages_sender_id_fkey";

alter table "public"."app_settings" add constraint "settings_id_fkey" FOREIGN KEY (id) REFERENCES public.app_custom_users(id) ON UPDATE CASCADE ON DELETE CASCADE not valid;

alter table "public"."app_settings" validate constraint "settings_id_fkey";

alter table "public"."telegram_bots" add constraint "telegram_bots_vendor_id_fkey" FOREIGN KEY (vendor_id) REFERENCES public.telegram_vendor(id) ON DELETE CASCADE not valid;

alter table "public"."telegram_bots" validate constraint "telegram_bots_vendor_id_fkey";

alter table "public"."telegram_cart" add constraint "telegram_cart_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.telegram_custom_users(telegram_user_id) not valid;

alter table "public"."telegram_cart" validate constraint "telegram_cart_user_id_fkey";

alter table "public"."telegram_cart" add constraint "telegram_cart_vendor_id_fkey" FOREIGN KEY (vendor_id) REFERENCES public.telegram_vendor(id) not valid;

alter table "public"."telegram_cart" validate constraint "telegram_cart_vendor_id_fkey";

alter table "public"."telegram_orders" add constraint "telegram_orders_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.telegram_custom_users(telegram_user_id) not valid;

alter table "public"."telegram_orders" validate constraint "telegram_orders_user_id_fkey";

alter table "public"."telegram_orders" add constraint "telegram_orders_vendor_id_fkey" FOREIGN KEY (vendor_id) REFERENCES public.telegram_vendor(id) not valid;

alter table "public"."telegram_orders" validate constraint "telegram_orders_vendor_id_fkey";

alter table "public"."telegram_orders" add constraint "telegram_orders_zazu_sub_name_fkey" FOREIGN KEY (zazu_sub_name) REFERENCES public.telegram_vendor(name) not valid;

alter table "public"."telegram_orders" validate constraint "telegram_orders_zazu_sub_name_fkey";

alter table "public"."telegram_vendor_item" add constraint "telegram_vendor_item_menu_id_fkey" FOREIGN KEY (menu_id) REFERENCES public.telegram_vendor_menu(id) not valid;

alter table "public"."telegram_vendor_item" validate constraint "telegram_vendor_item_menu_id_fkey";

alter table "public"."telegram_vendor_item" add constraint "telegram_vendor_item_vendor_id_fkey" FOREIGN KEY (vendor_id) REFERENCES public.telegram_vendor(id) not valid;

alter table "public"."telegram_vendor_item" validate constraint "telegram_vendor_item_vendor_id_fkey";

alter table "public"."telegram_vendor_menu" add constraint "telegram_vendor_menu_vendor_id_fkey" FOREIGN KEY (vendor_id) REFERENCES public.telegram_vendor(id) not valid;

alter table "public"."telegram_vendor_menu" validate constraint "telegram_vendor_menu_vendor_id_fkey";


