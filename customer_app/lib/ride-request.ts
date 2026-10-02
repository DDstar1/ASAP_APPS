import { apiPost, apiPostIgnoringBody } from "./api-client";

// Mirrors Rust's CreateRideRequest. The app only supplies raw coordinates;
// Rust owns the GeoPoint type and does the conversion.
export type GeoPointJson = {
  latitude: number;
  longitude: number;
};

// Serde's default encoding for unit enum variants: ASAP → EV, ASAPEXPRESS → Bike
export type RideType = "ASAP" | "ASAPEXPRESS";

// Mirrors Rust's . dimensions are (length, width, height) in cm,
// weight in kg, price in naira.
export type ItemDetails = {
  name: string;
  price: number;
  dimensions: [number, number, number];
  quantity: number;
  weight: number;
  image_url: string | null;
};

export type CreateRideRequest = {
  source: "app" | "zazu";
  rider_id: string; // the customer (Rust's "rider")
  pick_up: GeoPointJson;
  drop_off: GeoPointJson;
  ride_type: RideType;
  payment_method: string;
  items: ItemDetails[];
  order_ref: string | null; // Zazu order; null for app orders
  user_id: number | null; // Telegram user id; null for app orders
  user_phone_number: string | null;
  vendor_phone_number: string | null;
  pickup_name: string | null;
  dropoff_name: string | null;
  payment_reference: string | null; // Korapay reference Rust verifies
};

// Priced by Rust (calculate_asap / calculate_express), one per ride type
export type RideQuote = {
  ride_type: RideType;
  estimated_price: number;
  original_price: number | null; // set when a discount applies
  estimated_time_min: number;
  distance_km: number;
};

export async function getRideQuotes(
  pick_up: GeoPointJson,
  drop_off: GeoPointJson,
): Promise<RideQuote[]> {
  try {
    return (
      (await apiPost<RideQuote[]>("/riders/ride-quote", {
        pick_up,
        drop_off,
      })) ?? []
    );
  } catch (err) {
    console.error("❌ Error fetching ride quotes:", err);
    return [];
  }
}

// Rust saves the request and only replies once the driver search has
// finished (assigned or declined). The app ignores the body: the order row
// (found by payment_reference) is the source of truth, watched via realtime.
export async function requestRide(
  body: CreateRideRequest,
): Promise<{ ok: boolean; error: string | null }> {
  try {
    await apiPostIgnoringBody("/riders/ride-request", body);
    return { ok: true, error: null };
  } catch (err: any) {
    console.error("❌ Error requesting ride:", err);
    return { ok: false, error: err?.message ?? "Request failed" };
  }
}
