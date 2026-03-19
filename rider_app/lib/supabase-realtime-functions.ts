// lib/supabaseListeners.ts
import { supabase } from "./supabase";
import { supabaseEvents } from "./supabase";

// Separate channels
let DeliveryEventChannel: any = null;
let MessageEventChannel: any = null;

/**
 * 🟢 LISTEN FOR DELIVERY ORDERS
 */
export function startDeliveryEvents() {
  if (DeliveryEventChannel) {
    console.log("Delivery event channel already running");
    return;
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
 * 🟢 LISTEN FOR MESSAGES
 */
export function startMessageEvents(userId: string) {
  if (MessageEventChannel) {
    console.log("Message event channel already running");
    return;
  }

  console.log("Starting messages realtime listener...");

  MessageEventChannel = supabase
    .channel(`messages-channel-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `receiver_id=eq.${userId}`,
      },
      (payload) => {
        console.log("Message INSERT event received:", payload);
        supabaseEvents.emit("message_insert", payload.new);
      },
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "messages",
        filter: `receiver_id=eq.${userId}`,
      },
      (payload) => {
        console.log("Message UPDATE event received:", payload);
        supabaseEvents.emit("message_update", payload.new);
      },
    )
    .subscribe();

  return MessageEventChannel;
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
 * 🔴 STOP ONLY message LISTENER
 */
export function stopMessageEvents() {
  if (!MessageEventChannel) return;
  MessageEventChannel.unsubscribe();
  MessageEventChannel = null;
}

/**
 * 🔴 STOP EVERYTHING
 */
export function stopAllListeners() {
  stopDeliveryEvents();
  stopMessageEvents();
}
