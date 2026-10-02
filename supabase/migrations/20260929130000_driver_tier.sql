-- Driver payout tier, used for the rider's earnings split:
--   hp = hire purchase (rider is paying off the bike)  -> 70% of the delivery fee
--   or = outright (rider owns the bike)                -> 84% of the delivery fee
-- Null until an admin assigns it; the rider app then shows the hp rate.
-- Plain text + check (not a Postgres enum) so Rust's diesel schema can read it
-- as Nullable<Text> without a custom type mapping.

alter table public.back_drivers
  add column if not exists tier text
  constraint back_drivers_tier_check check (tier in ('hp', 'or'));
