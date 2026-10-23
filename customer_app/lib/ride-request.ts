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
  // Package type from the item type screen; Rust can price by it without an app update
  type: string | null;
};

export type CreateRideRequest = {
  source: "app" | "zazu";
  rider_id: string; // the customer (Rust's "rider")
  pick_up: GeoPointJson;
  drop_off: GeoPointJson;
  ride_type: RideType;
  payment_method: string;
  items: ItemDetails[];
  order_ref: string | null; // app_delivery_orders.order_ref (from create_order)
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
  // Package insurance in naira, already inside estimated_price; 0 for the route-only quote
  insurance: number;
  estimated_time_min: number;
  distance_km: number;
};

// items is empty until the specifications screen fills it; sending it lets
// Rust price by package type, weight or size later with no app update
export async function getRideQuotes(
  pick_up: GeoPointJson,
  drop_off: GeoPointJson,
  items: ItemDetails[] = [],
): Promise<RideQuote[]> {
  try {
    return (
      (await apiPost<RideQuote[]>("/riders/ride-quote", {
        pick_up,
        drop_off,
        items,
      })) ?? []
    );
  } catch (err) {
    console.error("❌ Error fetching ride quotes:", err);
    return [];
  }
}

// Mirrors Rust's AreaCheck: allowed says whether the trip is inside one
// active service area; reason is worded for the customer when it isn't.
export type AreaCheck = {
  allowed: boolean;
  city?: string;
  reason?: string;
};

// The gate before the ride type screen. Quote, ride request and checkout
// enforce the same rule in Rust, so a failed call lets the user carry on.
export async function checkServiceArea(
  pick_up: GeoPointJson,
  drop_off: GeoPointJson,
): Promise<AreaCheck> {
  try {
    return (
      (await apiPost<AreaCheck>("/service-areas/check", { pick_up, drop_off })) ??
      { allowed: true }
    );
  } catch (err) {
    console.error("❌ Error checking service area:", err);
    return { allowed: true };
  }
}

// Rust saves the request, sets the order pending and replies straight away;
// the driver search runs in the background (up to 3 min). The app ignores
// the body: the order row is the source of truth, watched via realtime.
// Rust sets driver_id when a rider takes it, or status no_driver.
// A repeat call for the same order_ref doesn't start a second search.
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

// "Try again" after a search ended with no_driver: restarts the search for
// the same (already paid) order. Same reply handling as requestRide.
export async function restartDriverSearch(
  orderRef: string,
): Promise<{ ok: boolean; error: string | null }> {
  try {
    await apiPostIgnoringBody("/riders/assign-driver", { order_ref: orderRef });
    return { ok: true, error: null };
  } catch (err: any) {
    console.error("❌ Error restarting driver search:", err);
    return { ok: false, error: err?.message ?? "Request failed" };
  }
}
