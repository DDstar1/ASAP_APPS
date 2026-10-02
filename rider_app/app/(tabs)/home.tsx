import { IMAGES } from "@/assets/assetsData";
import CodeInputComponent from "@/components/CodeInputComponent";
import AvailableOrdersDropdown from "@/components/AvailableOrdersDropdown";
import PickupConfirmOTP from "@/components/PickupConfirmOTP";
import { RideOfferModal } from "@/components/RideOfferModal";
import * as Location from "expo-location";
import { router } from "expo-router";
import { PulseDot } from "@/components/PulseDot";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRiderEarnings } from "@/hooks/use-rider-earnings";
import { formatNaira } from "@/lib/earnings";
import {
  Alert,
  AppState,
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
  getDriverStatus,
  updateRiderActiveMode,
  updateRiderLocation,
  confirmRideDropoff,
} from "@/lib/supabase-app-functions";

import { supabaseEvents } from "@/lib/supabase";
import { useRiderOrdersStore } from "@/store/useDeliveryOrdersStore";
import { RiderOrder } from "@/utils/my_types";
import {
  isActiveStatus,
  useAcceptedDeliveryStore,
} from "@/store/useAcceptedDeliveriesStore";
import { stopTracking } from "@/utils/utils_orderLocationTracking";
import { useUserStore } from "@/store/useUserStore";

const RiderHomeScreen = () => {
  // Follows back_drivers.status (available/busy = online); starts offline
  // until the saved status has loaded
  const [isOnline, setIsOnline] = useState(false);
  const isOnlineRef = useRef(isOnline);
  isOnlineRef.current = isOnline;
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

  // Customer cancelled an order this rider is on. Before pickup it's simply
  // dropped; after pickup the rider takes the package back to the pickup point
  // and completes the return from the cancelled card in Deliveries.
  useEffect(() => {
    const onUpdate = (row: RiderOrder) => {
      if (row.status !== "cancelled" || row.driver_id !== user?.id) return;
      const { AcceptedDeliveries, removeAcceptedDelivery } =
        useAcceptedDeliveryStore.getState();
      if (!AcceptedDeliveries.some((d) => d.id === row.id)) return;

      if (row.is_pickup_code_authenticated) {
        // Move it to Completed and load the return so AT RETURN POINT shows
        useAcceptedDeliveryStore.getState().refreshAfterCancel();
        Alert.alert(
          "Order cancelled",
          `The customer cancelled #${row.order_code}. Please return the package to the pickup point, then tap AT RETURN POINT on the order in Deliveries and enter the sender's return code.`,
        );
        return;
      }

      removeAcceptedDelivery(row.id);
      Alert.alert(
        "Order cancelled",
        `The customer cancelled #${row.order_code}. You don't need to pick it up.`,
      );
    };
    supabaseEvents.on("delivery_update", onUpdate);
    return () => supabaseEvents.off("delivery_update", onUpdate);
  }, [user?.id]);

  useEffect(() => {
    const hasOngoing = AcceptedDeliveries.some((d) => isActiveStatus(d.status));
    setHasOngoingDeliveries(hasOngoing);
    if (!hasOngoing) stopTracking();
  }, [AcceptedDeliveries]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchAvailableOrders(),
      fetchAcceptedDeliveries(),
      fetchUserSession(),
      earnings.reload(), // tier or fees may have changed
    ]);
    setRefreshing(false);
  };

  const activeDelivery =
    AcceptedDeliveries.find((d) => isActiveStatus(d.status)) || null;

  const deliveredDeliveries = useMemo(
    () => AcceptedDeliveries.filter((d) => d.status === "delivered"),
    [AcceptedDeliveries],
  );
  const earnings = useRiderEarnings(deliveredDeliveries);

  // Delivered orders stay in the store (they feed the earnings and the
  // completed list); refetch to pick up dropoff_time
  const finishDelivery = (orderId: number) => {
    updateDeliveryStatus(orderId, "delivered");
    setHasOngoingDeliveries(false);
    stopTracking();
    fetchAcceptedDeliveries();
  };

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

  const hasLocationPermission = async (ask: boolean) => {
    const { status } = ask
      ? await Location.requestForegroundPermissionsAsync()
      : await Location.getForegroundPermissionsAsync();
    return status === "granted";
  };

  // Goes offline in the app and in Rust (e.g. location access was removed)
  const forceOffline = (message: string) => {
    setIsOnline(false);
    updateRiderActiveMode(false);
    Alert.alert("You're offline", message);
  };

  const startRealtimeLocation = async () => {
    try {
      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.Highest,
          distanceInterval: 5,
          timeInterval: 5000,
        },
        async (location) => {
          const { latitude, longitude } = location.coords;
          setDriverLat(latitude);
          setDriverLng(longitude);
          await updateRiderLocation(latitude, longitude);
        },
      );
    } catch (err) {
      // Location services switched off on the device
      console.error("Failed to start location updates:", err);
      forceOffline("Turn on location services to go online.");
    }
  };

  const stopRealtimeLocation = () => {
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }
  };

  // Location is only sent while online
  useEffect(() => {
    if (isOnline) startRealtimeLocation();
    else stopRealtimeLocation();
    return () => stopRealtimeLocation();
  }, [isOnline]);

  // On launch, pick up the saved status instead of forcing online. A driver
  // saved as online without location access is switched offline.
  useEffect(() => {
    (async () => {
      const status = await getDriverStatus();
      if (!status || status === "offline") return;
      if (await hasLocationPermission(false)) setIsOnline(true);
      else forceOffline("Location access is off, so you've been set offline.");
    })();
  }, []);

  // Location access can be removed in Settings while the app is in the
  // background; check again whenever the rider comes back
  useEffect(() => {
    const sub = AppState.addEventListener("change", async (state) => {
      if (state !== "active" || !isOnlineRef.current) return;
      if (!(await hasLocationPermission(false))) {
        forceOffline("Location access was turned off, so you've been set offline.");
      }
    });
    return () => sub.remove();
  }, []);

  const handleToggleOnline = async (online: boolean) => {
    if (online) {
      if (!(await hasLocationPermission(true))) {
        Alert.alert(
          "Location required",
          "Allow location access to go online and receive deliveries.",
        );
        return;
      }
    } else if (hasOngoingDeliveries) {
      Alert.alert(
        "Delivery in progress",
        "Finish your current delivery before going offline.",
      );
      return;
    }

    setIsOnline(online);
    const result = await updateRiderActiveMode(online);
    if (!result.success) {
      setIsOnline(!online);
      Alert.alert(
        "Couldn't update status",
        `You're still ${online ? "offline" : "online"}. Please try again.`,
      );
    }
  };

  // Dropoff only: the pickup code is entered by the sender in their app
  const handleSubmitCode = async (code: string) => {
    if (!activeDelivery) return;
    try {
      const result = await confirmRideDropoff(
        activeDelivery.order_code,
        user?.id ?? "",
        code,
      );
      if (result.success) {
        finishDelivery(activeDelivery.id);

        Alert.alert(
          "Code Authenticated ✓",
          "Dropoff verified successfully!",
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
            {earnings.loading ? "—" : formatNaira(earnings.totals.all)}
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
          <Stat
            label="Total trips"
            value={String(deliveredDeliveries.length)}
          />
          <Stat
            label="Today"
            value={earnings.loading ? "—" : formatNaira(earnings.totals.today)}
            highlight
          />
          <Stat
            label="This week"
            value={
              earnings.loading ? "—" : formatNaira(earnings.totals.thisWeek)
            }
          />
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
              onValueChange={handleToggleOnline}
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

        {/* Confirm drop-off button — always present, unlocks within 100m of dropoff */}
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
              {canConfirmTrip
                ? "CONFIRM DROP-OFF"
                : "CONFIRM DROP-OFF  ·  Move to dropoff"}
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
            finishDelivery(activeDelivery.id);
          }}
        />
      )}

      <RideOfferModal />
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
