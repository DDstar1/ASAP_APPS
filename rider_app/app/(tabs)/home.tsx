import { IMAGES } from "@/assets/assetsData";
import CodeInputComponent from "@/components/CodeInputComponent";
import AvailableOrdersDropdown from "@/components/AvailableOrdersDropdown";
import PickupConfirmOTP from "@/components/PickupConfirmOTP";
import RaiseDisputeSheet from "@/components/RaiseDisputeSheet";
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
  confirmRidePickup,
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

// Orders arrive as offers only; the old available-orders list is hidden, not
// removed, until the co-dev signs off on deleting it
const SHOW_AVAILABLE_ORDERS_LIST = false;

// Well inside Rust's 10-minute cutoff for matching
const LOCATION_HEARTBEAT_MS = 2 * 60 * 1000;

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
    // Orders now reach the rider only as offers (RideOfferModal); the
    // /riders/assign-driver list is off pending co-dev review
    // fetchAvailableOrders();
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
      // fetchAvailableOrders(), // offers only, see mount effect
      fetchAcceptedDeliveries(),
      fetchUserSession(),
      earnings.reload(), // tier or fees may have changed
    ]);
    setRefreshing(false);
  };

  const activeDelivery =
    AcceptedDeliveries.find((d) => isActiveStatus(d.status)) || null;
  // Rust only accepts a dispute before the pickup code is entered
  const atPickup =
    activeDelivery?.status === "arriving_pickup" ||
    activeDelivery?.status === "driver_arrived";
  const [showDispute, setShowDispute] = useState(false);

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

  // watchPositionAsync only fires on movement, and Rust stops matching a
  // driver with no location for 10 minutes, so a parked driver still sends
  // the last known position on a timer
  useEffect(() => {
    if (!isOnline) return;
    const heartbeat = setInterval(async () => {
      try {
        const last = await Location.getLastKnownPositionAsync();
        if (last)
          await updateRiderLocation(last.coords.latitude, last.coords.longitude);
      } catch (err) {
        console.error("Location heartbeat failed:", err);
      }
    }, LOCATION_HEARTBEAT_MS);
    return () => clearInterval(heartbeat);
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
      // Rust refuses offline (409) while the driver is busy or carrying an
      // order, e.g. an offer accepted that hasn't reached this screen yet
      if (!online && String(result.error ?? "").startsWith("API 409")) {
        Alert.alert(
          "Delivery in progress",
          "You can't go offline while you have an order. Finish it first.",
        );
        return;
      }
      Alert.alert(
        "Couldn't update status",
        `You're still ${online ? "offline" : "online"}. Please try again.`,
      );
    }
  };

  // The customer holds both codes; the rider enters them
  const handleSubmitCode = async (code: string) => {
    if (!activeDelivery) return;
    try {
      if (activeDelivery.status === "arriving_pickup") {
        const pickup = await confirmRidePickup(activeDelivery.order_code, code);
        if (pickup.success) {
          // Realtime brings the same status; set it now so the card moves on
          updateDeliveryStatus(activeDelivery.id, "in_transit");
          Alert.alert("Pickup confirmed ✓", "Head to the drop-off.");
        } else {
          Alert.alert("Invalid Code", pickup.error || "The code is incorrect.");
        }
        return;
      }

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
    <View className="flex-1 bg-black">
      <StatusBar barStyle="light-content" />

      {/* Header */}
      <View className="bg-[#212126] overflow-hidden rounded-b-[32px]">
        <SafeAreaView edges={["top"]} className="px-6 pb-8 pt-6">
          <Text className="text-gray-400 text-sm">Welcome back</Text>
          <Text className="text-white text-3xl font-bold mb-6">
            {user?.username ?? "Rider"}
          </Text>

          <Text className="text-gray-400 text-xs font-bold tracking-widest uppercase mb-1">
            Total earnings
          </Text>

          <Text className="text-[#22C55E] text-5xl font-extrabold">
            {earnings.loading ? "—" : formatNaira(earnings.totals.all)}
          </Text>
        </SafeAreaView>

        <Image
          source={IMAGES.riderIllustraion}
          className="absolute right-0 bottom-[-10px] w-52 h-52 opacity-40"
          resizeMode="contain"
        />
      </View>

      {/* Stats Card */}
      <View className="mx-4 mt-4 p-3 rounded-3xl bg-[#212126]">
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
        className="bg-black"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 96,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#EE7F3A"
            colors={["#EE7F3A"]}
          />
        }
      >
        {/* Online Switch Card */}
        <View className="bg-[#3C3C43] rounded-3xl p-5 mb-4">
          <View className="flex-row justify-between items-center">
            <View className="flex-1">
              {/* Status row with dot */}
              <View className="flex-row items-center gap-2 mb-1.5">
                <PulseDot isOnline={isOnline} color="#22C55E" />
                <Text className="text-white text-base font-bold">
                  {isOnline ? "Online" : "Offline"}
                </Text>
              </View>
              <Text className="text-gray-400 text-sm">
                {isOnline
                  ? "You're available for new deliveries."
                  : "You're currently offline."}
              </Text>
            </View>

            <Switch
              value={isOnline}
              onValueChange={handleToggleOnline}
              accessibilityLabel={isOnline ? "Go offline" : "Go online"}
              thumbColor="#FFFFFF"
              trackColor={{ false: "#212126", true: "#22C55E" }}
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
        ) : SHOW_AVAILABLE_ORDERS_LIST ? (
          <AvailableOrdersDropdown
            availableOrders={availableOrders}
            showOrders={showOrders}
            onToggle={toggleDropdown}
          />
        ) : null}

        {atPickup && (
          <TouchableOpacity
            onPress={() => setShowDispute(true)}
            accessibilityRole="button"
            className="flex-row items-center justify-center gap-2 h-12 mt-3 rounded-full border border-red-500/40"
          >
            <MaterialIcons name="report-problem" size={18} color="#F87171" />
            <Text className="text-red-400 font-bold text-sm">PROBLEM WITH THE PACKAGE?</Text>
          </TouchableOpacity>
        )}

        {/* Confirm drop-off button — always present, unlocks within 100m of dropoff */}
        <View
          style={{
            marginTop: 16,
            borderRadius: 999,
            overflow: "hidden",
            opacity: canConfirmTrip ? 1 : 0.5,
          }}
        >
          <TouchableOpacity
            onPress={() => setShowOTPModal(true)}
            disabled={!canConfirmTrip}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canConfirmTrip }}
            style={{
              backgroundColor: canConfirmTrip ? "#EE7F3A" : "#212126",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              height: 56,
              borderRadius: 999,
            }}
          >
            <MaterialIcons
              name="verified"
              size={20}
              color={canConfirmTrip ? "#FFFFFF" : "#9CA3AF"}
            />
            <Text
              style={{
                fontWeight: "700",
                fontSize: 14,
                color: canConfirmTrip ? "#FFFFFF" : "#9CA3AF",
              }}
            >
              {canConfirmTrip
                ? "CONFIRM DROP-OFF"
                : "CONFIRM DROP-OFF  ·  Move to dropoff"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {activeDelivery && atPickup && (
        <RaiseDisputeSheet
          visible={showDispute}
          orderRef={activeDelivery.order_code}
          onClose={() => setShowDispute(false)}
          onReported={() => {
            setShowDispute(false);
            updateDeliveryStatus(activeDelivery.id, "cancelled");
            Alert.alert(
              "Order cancelled",
              "Thanks for reporting it. ASAP will review your photo; you're free for new deliveries.",
            );
          }}
        />
      )}

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
        highlight ? "bg-[#15803D]" : "bg-[#3C3C43]"
      }`}
    >
      <Text
        className={`text-xs ${highlight ? "text-white/80" : "text-gray-400"}`}
      >
        {label}
      </Text>
      <Text className="text-lg font-bold text-white">
        {value}
      </Text>
    </View>
  );
}

export default RiderHomeScreen;
