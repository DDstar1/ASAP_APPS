import { cancelPaidOrder } from "@/lib/payments";
import { supabaseEvents } from "@/lib/supabase";
import {
  getDeliveryOrderById,
  getDeliveryOrderByReference,
} from "@/lib/supabase-app-functions";
import { GeoPointJson, requestRide } from "@/lib/ride-request";
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
  View,
} from "react-native";
import Animated, {
  interpolate,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

// Backstop in case Rust never marks the order no_driver. Keep it at or above
// the length of Rust's driver search.
const SEARCH_TIMEOUT_MS = 3 * 60 * 1000;

type Props = {
  visible: boolean;
  paymentReference: string;
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

export default function RiderAwaitingModal({
  visible,
  paymentReference,
  pickup,
  dropoff,
  pickupName,
  dropoffName,
  onClose,
  onRiderFound,
  onCancelled,
}: Props) {
  const progress1 = useSharedValue(0);
  const progress2 = useSharedValue(0);
  const progress3 = useSharedValue(0);

  const [phase, setPhase] = useState<Phase>("searching");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  // Bumped by "Try again" to restart the search with the same payment
  const [attempt, setAttempt] = useState(0);
  const [cancelling, setCancelling] = useState(false);
  // Stops a rider being "found" while the cancel request is in flight
  const cancellingRef = useRef(false);

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;
    let orderId: number | null = null;
    let settled = false;
    setPhase("searching");

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

      // Rust replies only after the driver search ends (assigned or
      // declined), so the row tells us which
      const { ok, error } = await requestRide({
        source: "app",
        rider_id: user.id,
        pick_up: pickup,
        drop_off: dropoff,
        ride_type: rideType,
        payment_method: "korapay",
        items,
        order_ref: null,
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

      // Search finished without a rider on the row: declined / none found
      noRiders();
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

            // The deliveries store picks up the cancelled status via realtime.
            // A rider may have accepted just before the cancel, so go by
            // what Rust actually refunded.
            Alert.alert(
              "Delivery cancelled",
              data.refund_amount == null
                ? "Your delivery has been cancelled. Any refund due will go to your payment method."
                : data.refund_amount > 0
                  ? `₦${data.refund_amount.toLocaleString()} will be refunded to your payment method.`
                  : "A rider had just accepted, so no refund is due.",
            );
            onCancelled();
          },
        },
      ],
    );
  };

  const cancelButton = (
    <TouchableOpacity
      onPress={cancelOrder}
      disabled={cancelling}
      className="h-12 px-6 rounded-full border border-red-500/60 justify-center items-center"
    >
      {cancelling ? (
        <ActivityIndicator color="#F87171" />
      ) : (
        <Text className="text-red-400 font-semibold">Cancel & refund</Text>
      )}
    </TouchableOpacity>
  );

  // Animation
  useEffect(() => {
    if (visible && phase === "searching") {
      progress1.value = withRepeat(withTiming(1, { duration: 3000 }), -1);
      setTimeout(() => {
        progress2.value = withRepeat(withTiming(1, { duration: 3000 }), -1);
      }, 1000);
      setTimeout(() => {
        progress3.value = withRepeat(withTiming(1, { duration: 3000 }), -1);
      }, 2000);
    } else {
      progress1.value = 0;
      progress2.value = 0;
      progress3.value = 0;
    }
  }, [visible, phase]);

  const getCircleStyle = (progress: SharedValue<number>) =>
    useAnimatedStyle(() => ({
      transform: [{ scale: interpolate(progress.value, [0, 1], [0, 4]) }],
      opacity: interpolate(progress.value, [0, 1], [0.5, 0]),
    }));

  const circle1 = getCircleStyle(progress1);
  const circle2 = getCircleStyle(progress2);
  const circle3 = getCircleStyle(progress3);

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/90 justify-center items-center">
        {phase === "searching" && (
          <>
            <TouchableOpacity
              onPress={onClose}
              className="absolute top-12 right-6 p-3 bg-black/80 rounded-full z-50"
            >
              <Text className="text-white text-2xl">✕</Text>
            </TouchableOpacity>

            <View className="justify-center items-center">
              {[circle1, circle2, circle3].map((circle, i) => (
                <Animated.View
                  key={i}
                  style={[
                    {
                      position: "absolute",
                      width: 150,
                      height: 150,
                      borderRadius: 75,
                      backgroundColor: "#F97316",
                    },
                    circle,
                  ]}
                />
              ))}

              <View className="justify-center items-center p-5 bg-gray-400 rounded-full">
                <Ionicons name="search" size={70} color="white" />
              </View>
            </View>

            <Text className="text-white text-xl mt-10 font-semibold text-center">
              Awaiting rider confirmation…
            </Text>
            <Text className="text-gray-400 text-sm mt-2 text-center">
              Please wait while we find nearby riders
            </Text>

            {(pickupName || dropoffName) && (
              <View className="mt-6 px-8 gap-1">
                {pickupName && (
                  <Text
                    className="text-gray-400 text-xs text-center"
                    numberOfLines={1}
                  >
                    📍 From: {pickupName}
                  </Text>
                )}
                {dropoffName && (
                  <Text
                    className="text-gray-400 text-xs text-center"
                    numberOfLines={1}
                  >
                    🏁 To: {dropoffName}
                  </Text>
                )}
              </View>
            )}

            <View className="mt-10">{cancelButton}</View>
          </>
        )}

        {phase !== "searching" && (
          <View className="px-8 items-center gap-3">
            <View className="p-5 bg-gray-700 rounded-full">
              <Ionicons
                name={phase === "no_riders" ? "bicycle" : "alert-circle"}
                size={60}
                color="white"
              />
            </View>
            <Text className="text-white text-xl font-semibold text-center mt-4">
              {phase === "no_riders"
                ? "No riders found"
                : "Couldn't request a rider"}
            </Text>
            <Text className="text-gray-400 text-sm text-center">
              {phase === "no_riders"
                ? "No rider accepted your delivery. You can try again now."
                : errorMessage}
            </Text>

            <View className="flex-row gap-3 mt-6">
              {/* Already paid, so leaving here means a refund, not just going back */}
              {cancelButton}
              <TouchableOpacity
                onPress={() => setAttempt((a) => a + 1)}
                className="h-12 px-6 rounded-full bg-[#EE7F3A] justify-center"
              >
                <Text className="text-white font-semibold">Try again</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}
