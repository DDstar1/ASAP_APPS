// lib/supabaseListeners.ts
import { supabase } from "./supabase";
import { supabaseEvents } from "./supabase";

// Separate channels
let DeliveryEventChannel: any = null;

/**
 * 🟢 LISTEN FOR DELIVERY ORDERS
 */
export function startDeliveryEvents() {
  if (DeliveryEventChannel) return;
  else console.log("Delivery event channel already running");

  console.log("Starting delivery orders realtime listener...");

  DeliveryEventChannel = supabase
    .channel(`deliveries-channel`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "delivery_orders",
      },
      (payload) => {
        console.log("Delivery order event received:", payload);
        switch (payload.eventType) {
          case "INSERT":
            supabaseEvents.emit("delivery_insert", payload.new);
            break;

          case "UPDATE":
            supabaseEvents.emit("delivery_update", payload.new);
            console.log("Emitted delivery_update event");
            break;

          case "DELETE":
            supabaseEvents.emit("delivery_delete", payload.old);
            break;
        }
      },
    )
    .subscribe();

  return DeliveryEventChannel;
}

/**
 * 🔴 STOP ONLY delivery LISTENER
 */
export function stopDeliveryEvents() {
  if (!DeliveryEventChannel) return;
  DeliveryEventChannel.unsubscribe();
  DeliveryEventChannel = null;
}

/**
 * 🔴 STOP EVERYTHING (optional helper)
 */
export function stopAllListeners() {
  stopDeliveryEvents();
}
