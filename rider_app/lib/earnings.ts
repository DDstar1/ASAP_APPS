// Rider earnings: a share of each delivered order's fee, set by the rider's
// tier in back_drivers. The fee is the trip's fare_estimate (the ride
// assignment's estimated_price, delivery only — never the Telegram item price),
// found via back_trips.reference = app_delivery_orders.payment_reference.
// Display only; Rust's payout must use the same rates.
import { supabase } from "./supabase";

export type DriverTier = "hp" | "or";

export const EARNINGS_RATE: Record<DriverTier, number> = {
  hp: 0.7, // hire purchase
  or: 0.84, // outright
};

export const TIER_LABEL: Record<DriverTier, string> = {
  hp: "Hire Purchase",
  or: "Outright",
};

// Until an admin sets the tier, show the lower rate rather than overpromise
export const DEFAULT_TIER: DriverTier = "hp";

/** The signed-in rider's tier, or null when it hasn't been assigned yet. */
export async function getDriverTier(): Promise<DriverTier | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("back_drivers")
    .select("tier")
    .eq("driver_id", user.id)
    .maybeSingle();

  if (error) {
    console.error("Failed to load driver tier:", error.message);
    return null;
  }
  return data?.tier === "hp" || data?.tier === "or" ? data.tier : null;
}

/** Delivery fee (naira) per payment reference; references with no trip are left out. */
export async function getDeliveryFees(
  references: string[],
): Promise<Record<string, number>> {
  if (references.length === 0) return {};

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return {};

  const { data, error } = await supabase
    .from("back_trips")
    .select("reference, fare_estimate")
    .eq("driver_id", user.id)
    .in("reference", references);

  if (error) {
    console.error("Failed to load delivery fees:", error.message);
    return {};
  }

  const fees: Record<string, number> = {};
  for (const trip of data) {
    if (trip.fare_estimate != null) fees[trip.reference] = trip.fare_estimate;
  }
  return fees;
}

export const earningFor = (fee: number, tier: DriverTier) =>
  Math.round(fee * EARNINGS_RATE[tier]);

export const formatNaira = (amount: number) =>
  `₦${amount.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`;
