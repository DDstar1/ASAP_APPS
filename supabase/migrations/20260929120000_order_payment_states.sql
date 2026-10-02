-- Orders now exist before they're paid for, and can be cancelled:
--
--   Rust /payments/korapay/initialize -> inserts the order as awaiting_payment
--                                        with payment_reference set
--   charge verified                   -> pending (riders get offers from here)
--   checkout abandoned / charge fails -> cancelled
--   customer cancels after paying     -> cancelled (allowed until pickup;
--                                        Rust refunds, less a fee once a
--                                        rider is on the way)
--
-- Riders only ever see pending and later, so awaiting_payment orders never
-- reach them. trips.reference and payment_reference hold the same Korapay
-- reference; Rust updates both tables in one transaction.
--
-- New enum values can't be used in the transaction that adds them, so the
-- trigger changes that use 'cancelled' are in the next migration.
alter type public.delivery_status add value if not exists 'awaiting_payment';
alter type public.delivery_status add value if not exists 'cancelled';

alter table public.app_delivery_orders
  add column if not exists payment_reference text,
  add column if not exists cancelled_at timestamptz,
  add column if not exists cancelled_by uuid references public.app_custom_users (id) on delete set null;

create unique index if not exists app_delivery_orders_payment_reference_key
  on public.app_delivery_orders (payment_reference)
  where payment_reference is not null;
