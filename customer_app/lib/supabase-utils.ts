import { supabase } from "./supabase";

export async function deleteOldPendingDeliveries(
  client_id: string,
  current_order_code: string
) {
  try {
    const { error } = await supabase
      .from("delivery_orders")
      .delete()
      .eq("client_id", client_id)
      .eq("status", "pending")
      .neq("order_code", current_order_code); // only delete other pending ones

    if (error) {
      console.warn("⚠️ Failed to delete old pending deliveries:", error);
      return { success: false, error };
    }

    console.log("🧹 Old pending deliveries cleaned up for client:", client_id);
    return { success: true };
  } catch (err) {
    console.error("❌ Unexpected error cleaning up pending deliveries:", err);
    return { success: false, error: err };
  }
}

/**
 * Checks if a delivery order has been accepted by a driver.
 *
 * @param order_code - The order code of the delivery to check
 * @returns {accepted, driver_id} - accepted is true if driver_id exists, driver_id is the ID or null
 */
export async function hasDriverAcceptedDelivery(
  client_id: string,
  order_code: string
): Promise<{ accepted: boolean; driver_id: string | null }> {
  try {
    const { data, error } = await supabase
      .from("delivery_orders")
      .select("driver_id, status")
      .eq("client_id", client_id)
      .eq("order_code", order_code)
      .maybeSingle();

    console.log(data);
    if (error || !data) {
      console.warn("⚠️ Failed to fetch delivery:", error);
      return { accepted: false, driver_id: null };
    }

    const driver_id = data.driver_id ?? null;
    const accepted = !!driver_id;

    // Auto-update status if driver accepted
    if (accepted && data.status === "pending") {
      const { error: updateError } = await supabase
        .from("delivery_orders")
        .update({ status: "accepted" })
        .eq("client_id", client_id)
        .eq("order_code", order_code);

      if (updateError)
        console.warn("⚠️ Failed to update delivery status:", updateError);
      else console.log(`✅ Delivery ${order_code} marked as accepted.`);
    }

    return { accepted, driver_id };
  } catch (err) {
    console.error("❌ Unexpected error checking driver acceptance:", err);
    return { accepted: false, driver_id: null };
  }
}
