// Ride offers: Rust's assign_driver inserts a row in app_ride_offers for the
// rider it picks; the DB pushes it (app closed) and realtime delivers it (app
// open). The rider answers through Rust, which records it on the same row.
import { apiPost } from "./api-client";
import { supabase } from "./supabase";

export type OfferDetails = {
  offer_id: string;
  order_id: number;
  status: string;
  expires_at: string;
  pickup_name: string | null;
  pickup_lat: number | null;
  pickup_long: number | null;
  dropoff_name: string | null;
  dropoff_lat: number | null;
  dropoff_long: number | null;
  package_type: string | null;
  image_url: string | null;
  // Set once the rider has answered. Rust can assign a delivery outright
  // (status already accepted); the rider still has to tap Start.
  responded_at: string | null;
};

/** Assigned by Rust and not yet started by the rider. */
export const isAssignedOffer = (o: {
  status: string;
  responded_at?: string | null;
}) => o.status === "accepted" && !o.responded_at;

/** Still needs the rider: an open request, or an assignment to start. */
export const isAwaitingRider = (o: {
  status: string;
  responded_at?: string | null;
}) => o.status === "pending" || isAssignedOffer(o);

/** Offers awaiting the signed-in rider, oldest first (for launch/foreground). */
export async function fetchPendingOfferIds(): Promise<string[]> {
  const { data, error } = await supabase
    .from("app_ride_offers")
    .select("id")
    .or("status.eq.pending,and(status.eq.accepted,responded_at.is.null)")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: true });

  if (error) {
    console.error("Failed to fetch pending offers:", error.message);
    return [];
  }
  return data.map((row) => row.id);
}

/** What the rider may see before accepting (no phones or codes). */
export async function getOfferDetails(
  offerId: string,
): Promise<OfferDetails | null> {
  const { data, error } = await supabase.rpc("get_offer_details", {
    p_offer_id: offerId,
  });
  if (error) {
    console.error("Failed to load offer:", error.message);
    return null;
  }
  return data?.[0] ?? null;
}

/**
 * Accept or decline. Rust takes the rider id from the auth token and answers
 * 409 when the offer already expired or was answered.
 */
export async function respondToRideOffer(
  offerId: string,
  accepted: boolean,
  // Accepts send where the rider is so Rust can fill driver_initial_lat/long
  location?: { lat: number; long: number } | null,
) {
  try {
    const data = await apiPost("/drivers/driver-response", {
      offer_id: offerId,
      accepted,
      driver_lat: location?.lat ?? null,
      driver_long: location?.long ?? null,
    });
    return { success: true as const, data };
  } catch (err: any) {
    const expired = String(err?.message ?? "").startsWith("API 409");
    return {
      success: false as const,
      expired,
      error: expired
        ? "This request has expired or was already answered."
        : err?.message ?? "Could not send your response",
    };
  }
}
