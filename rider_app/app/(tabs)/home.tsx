import { IMAGES } from "@/assets/assetsData";
import CodeInputComponent from "@/components/CodeInputComponent";
import AvailableOrdersDropdown from "@/components/AvailableOrdersDropdown";
import * as Location from "expo-location";
import { router } from "expo-router";
import { PulseDot } from "@/components/PulseDot";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  View,
} from "react-native";
import { Switch } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  updateRiderActiveMode,
  updateRiderLocation,
  verifyDeliveryCode,
} from "@/lib/supabase-app-functions";

import { useRiderOrdersStore } from "@/store/useDeliveryOrdersStore";
import { useAcceptedDeliveryStore } from "@/store/useAcceptedDeliveriesStore";
import { stopTracking } from "@/utils/utils_orderLocationTracking";
import { useUserStore } from "@/store/useUserStore";

const RiderHomeScreen = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [showOrders, setShowOrders] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [hasOngoingDeliveries, setHasOngoingDeliveries] = useState(false);

  const locationSubscription = useRef<Location.LocationSubscription | null>(
    null,
  );

  const { user, fetchUserSession, setUser } = useUserStore();

  const { availableOrders, fetchAvailableOrders } = useRiderOrdersStore();
  const { AcceptedDeliveries, updateDeliveryStatus, fetchAcceptedDeliveries } =
    useAcceptedDeliveryStore();

  useEffect(() => {
    fetchAvailableOrders();
    fetchAcceptedDeliveries();
    fetchUserSession();
  }, []);

  useEffect(() => {
    const hasOngoing = AcceptedDeliveries.some((d) => d.status !== "delivered");
    setHasOngoingDeliveries(hasOngoing);
    if (!hasOngoing) stopTracking();
  }, [AcceptedDeliveries]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchAvailableOrders(),
      fetchAcceptedDeliveries(),
      fetchUserSession(),
    ]);
    setRefreshing(false);
  };

  const activeDelivery =
    AcceptedDeliveries.find((d) => d.status !== "delivered") || null;

  const toggleDropdown = () => setShowOrders((prev) => !prev);

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

  const handleSubmitCode = async (code: string, type: "pickup" | "dropoff") => {
    if (!activeDelivery) return;
    try {
      const result = await verifyDeliveryCode(activeDelivery.id, code, type);
      if (result.success) {
        const newStatus = type === "pickup" ? "in_transit" : "delivered";
        const verificationUpdate =
          type === "pickup"
            ? { pickup_code_verified: true }
            : { dropoff_code_verified: true };

        updateDeliveryStatus(activeDelivery.id, newStatus, verificationUpdate);

        if (type === "dropoff") {
          useAcceptedDeliveryStore
            .getState()
            .removeAcceptedDelivery(activeDelivery.id);
          setHasOngoingDeliveries(false);
          stopTracking();
        }

        Alert.alert(
          "Code Authenticated ✓",
          `${type === "pickup" ? "Pickup" : "Dropoff"} verified successfully!`,
          [{ text: "OK", onPress: () => router.replace("/(tabs)/home") }],
        );
      } else {
        Alert.alert("Invalid Code", result.error || "The code is incorrect.");
      }
    } catch (error) {
      console.error("Error verifying code:", error);
      Alert.alert("Error", "Failed to verify code.");
    }
  };

  return (
    <View className="flex-1 bg-[#080e1c]">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="bg-[#181f42] overflow-hidden rounded-br-[200px]">
        <SafeAreaView edges={["top"]} className="px-10 pb-10 pt-14">
          {/* Orange accent bar */}
          <View className="w-8 h-[3px] bg-[#ff923e] rounded-full mb-4" />

          <Text className="text-[#e0e5f9] text-3xl font-bold mb-6">
            Partner {user?.username ?? "USER"}
          </Text>

          <Text className="text-[#a5abbd] text-[11px] tracking-widest mb-1">
            TOTAL EARNINGS
          </Text>

          <Text className="text-[#ff923e] text-5xl font-bold mb-2">
            ₦157.34
          </Text>
        </SafeAreaView>

        <Image
          source={IMAGES.riderIllustraion}
          className="absolute right-0 bottom-[-10px] w-52 h-52 opacity-50"
          resizeMode="contain"
        />
      </View>

      {/* Stats Card */}
      <View className="mx-4 mt-8 p-5 rounded-3xl bg-[#121a2b]">
        <View className="flex-row justify-between gap-2">
          <Stat label="Orders" value="142" />
          <Stat label="Level" value="1" highlight />
          <Stat label="Online" value="38h" />
        </View>
      </View>

      {/* Body */}
      <ScrollView
        className="bg-[#080e1c]"
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 24,
          paddingBottom: 96,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ff923e"
            colors={["#ff923e"]}
          />
        }
      >
        {/* Online Switch Card */}
        <View className="bg-[#0f1626] rounded-3xl p-5 mb-4">
          <View className="flex-row justify-between items-center">
            <View className="flex-1">
              {/* Status row with dot */}
              <View className="flex-row items-center gap-2 mb-1.5">
                <PulseDot isOnline={isOnline} />
                <Text className="text-[#e0e5f9] text-base font-bold">
                  {isOnline ? "Online" : "Offline"}
                </Text>
              </View>
              <Text className="text-[#a5abbd] text-sm">
                {isOnline
                  ? "You're available for new deliveries."
                  : "You're currently offline."}
              </Text>
            </View>

            <Switch
              value={isOnline}
              onValueChange={setIsOnline}
              thumbColor="#e0e5f9"
              trackColor={{ false: "#2a3245", true: "#ff923e" }}
              style={{
                transform: [{ scaleX: 1.4 }, { scaleY: 1.4 }],
                marginRight: 30,
              }}
            />
          </View>
        </View>

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
          />
        )}
      </ScrollView>
    </View>
  );
};

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View
      className={`flex-1 p-3 rounded-2xl ${
        highlight ? "bg-[#ff923e]" : "bg-[#0f1626]"
      }`}
    >
      <Text
        className={`text-xs ${highlight ? "text-[#1a0a00]" : "text-[#a5abbd]"}`}
      >
        {label}
      </Text>
      <Text
        className={`text-lg font-bold ${
          highlight ? "text-[#1a0a00]" : "text-[#e0e5f9]"
        }`}
      >
        {value}
      </Text>
    </View>
  );
}

export default RiderHomeScreen;
