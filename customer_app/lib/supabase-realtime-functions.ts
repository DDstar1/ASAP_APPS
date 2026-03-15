// lib/supabaseListeners.ts
import { supabase } from "./supabase";
import { supabaseEvents } from "./supabase";

// Separate channels
let DeliveryEventChannel: any = null;
let WaypointsEventChannel: any = null;

// Track which order_id the waypoints channel is currently bound to
let currentWaypointsOrderId: string | number | null = null;

/**
 * 🟢 LISTEN FOR DELIVERY ORDERS
 */
export function startDeliveryEvents() {
  if (DeliveryEventChannel) {
    console.log("Delivery event channel already running");
    return DeliveryEventChannel;
  }

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
 * 🟢 LISTEN FOR DRIVER WAYPOINTS for a specific order
 *
 * Call this once a driver_id appears on the order.
 * Calling it again with a different order_id will automatically
 * tear down the previous channel first.
 *
 * Emitted events:
 *   "waypoint_insert"  → payload.new  (new WaypointRow)
 */
export function startWaypointEvents(orderId: string | number) {
  // Already listening to the same order — nothing to do
  if (WaypointsEventChannel && currentWaypointsOrderId === orderId) {
    console.log(`Waypoints channel already running for order ${orderId}`);
    return WaypointsEventChannel;
  }

  // Tear down any existing channel for a different order
  if (WaypointsEventChannel) {
    console.log(
      `Switching waypoints channel from order ${currentWaypointsOrderId} → ${orderId}`,
    );
    stopWaypointEvents();
  }

  console.log(`Starting waypoints realtime listener for order ${orderId}...`);
  currentWaypointsOrderId = orderId;

  WaypointsEventChannel = supabase
    .channel(`waypoints-channel-${orderId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "delivery_orders_waypoints",
        filter: `order_id=eq.${orderId}`,
      },
      (payload) => {
        console.log(`Waypoint INSERT for order ${orderId}:`, payload.new);
        supabaseEvents.emit("waypoint_insert", payload.new);
      },
    )
    .subscribe();

  return WaypointsEventChannel;
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
 * 🔴 STOP ONLY waypoints LISTENER
 */
export function stopWaypointEvents() {
  if (!WaypointsEventChannel) return;
  WaypointsEventChannel.unsubscribe();
  WaypointsEventChannel = null;
  currentWaypointsOrderId = null;
}

/**
 * 🔴 STOP EVERYTHING
 */
export function stopAllListeners() {
  stopDeliveryEvents();
  stopWaypointEvents();
}
