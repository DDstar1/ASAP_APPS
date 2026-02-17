import { IMAGES } from "@/assets/assetsData";
import CodeInputComponent from "@/components/CodeInputComponent";
import AvailableOrdersDropdown from "@/components/AvailableOrdersDropdown";
import { LinearGradient } from "expo-linear-gradient";
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Alert, Image, StatusBar, Text, View } from "react-native";
import { Switch } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  acceptDeliveryOrder,
  updateRiderActiveMode,
  updateRiderLocation,
  verifyDeliveryCode,
} from "@/lib/supabase-functions";
import { useRiderOrdersStore } from "@/store/useDeliveryOrdersStore";
import { useCurrentDeliveryStore } from "@/store/useCurrentDeliveriesStore";
import {
  startTracking,
  stopTracking,
} from "@/utils/utils_orderLocationTracking";

const RiderHomeScreen = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [showOrders, setShowOrders] = useState(false);
  const locationSubscription = useRef<Location.LocationSubscription | null>(
    null,
  );

  // ✅ Use the store hooks properly
  const { availableOrders, loading, fetchAvailableOrders } =
    useRiderOrdersStore();
  const {
    currentDeliveries,
    addCurrentDelivery,
    updateDeliveryStatus,
    fetchCurrentDeliveries,
  } = useCurrentDeliveryStore();

  // ✅ Fetch data on mount
  useEffect(() => {
    fetchAvailableOrders();
    fetchCurrentDeliveries();
  }, []);

  // Check if rider has ongoing deliveries
  const hasOngoingDeliveries = currentDeliveries.length > 0;
  const activeDelivery = currentDeliveries[0]; // Get the first active delivery

  const toggleDropdown = () => setShowOrders((prev) => !prev);

  // Start real-time location updates
  const startRealtimeLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      alert("Location permission is required for online mode.");
      setIsOnline(false);
      return;
    }

    console.log("Starting location tracking...");

    locationSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Highest,
        distanceInterval: 0, // update every 5 meters
        timeInterval: 5000, // update at least every 5 seconds
      },
      async (location) => {
        try {
          const { latitude, longitude } = location.coords;
          await updateRiderLocation(latitude, longitude);
        } catch (err) {
          console.error("Failed to update rider location:", err);
        }
      },
    );
  };

  // Stop location updates
  const stopRealtimeLocation = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
  };

  // Watch the switch
  useEffect(() => {
    if (isOnline) startRealtimeLocation();
    else stopRealtimeLocation();
    updateRiderActiveMode(isOnline);

    return () => stopRealtimeLocation(); // Cleanup on unmount
  }, [isOnline]);

  // Handle order acceptance
  const handleAcceptOrder = async (orderCode: string) => {
    try {
      // 1️⃣ Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Location permission is required to accept this order.",
        );
        return;
      }

      // 2️⃣ Get current location
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const { latitude, longitude } = location.coords;

      // 3️⃣ Accept order
      const result = await acceptDeliveryOrder(orderCode, latitude, longitude);

      console.log("Accept Order Result:", result);

      if (result.success && result.data.length > 0) {
        const order = result.data[0];

        // 4️⃣ Add delivery directly to store
        addCurrentDelivery(result.data);

        startTracking(order.id); // Start background location tracking for this delivery

        // 5️⃣ Notify + navigate
        Alert.alert("Order Accepted", "You have accepted this delivery!", [
          {
            text: "OK",
            onPress: () => {
              router.push({
                pathname: "/(tabs)/deliveries",
                params: {
                  newlyAcceptedId: order.id,
                  time_added: Date.now(),
                },
              });
            },
          },
        ]);
      } else {
        Alert.alert("Failed", result.error || "Could not accept order");
      }
    } catch (err) {
      console.error("Error accepting order:", err);
      Alert.alert("Error", "Failed to accept order. Try again.");
    }
  };

  // Handle code submission
  const handleSubmitCode = async (code: string, type: "pickup" | "dropoff") => {
    if (!activeDelivery) return;

    try {
      // ✅ Single unified function call
      const result = await verifyDeliveryCode(activeDelivery.id, code, type);

      if (result.success) {
        // Update delivery status in store with verification flag
        const newStatus = type === "pickup" ? "in_transit" : "completed";
        const verificationUpdate =
          type === "pickup"
            ? { pickup_code_verified: true }
            : { dropoff_code_verified: true };

        updateDeliveryStatus(activeDelivery.id, newStatus, verificationUpdate);

        Alert.alert(
          "Code Authenticated ✓",
          `${type === "pickup" ? "Pickup" : "Dropoff"} code verified successfully!`,
          [
            {
              text: "OK",
              onPress: () => {
                router.replace("/(tabs)/home");
                if (type === "dropoff") {
                  stopTracking();
                  // Navigate to deliveries tab to show completion
                }
              },
            },
          ],
        );
      } else {
        Alert.alert(
          "Invalid Code",
          result.error || "The code you entered is incorrect.",
        );
      }
    } catch (error) {
      console.error("Error verifying code:", error);
      Alert.alert("Error", "Failed to verify code. Please try again.");
    }
  };

  return (
    <View className="flex-1 bg-white">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <LinearGradient
        colors={["#10B981", "#059669"]}
        className="relative"
        style={{ borderBottomRightRadius: 200, overflow: "hidden" }}
      >
        <SafeAreaView edges={["top"]} className="px-5 pb-10 pt-3">
          <View className="z-10">
            <View className="bg-orange-600/40 px-3 py-1 rounded-full self-start">
              <Text className="text-white text-sm font-semibold">Level 1</Text>
            </View>
            <Text className="text-3xl text-white font-bold mb-8">
              Partner Alex
            </Text>

            <Text className="text-white/70 text-[11px] tracking-wide mb-1">
              TOTAL EARNINGS
            </Text>
            <Text className="text-white text-5xl font-bold mb-2">₦157.34</Text>
          </View>
        </SafeAreaView>

        <Image
          source={IMAGES.riderIllustraion}
          className="absolute right-0 bottom-[-10px] w-52 h-52 opacity-90"
          resizeMode="contain"
        />
      </LinearGradient>

      {/* Body */}
      <View className="bg-gray-50 px-5 pt-6 pb-24">
        {/* Online/Offline Switch */}
        <View className="bg-white rounded-3xl p-5 mb-4 shadow-sm">
          <View className="flex-row justify-between items-center">
            <View className="flex-1">
              <Text className="text-lg font-bold text-gray-900 mb-1">
                Status: {isOnline ? "Online" : "Offline"}
              </Text>
              <Text className="text-sm text-gray-400">
                {isOnline
                  ? "You're available for new deliveries."
                  : "You're currently offline."}
              </Text>
            </View>
            <Switch
              value={isOnline}
              onValueChange={setIsOnline}
              thumbColor="white"
              trackColor={{ false: "#D1D5DB", true: "#10B981" }}
              style={{
                transform: [{ scaleX: 1.4 }, { scaleY: 1.4 }],
                marginRight: 30,
              }}
            />
          </View>
        </View>

        {/* Conditional Rendering: Code Input OR Available Orders */}
        {hasOngoingDeliveries ? (
          // Show Code Input Component when rider has ongoing deliveries
          <CodeInputComponent
            currentDelivery={activeDelivery}
            onSubmitCode={handleSubmitCode}
          />
        ) : (
          // Show Available Orders when rider has no ongoing deliveries
          <AvailableOrdersDropdown
            availableOrders={availableOrders}
            showOrders={showOrders}
            onToggle={toggleDropdown}
            onAcceptOrder={handleAcceptOrder}
          />
        )}
      </View>
    </View>
  );
};

export default RiderHomeScreen;
