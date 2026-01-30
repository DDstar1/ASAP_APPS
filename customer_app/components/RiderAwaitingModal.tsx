import { upsertDeliveryOrder } from "@/lib/supabase-app-functions";
import { reverseGeocode } from "@/utils/mapUtils";
import { Coordinates } from "@/utils/my_types";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Modal, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  interpolate,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

type Props = {
  visible: boolean;
  onClose: () => void;
  pickup_lat: number;
  pickup_long: number;
  pickup_name: string;
  dropoff_lat: number;
  dropoff_long: number;
  dropoff_name: string;
  image_url?: string;
  waypoints?: Coordinates[] | null;
};

export default function RiderAwaitingModal({
  visible,
  onClose,
  pickup_lat,
  pickup_long,
  pickup_name,
  dropoff_lat,
  dropoff_long,
  dropoff_name,
  image_url,
  waypoints,
}: Props) {
  // -------------------------
  // STATE
  // -------------------------
  const [pickupName, setPickupName] = useState<string | null>(
    pickup_name ?? null,
  );
  const [dropoffName, setDropoffName] = useState<string | null>(
    dropoff_name ?? null,
  );

  const progress1 = useSharedValue(0);
  const progress2 = useSharedValue(0);
  const progress3 = useSharedValue(0);

  const orderCodeRef = useRef(`asap-${Date.now()}`);

  // -------------------------
  // Sync state if props change
  // -------------------------
  useEffect(() => {
    setPickupName(pickup_name ?? null);
  }, [pickup_name]);

  useEffect(() => {
    setDropoffName(dropoff_name ?? null);
  }, [dropoff_name]);

  // -------------------------
  // Poll backend for rider acceptance
  // -------------------------
  useEffect(() => {
    if (!visible) return;

    const init = async () => {
      let finalPickupName = pickupName;
      let finalDropoffName = dropoffName;
      const checkPickup = pickupName?.toLowerCase().trim() || "";
      if (
        checkPickup.includes("current location") ||
        checkPickup.includes("(saved)") ||
        !pickupName
      ) {
        finalPickupName = await reverseGeocode(pickup_lat, pickup_long);
        setPickupName(finalPickupName);
      }

      const checkDropoff = dropoffName?.toLowerCase().trim() || "";
      if (
        checkDropoff.includes("current location") ||
        checkDropoff.includes("(saved)") ||
        !dropoffName
      ) {
        finalDropoffName = await reverseGeocode(dropoff_lat, dropoff_long);
        setDropoffName(finalDropoffName);
      }

      console.log(checkPickup);
      console.log(checkDropoff);

      // Now start interval after names are ready
      orderCodeRef.current = `asap-${Date.now()}`;
      const interval = setInterval(async () => {
        const result = await upsertDeliveryOrder({
          order_code: orderCodeRef.current,
          image_url,
          pickup_lat,
          pickup_long,
          pickup_name: finalPickupName,
          dropoff_lat,
          dropoff_long,
          dropoff_name: finalDropoffName,
          status: "pending",
          waypoints,
        });

        if (result?.status === "accepted") {
          router.replace({
            pathname: "/trackPackage/[order_code]",
            params: { order_code: orderCodeRef.current },
          });
          onClose();
        }
      }, 2000);

      return () => clearInterval(interval);
    };

    init();
  }, [visible]); // <-- only run when modal becomes visible

  // -------------------------
  // Wave animation
  // -------------------------
  useEffect(() => {
    if (visible) {
      progress1.value = withRepeat(
        withTiming(1, { duration: 3000 }),
        -1,
        false,
      );

      setTimeout(() => {
        progress2.value = withRepeat(
          withTiming(1, { duration: 3000 }),
          -1,
          false,
        );
      }, 1000);

      setTimeout(() => {
        progress3.value = withRepeat(
          withTiming(1, { duration: 3000 }),
          -1,
          false,
        );
      }, 2000);
    } else {
      progress1.value = 0;
      progress2.value = 0;
      progress3.value = 0;
    }
  }, [visible]);

  // -------------------------
  // Animated circle styles
  // -------------------------
  const getCircleStyle = (progress: SharedValue<number>) =>
    useAnimatedStyle(() => ({
      transform: [{ scale: interpolate(progress.value, [0, 1], [0, 4]) }],
      opacity: interpolate(progress.value, [0, 1], [0.5, 0]),
    }));

  const circle1 = getCircleStyle(progress1);
  const circle2 = getCircleStyle(progress2);
  const circle3 = getCircleStyle(progress3);

  // -------------------------
  // UI
  // -------------------------
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
          Awaiting rider confirmation…
        </Text>
        <Text className="text-gray-400 text-sm mt-2 text-center">
          Please wait while we find nearby riders
        </Text>
      </View>
    </Modal>
  );
}
