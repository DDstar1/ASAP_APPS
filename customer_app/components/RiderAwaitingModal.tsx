import { cancelledOrderMessage, cancelPaidOrder } from "@/lib/payments";
import { supabaseEvents } from "@/lib/supabase";
import {
  getDeliveryOrderById,
  getDeliveryOrderByReference,
} from "@/lib/supabase-app-functions";
import {
  GeoPointJson,
  requestRide,
  restartDriverSearch,
} from "@/lib/ride-request";
import { useCustomerDeliveryStore } from "@/store/useCustomerDeliveriesStore";
import { useRideDraftStore } from "@/store/useRideDraftStore";
import { useUserStore } from "@/store/useUserStore";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Modal,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BikeMarker, Radar, RADAR_ORANGE, RadarSpot } from "./Radar";

// Backstop in case Rust never marks the order no_driver. Kept above Rust's
// 30-minute driver search so the row, not this timer, normally ends the wait.
const SEARCH_TIMEOUT_MS = 31 * 60 * 1000;
// Cancelling mid-search only shows once the search has had a fair go
const CANCEL_AFTER_MS = 5 * 60 * 1000;

type Props = {
  visible: boolean;
  paymentReference: string;
  // app_delivery_orders.order_ref from create_order; ride-request needs it
  orderRef: string;
  pickup: GeoPointJson;
  dropoff: GeoPointJson;
  pickupName: string | null;
  dropoffName: string | null;
  onClose: () => void;
  // Rider details are shown on trackPackage
  onRiderFound: (orderId: number) => void;
  // The customer cancelled and Rust accepted the refund
  onCancelled: () => void;
};

type Phase = "searching" | "no_riders" | "error";

// Illustrative only, not real rider positions: degrees clockwise from north,
// and distance as a fraction of the radar's radius
const BIKE_SPOTS = [
  [-50, 0.62],
  [25, 0.9],
  [110, 0.55],
  [160, 0.86],
  [215, 0.66],
  [290, 0.88],
];

export default function RiderAwaitingModal({
  visible,
  paymentReference,
  orderRef,
  pickup,
  dropoff,
  pickupName,
  dropoffName,
  onClose,
  onRiderFound,
  onCancelled,
}: Props) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const radarSize = Math.min(width - 48, 340);

  const [phase, setPhase] = useState<Phase>("searching");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Bumped by "Try again" to restart the search with the same payment
  const [attempt, setAttempt] = useState(0);
  // After no_driver the request is already stored, so "Try again" restarts
  // the search; after an error the request itself is sent again
  const restartSearchRef = useRef(false);
  const [cancelling, setCancelling] = useState(false);
  // Stops a rider being "found" while the cancel request is in flight
  const cancellingRef = useRef(false);
  const [startedAt, setStartedAt] = useState(Date.now());
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!visible || phase !== "searching") return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [visible, phase]);

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;
    let orderId: number | null = null;
    let settled = false;
    setPhase("searching");
    setStartedAt(Date.now());
    setNow(Date.now());

    const riderFound = (id: number) => {
      if (settled || cancelled || cancellingRef.current) return;
      settled = true;
      useCustomerDeliveryStore
        .getState()
        .updateDeliveryStatus(String(id), "arriving_pickup");
      onRiderFound(id);
    };

    const noRiders = () => {
      if (settled || cancelled) return;
      settled = true;
      setPhase("no_riders");
    };

    const checkRow = (row: { driver_id?: string | null; status?: string }) => {
      if (orderId == null) return;
      if (row.driver_id) riderFound(orderId);
      else if (row.status === "no_driver") noRiders();
    };

    // Rust sets driver_id when a rider accepts, or status no_driver when
    // the search runs out
    const onUpdate = (row: any) => {
      if (orderId != null && Number(row.id) === orderId) checkRow(row);
    };
    supabaseEvents.on("delivery_update", onUpdate);

    // Catch changes missed while the app was in the background
    const refreshOrder = async () => {
      if (orderId == null) return;
      const { data } = await getDeliveryOrderById(orderId);
      if (data) checkRow(data as any);
    };
    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") refreshOrder();
    });

    const timeout = setTimeout(noRiders, SEARCH_TIMEOUT_MS);

    const start = async () => {
      const user = useUserStore.getState().user;
      const { items, rideType } = useRideDraftStore.getState();
      if (!user || !rideType) {
        settled = true;
        setErrorMessage("Your booking details were lost. Please book again.");
        setPhase("error");
        return;
      }

      // The order row already exists from Korapay initialize; watch it by
      // its reference since ride-request doesn't return the id
      const { data: order } = await getDeliveryOrderByReference(
        paymentReference,
      );
      if (cancelled) return;
      if (order) {
        orderId = Number(order.id);
        useCustomerDeliveryStore.getState().addNewDelivery(order as any);
        checkRow(order as any);
      }

      // Rust replies as soon as the search has started; the row tells us
      // how it ends (driver_id, or status no_driver)
      const { ok, error } = restartSearchRef.current
        ? await restartDriverSearch(orderRef)
        : await requestRide({
            source: "app",
            rider_id: user.id,
            pick_up: pickup,
            drop_off: dropoff,
            ride_type: rideType,
            payment_method: "korapay",
            items,
            order_ref: orderRef,
            user_id: null,
            user_phone_number: user.phone ?? null,
            vendor_phone_number: null,
            pickup_name: pickupName,
            dropoff_name: dropoffName,
            payment_reference: paymentReference,
          });
      if (cancelled || settled) return;

      if (orderId == null) {
        // The row may only have become visible after the request
        const { data: late } = await getDeliveryOrderByReference(
          paymentReference,
        );
        if (cancelled || settled) return;
        if (late) {
          orderId = Number(late.id);
          useCustomerDeliveryStore.getState().addNewDelivery(late as any);
        }
      }
      await refreshOrder();
      if (cancelled || settled) return;

      if (!ok) {
        settled = true;
        setErrorMessage(error ?? "Please try again.");
        setPhase("error");
        return;
      }

      // The search is running; keep waiting for the row (or the timeout)
    };

    start();

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      supabaseEvents.off("delivery_update", onUpdate);
      appStateSub.remove();
    };
  }, [visible, attempt]);

  // No rider has accepted yet, so Rust refunds in full
  const cancelOrder = () => {
    Alert.alert(
      "Cancel this delivery?",
      "You'll get a full refund to your payment method.",
      [
        { text: "Keep it", style: "cancel" },
        {
          text: "Cancel delivery",
          style: "destructive",
          onPress: async () => {
            cancellingRef.current = true;
            setCancelling(true);
            const { data, error } = await cancelPaidOrder(paymentReference);
            setCancelling(false);

            if (!data) {
              cancellingRef.current = false;
              Alert.alert("Couldn't cancel", error ?? "Please try again.");
              return;
            }

            // The deliveries store picks up the cancelled status via realtime
            Alert.alert(
              "Delivery cancelled",
              cancelledOrderMessage(data.refund_amount),
            );
            onCancelled();
          },
        },
      ],
    );
  };

  const searching = phase === "searching";
  const elapsed = Math.max(0, now - startedAt);
  const canCancel = !searching || elapsed >= CANCEL_AFTER_MS;

  const cancelButton = (
    <TouchableOpacity
      onPress={cancelOrder}
      disabled={cancelling}
      className="flex-1 h-14 rounded-full border border-red-500/60 justify-center items-center"
    >
      {cancelling ? (
        <ActivityIndicator color="#F87171" />
      ) : (
        <Text className="text-red-400 font-semibold">Cancel</Text>
      )}
    </TouchableOpacity>
  );

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black">
        {searching && (
          <TouchableOpacity
            onPress={onClose}
            accessibilityLabel="Hide"
            style={{ top: insets.top + 8 }}
            className="absolute right-5 w-11 h-11 rounded-full bg-[#2C2C30] justify-center items-center z-50"
          >
            <Ionicons name="chevron-down" size={22} color="white" />
          </TouchableOpacity>
        )}

        <View className="flex-1 justify-center items-center">
          {/* Remount per attempt so the bikes pop in again */}
          <Radar
            key={`${attempt}-${phase}`}
            size={radarSize}
            active={searching}
            center={
              <View
                className="w-16 h-16 rounded-full bg-[#1C1C21] justify-center items-center"
                style={{ borderWidth: 2, borderColor: searching ? RADAR_ORANGE : "#3A3A3F" }}
              >
                <Ionicons
                  name={searching ? "cube" : phase === "no_riders" ? "bicycle" : "alert-circle"}
                  size={28}
                  color={searching ? RADAR_ORANGE : "#9CA3AF"}
                />
              </View>
            }
          >
            {searching &&
              BIKE_SPOTS.map(([deg, r], i) => {
                const rad = (deg * Math.PI) / 180;
                const dist = (r * radarSize) / 2 - 22;
                return (
                  <RadarSpot
                    key={i}
                    x={Math.sin(rad) * dist}
                    y={-Math.cos(rad) * dist}
                    radarSize={radarSize}
                    width={40}
                    height={40}
                  >
                    <BikeMarker delay={600 + i * 1400} />
                  </RadarSpot>
                );
              })}
          </Radar>
        </View>

        <View
          className="bg-[#1C1C21] rounded-t-3xl px-6 pt-6 gap-5"
          style={{ paddingBottom: insets.bottom + 20 }}
        >
          <View className="gap-1.5">
            <Text className="text-white text-2xl font-bold">
              {searching
                ? "Finding your rider"
                : phase === "no_riders"
                  ? "No riders found"
                  : "Couldn't request a rider"}
            </Text>
            <Text className="text-gray-400 text-sm">
              {searching
                ? "We're asking riders near your pickup. This usually takes under 3 minutes."
                : phase === "no_riders"
                  ? "No rider accepted your delivery. You can try again now."
                  : errorMessage}
            </Text>
          </View>

          {(pickupName || dropoffName) && (
            <View className="bg-[#26262B] rounded-2xl px-4 py-3">
              <Stop icon="radio-button-on" color={RADAR_ORANGE} label={pickupName} />
              <View className="ml-[8px] h-3 border-l border-dashed border-gray-600" />
              <Stop icon="location" color="white" label={dropoffName} />
            </View>
          )}

          {/* Already paid, so leaving here means a refund, not just going back */}
          <View className="flex-row gap-3">
            {canCancel && cancelButton}
            {!searching && (
              <TouchableOpacity
                onPress={() => {
                  restartSearchRef.current = phase === "no_riders";
                  setAttempt((a) => a + 1);
                }}
                className="flex-1 h-14 rounded-full bg-[#FF7518] justify-center items-center"
              >
                <Text className="text-white font-semibold">Try again</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function Stop({
  icon,
  color,
  label,
}: {
  icon: "radio-button-on" | "location";
  color: string;
  label: string | null;
}) {
  return (
    <View className="flex-row items-center gap-3">
      <Ionicons name={icon} size={18} color={color} />
      <Text className="flex-1 text-white text-sm" numberOfLines={1}>
        {label || "—"}
      </Text>
    </View>
  );
}
