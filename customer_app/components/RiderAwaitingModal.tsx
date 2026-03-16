import { upsertDeliveryOrder } from "@/lib/supabase-app-functions";
import { reverseGeocode } from "@/utils/mapUtils";
import { Coordinates } from "@/utils/my_types";
import { generateConfirmationCodes, generateOrderCode } from "@/utils/my_utils";
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
import { useCustomerDeliveryStore } from "@/store/useCustomerDeliveriesStore";

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
  initial_waypoints?: Coordinates[] | null;
  package_type: string;
  package_description: string;
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
  initial_waypoints,
  package_type,
  package_description,
}: Props) {
  const progress1 = useSharedValue(0);
  const progress2 = useSharedValue(0);
  const progress3 = useSharedValue(0);

  const orderCodeRef = useRef("");
  const dropoffCodeRef = useRef("");
  const pickupCodeRef = useRef("");

  const [resolvedPickupName, setResolvedPickupName] = useState<string | null>(
    null,
  );
  const [resolvedDropoffName, setResolvedDropoffName] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (!visible) return;

    let interval: any;

    const init = async () => {
      // ✅ Read directly from props, not from state
      let finalPickupName = pickup_name ?? null;
      let finalDropoffName = dropoff_name ?? null;

      const checkPickup = pickup_name?.toLowerCase().trim() || "";
      if (
        checkPickup.includes("current location") ||
        checkPickup.includes("(saved)") ||
        !pickup_name
      ) {
        finalPickupName = await reverseGeocode(pickup_lat, pickup_long);
      }

      const checkDropoff = dropoff_name?.toLowerCase().trim() || "";
      if (
        checkDropoff.includes("current location") ||
        checkDropoff.includes("(saved)") ||
        !dropoff_name
      ) {
        finalDropoffName = await reverseGeocode(dropoff_lat, dropoff_long);
      }

      // Update display state after resolution
      setResolvedPickupName(finalPickupName);
      setResolvedDropoffName(finalDropoffName);

      // Generate codes
      orderCodeRef.current = generateOrderCode();
      dropoffCodeRef.current = generateConfirmationCodes("delivery");
      pickupCodeRef.current = generateConfirmationCodes("pickup");

      const deliveryPayload = {
        order_code: orderCodeRef.current,
        dropoff_code: dropoffCodeRef.current,
        pickup_code: pickupCodeRef.current,
        image_url,
        pickup_lat,
        pickup_long,
        pickup_name: finalPickupName,
        dropoff_lat,
        dropoff_long,
        dropoff_name: finalDropoffName,
        status: "pending",
        initial_waypoints,
        package_type,
        package_description,
      };

      // First upsert
      const firstResult = await upsertDeliveryOrder(deliveryPayload);
      console.log("Initial upsert result:", firstResult.data);

      if (firstResult) {
        useCustomerDeliveryStore.getState().addNewDelivery(firstResult.data);
      }

      // Start polling
      interval = setInterval(async () => {
        const result = await upsertDeliveryOrder(deliveryPayload);

        if (result?.status === "arriving_pickup") {
          useCustomerDeliveryStore
            .getState()
            .updateDeliveryStatus(result.id, "arriving_pickup");

          clearInterval(interval);

          router.replace({
            pathname: "/trackPackage",
            params: { order_code: orderCodeRef.current },
          });

          onClose();
        }
      }, 2000);
    };

    init();

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [visible]);

  // Animation
  useEffect(() => {
    if (visible) {
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
  }, [visible]);

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

        {/* Optional: show resolved names for confirmation */}
        {(resolvedPickupName || resolvedDropoffName) && (
          <View className="mt-6 px-8 gap-1">
            {resolvedPickupName && (
              <Text
                className="text-gray-400 text-xs text-center"
                numberOfLines={1}
              >
                📍 From: {resolvedPickupName}
              </Text>
            )}
            {resolvedDropoffName && (
              <Text
                className="text-gray-400 text-xs text-center"
                numberOfLines={1}
              >
                🏁 To: {resolvedDropoffName}
              </Text>
            )}
          </View>
        )}
      </View>
    </Modal>
  );
}
