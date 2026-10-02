// lib/supabaseListeners.ts
import { supabase } from "./supabase";
import { supabaseEvents } from "./supabase";
import type { RiderOrder } from "@/utils/my_types";

// Separate channels
let DeliveryEventChannel: any = null;
let MessageEventChannel: any = null;
let RideOfferEventChannel: any = null;

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
        table: "app_delivery_orders",
      },
      (payload) => {
        console.log("Delivery order event received:", payload);
        switch (payload.eventType) {
          case "INSERT":
            supabaseEvents.emit("delivery_insert", payload.new as RiderOrder);
            break;

          case "UPDATE":
            supabaseEvents.emit("delivery_update", payload.new as RiderOrder);
            console.log("Emitted delivery_update event");
            break;

          case "DELETE":
            supabaseEvents.emit("delivery_delete", payload.old as RiderOrder);
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
        table: "app_messages",
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
        table: "app_messages",
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
 * 🟢 LISTEN FOR RIDE OFFERS sent to this rider
 *
 * Emits:
 *   "ride_offer_insert" → new offer (show it)
 *   "ride_offer_update" → offer answered/expired (hide it)
 */
export function startRideOfferEvents(userId: string) {
  if (RideOfferEventChannel) {
    console.log("Ride offer channel already running");
    return;
  }

  RideOfferEventChannel = supabase
    .channel(`ride-offers-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "app_ride_offers",
        filter: `driver_id=eq.${userId}`,
      },
      (payload) => {
        supabaseEvents.emit("ride_offer_insert", payload.new as any);
      },
    )
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "app_ride_offers",
        filter: `driver_id=eq.${userId}`,
      },
      (payload) => {
        supabaseEvents.emit("ride_offer_update", payload.new as any);
      },
    )
    .subscribe();

  return RideOfferEventChannel;
}

/**
 * 🔴 STOP ONLY ride offer LISTENER
 */
export function stopRideOfferEvents() {
  if (!RideOfferEventChannel) return;
  RideOfferEventChannel.unsubscribe();
  RideOfferEventChannel = null;
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
  stopRideOfferEvents();
}
