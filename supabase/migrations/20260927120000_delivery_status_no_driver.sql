-- Rust sets this when the driver search for an order ends with no rider accepting
alter type public.delivery_status add value if not exists 'no_driver';
