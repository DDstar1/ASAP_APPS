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
import { useAcceptedDeliveryStore } from "@/store/useAcceptedDeliveriesStore";

import {
  startTracking,
  stopTracking,
} from "@/utils/utils_orderLocationTracking";

const RiderHomeScreen = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [showOrders, setShowOrders] = useState(false);

  // ✅ Controlled state now
  const [hasOngoingDeliveries, setHasOngoingDeliveries] = useState(false);

  const locationSubscription = useRef<Location.LocationSubscription | null>(
    null,
  );

  const { availableOrders, fetchAvailableOrders } = useRiderOrdersStore();

  const {
    AcceptedDeliveries,
    addAcceptedDelivery,
    updateDeliveryStatus,
    fetchAcceptedDeliveries,
  } = useAcceptedDeliveryStore();

  // ------------------------------------------
  // Initial Fetch
  // ------------------------------------------
  useEffect(() => {
    fetchAvailableOrders();
    fetchAcceptedDeliveries();
  }, []);

  // ------------------------------------------
  // Sync hasOngoingDeliveries with store
  // ------------------------------------------
  useEffect(() => {
    setHasOngoingDeliveries(AcceptedDeliveries.length > 0);
  }, [AcceptedDeliveries]);

  const activeDelivery = AcceptedDeliveries[0];

  const toggleDropdown = () => setShowOrders((prev) => !prev);

  // ------------------------------------------
  // Location Tracking
  // ------------------------------------------
  const startRealtimeLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Permission Required", "Location permission is required.");
      setIsOnline(false);
      return;
    }

    locationSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.Highest,
        distanceInterval: 5,
        timeInterval: 5000,
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

  const stopRealtimeLocation = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
  };

  useEffect(() => {
    if (isOnline) startRealtimeLocation();
    else stopRealtimeLocation();

    updateRiderActiveMode(isOnline);

    return () => stopRealtimeLocation();
  }, [isOnline]);

  // ------------------------------------------
  // Accept Order
  // ------------------------------------------
  const handleAcceptOrder = async (orderCode: string) => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission required.");
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;

      const result = await acceptDeliveryOrder(orderCode, latitude, longitude);

      if (result.success && result.data.length > 0) {
        const order = result.data[0];

        addAcceptedDelivery(result.data);
        setHasOngoingDeliveries(true); // 👈 manually set true
        startTracking(order.id);

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

  // ------------------------------------------
  // Verify Code (Pickup / Dropoff)
  // ------------------------------------------
  const handleSubmitCode = async (code: string, type: "pickup" | "dropoff") => {
    if (!activeDelivery) return;

    try {
      const result = await verifyDeliveryCode(activeDelivery.id, code, type);

      if (result.success) {
        const newStatus = type === "pickup" ? "in_transit" : "completed";

        const verificationUpdate =
          type === "pickup"
            ? { pickup_code_verified: true }
            : { dropoff_code_verified: true };

        updateDeliveryStatus(activeDelivery.id, newStatus, verificationUpdate);

        // ✅ If dropoff confirmed → manually disable ongoing deliveries
        if (type === "dropoff") {
          // Remove completed delivery from store
          useAcceptedDeliveryStore
            .getState()
            .removeAcceptedDelivery(activeDelivery.id);
          setHasOngoingDeliveries(false);
          stopTracking();
        }

        Alert.alert(
          "Code Authenticated ✓",
          `${type === "pickup" ? "Pickup" : "Dropoff"} verified successfully!`,
          [
            {
              text: "OK",
              onPress: () => {
                router.replace("/(tabs)/home");
              },
            },
          ],
        );
      } else {
        Alert.alert("Invalid Code", result.error || "The code is incorrect.");
      }
    } catch (error) {
      console.error("Error verifying code:", error);
      Alert.alert("Error", "Failed to verify code.");
    }
  };

  // ------------------------------------------
  // UI
  // ------------------------------------------
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
        {/* Online Switch */}
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

        {/* Conditional Section */}
        {hasOngoingDeliveries ? (
          <CodeInputComponent
            currentDelivery={activeDelivery}
            onSubmitCode={handleSubmitCode}
            hasOngoingDeliveries={hasOngoingDeliveries}
          />
        ) : (
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
