import { supabase } from "./supabase";

export async function deleteOldPendingDeliveries(
  client_id: string,
  current_order_code: string,
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
  order_code: string,
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

// 1️⃣ Helper function to check if order exists
export async function checkOrderExists(order_code: string) {
  const { data, error } = await supabase
    .from("delivery_orders")
    .select("order_code")
    .eq("order_code", order_code)
    .maybeSingle();

  if (error) throw error;
  return !!data; // true if exists, false if not
}

export function formatMessageTime(timestamp: string | Date): string {
  const messageDate = new Date(timestamp);
  const now = new Date();
  const diffInMs = now.getTime() - messageDate.getTime();
  const diffInHours = diffInMs / (1000 * 60 * 60);
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

  // Today - show time (e.g., "2:45 PM")
  if (diffInHours < 24 && messageDate.getDate() === now.getDate()) {
    return messageDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  // Yesterday - show time (e.g., "8:20 PM")
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (messageDate.getDate() === yesterday.getDate()) {
    return messageDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  // This week - show day name (e.g., "Mon", "Tue")
  if (diffInDays < 7) {
    return messageDate.toLocaleDateString("en-US", { weekday: "short" });
  }

  // Older - show date (e.g., "Jan 15")
  return messageDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
