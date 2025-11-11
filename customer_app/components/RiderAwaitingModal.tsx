import React, { useEffect, useRef, useState } from "react";
import { Modal, View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from "react-native-reanimated";
import { upsertDeliveryOrder } from "@/lib/supabase-app-functions";
import { router } from "expo-router";
import { Coordinates } from "@/utils/my_types";

type Props = {
  visible: boolean;
  onClose: () => void;
  pickup_lat: number;
  pickup_long: number;
  dropoff_lat: number;
  dropoff_long: number;
  image_url?: string;
  waypoints?: Coordinates[] | null;
};

export default function RiderAwaitingModal({
  visible,
  onClose,
  pickup_lat,
  pickup_long,
  dropoff_lat,
  dropoff_long,
  image_url,
  waypoints,
}: Props) {
  const progress1 = useSharedValue(0);
  const progress2 = useSharedValue(0);
  const progress3 = useSharedValue(0);
  const orderCodeRef = useRef(`asap-${Date.now()}`);

  useEffect(() => {
    if (!visible) return;

    orderCodeRef.current = `asap-${Date.now()}`;

    const interval = setInterval(async () => {
      try {
        const result = await upsertDeliveryOrder({
          order_code: orderCodeRef.current,
          pickup_lat,
          pickup_long,
          dropoff_lat,
          dropoff_long,
          status: "pending", // always pending for polling
          waypoints,
        });

        console.log("orderCodeRef.current", orderCodeRef.current);

        // If the order becomes accepted, close the modal automatically
        if (result?.status === "accepted") {
          console.log("🚀 Delivery accepted by driver:", result.driver_id);
          // Navigate to tracking page with the order_code as a param
          router.replace({
            pathname: "/trackPackage/[order_code]",
            params: { order_code: orderCodeRef.current },
          });
          onClose();
        } else {
          console.log("⏳ Waiting for driver to accept...");
        }
      } catch (err) {
        console.error("❌ Error polling/upserting delivery:", err);
      }
    }, 2000); // every 5 seconds

    // Cleanup when modal hidden or unmounted
    return () => clearInterval(interval);
  }, [visible]);

  // Wave animation
  useEffect(() => {
    if (visible) {
      progress1.value = withRepeat(
        withTiming(1, { duration: 3000 }),
        -1,
        false
      );
      setTimeout(
        () =>
          (progress2.value = withRepeat(
            withTiming(1, { duration: 3000 }),
            -1,
            false
          )),
        1000
      );
      setTimeout(
        () =>
          (progress3.value = withRepeat(
            withTiming(1, { duration: 3000 }),
            -1,
            false
          )),
        2000
      );
    } else {
      progress1.value = 0;
      progress2.value = 0;
      progress3.value = 0;
    }
  }, [visible]);

  const getCircleStyle = (progress: any) =>
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
        <TouchableOpacity
          onPress={onClose}
          className="absolute top-12 right-6 p-3 bg-black/80 rounded-full z-50"
        >
          <Text className="text-white text-2xl">✕</Text>
        </TouchableOpacity>

        <View className="justify-center items-center">
          <Animated.View
            style={[
              {
                position: "absolute",
                width: 150,
                height: 150,
                borderRadius: 75,
                backgroundColor: "#F97316",
              },
              circle1,
            ]}
          />
          <Animated.View
            style={[
              {
                position: "absolute",
                width: 150,
                height: 150,
                borderRadius: 75,
                backgroundColor: "#F97316",
              },
              circle2,
            ]}
          />
          <Animated.View
            style={[
              {
                position: "absolute",
                width: 150,
                height: 150,
                borderRadius: 75,
                backgroundColor: "#F97316",
              },
              circle3,
            ]}
          />

          <View className="justify-center items-center p-5 bg-gray-400 rounded-full">
            <Ionicons name="search" size={70} color="white" />
          </View>
        </View>

        <Text className="text-white text-xl mt-10 font-semibold text-center">
          Awaiting for rider confirmation…
        </Text>
        <Text className="text-gray-400 text-sm mt-2 text-center">
          Please wait while we find nearby riders
        </Text>
      </View>
    </Modal>
  );
}
