import { IMAGES } from "@/assets/assetsData";
import CodeInputComponent from "@/components/CodeInputComponent";
import AvailableOrdersDropdown from "@/components/AvailableOrdersDropdown";
import PickupConfirmOTP from "@/components/PickupConfirmOTP";
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
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
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
  const [driverLat, setDriverLat] = useState<number | null>(null);
  const [driverLng, setDriverLng] = useState<number | null>(null);
  const [showOTPModal, setShowOTPModal] = useState(false);

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

  const distanceToDropoff =
    driverLat != null &&
    driverLng != null &&
    activeDelivery?.dropoff_lat != null &&
    activeDelivery?.dropoff_long != null
      ? (() => {
          const R = 6371000;
          const dLat = ((activeDelivery.dropoff_lat! - driverLat) * Math.PI) / 180;
          const dLon = ((activeDelivery.dropoff_long! - driverLng) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos((driverLat * Math.PI) / 180) *
              Math.cos((activeDelivery.dropoff_lat! * Math.PI) / 180) *
              Math.sin(dLon / 2) ** 2;
          return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        })()
      : Infinity;

  const canConfirmTrip = distanceToDropoff <= 100;

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
          setDriverLat(latitude);
          setDriverLng(longitude);
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

        {/* Confirm Trip button — always present, unlocks within 100m of dropoff */}
        <View
          style={{
            marginTop: 16,
            borderRadius: 20,
            overflow: "hidden",
            opacity: canConfirmTrip ? 1 : 0.45,
          }}
        >
          <TouchableOpacity
            onPress={() => setShowOTPModal(true)}
            disabled={!canConfirmTrip}
            activeOpacity={0.85}
            style={{
              backgroundColor: canConfirmTrip ? "#ff923e" : "#1c2a42",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              paddingVertical: 16,
              borderRadius: 20,
              borderWidth: canConfirmTrip ? 0 : 1,
              borderColor: "#2a3a55",
            }}
          >
            <MaterialIcons
              name="verified"
              size={20}
              color={canConfirmTrip ? "#000" : "#a5abbd"}
            />
            <Text
              style={{
                fontWeight: "700",
                fontSize: 14,
                color: canConfirmTrip ? "#000" : "#a5abbd",
              }}
            >
              {canConfirmTrip ? "CONFIRM TRIP" : "CONFIRM TRIP  ·  Move to dropoff"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {activeDelivery && (
        <PickupConfirmOTP
          visible={showOTPModal}
          onClose={() => setShowOTPModal(false)}
          orderRef={activeDelivery.order_code}
          driverId={user?.id ?? ""}
          dropoffLat={activeDelivery.dropoff_lat ?? 0}
          dropoffLng={activeDelivery.dropoff_long ?? 0}
          driverLat={driverLat}
          driverLng={driverLng}
          onSuccess={() => {
            setShowOTPModal(false);
            useAcceptedDeliveryStore
              .getState()
              .removeAcceptedDelivery(activeDelivery.id);
            setHasOngoingDeliveries(false);
            stopTracking();
          }}
        />
      )}
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
