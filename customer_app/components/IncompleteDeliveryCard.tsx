import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { IMAGES } from "@/assets/assetsData";
import {
  CustomerDelivery,
  useCustomerDeliveryStore,
} from "@/store/useCustomerDeliveriesStore";
import { openOrderChat } from "@/utils/my_utils";
import { cancelledOrderMessage, cancelPaidOrder } from "@/lib/payments";
import { router } from "expo-router";

const ORANGE = "#EE7F3A";

const STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "Finding a rider", color: "#FACC15" },
  arriving_pickup: { label: "Heading to pickup", color: ORANGE },
  in_transit: { label: "In Transit", color: "#22C55E" },
  driver_arrived: { label: "Rider at drop-off", color: "#22C55E" },
};

type Props = {
  item: CustomerDelivery;
};

// "Current Tracking" card for an order still in progress
const IncompleteDeliveryCard = ({ item }: Props) => {
  const status = item.status?.trim().toLowerCase() ?? "pending";
  const statusInfo = STATUS[status] ?? { label: status, color: "#9CA3AF" };
  const isPending = status === "pending";
  const [cancelling, setCancelling] = useState(false);

  const { unreadCounts, fetchAllDeliveries } = useCustomerDeliveryStore();
  const unreadCount = unreadCounts?.[String(item.id)] ?? 0;

  // Status dot pulses while a rider is being found
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = isPending
      ? withRepeat(withTiming(0.3, { duration: 700 }), -1, true)
      : 1;
  }, [isPending]);
  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  // The rider enters the pickup code; Rust moves the order to in_transit
  // and realtime updates the card
  const pickedUp =
    !!item.is_pickup_code_authenticated ||
    status === "in_transit" ||
    status === "driver_arrived";

  // A pending order is already paid, so cancelling goes through Rust, which
  // refunds in full while no rider has accepted. The row is never deleted.
  const handleCancel = () => {
    const reference = item.payment_reference;
    if (!reference) {
      Alert.alert(
        "Can't cancel here",
        "This order wasn't paid in the app. Please contact support to cancel it.",
      );
      return;
    }
    Alert.alert(
      "Cancel this delivery?",
      "You'll get a full refund to your payment method.",
      [
        { text: "Keep it", style: "cancel" },
        {
          text: "Cancel delivery",
          style: "destructive",
          onPress: async () => {
            setCancelling(true);
            const { data, error } = await cancelPaidOrder(reference);
            setCancelling(false);
            if (!data) {
              Alert.alert("Couldn't cancel", error ?? "Please try again.");
              return;
            }
            Alert.alert(
              "Delivery cancelled",
              cancelledOrderMessage(data.refund_amount),
            );
            fetchAllDeliveries();
          },
        },
      ],
    );
  };

  const openTracking = () =>
    router.push({ pathname: "/trackPackage", params: { order_id: item.id } });

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={openTracking}
      accessibilityRole="button"
      accessibilityLabel={`Order ${item.order_code}, ${statusInfo.label}. Open tracking`}
      className="bg-[#3C3C43] rounded-3xl overflow-hidden p-5 mb-3"
    >
      {/* Map lines on the right */}
      <Image
        source={IMAGES.map_lines}
        className="absolute -right-10 top-0 bottom-0 w-3/5 h-full"
        style={{ opacity: 0.35 }}
        resizeMode="cover"
      />

      {/* Code + actions */}
      <View className="flex-row items-center justify-between">
        <Text selectable className="text-white text-xl font-extrabold flex-1">
          #{item.order_code}
        </Text>

        <View className="flex-row gap-2">
          {!isPending && (
            <TouchableOpacity
              onPress={() => openOrderChat(item.id)}
              accessibilityRole="button"
              accessibilityLabel={
                unreadCount > 0
                  ? `Chat with rider, ${unreadCount} unread`
                  : "Chat with rider"
              }
              className="w-11 h-11 rounded-full bg-[#212126] justify-center items-center"
            >
              <Ionicons name="chatbubble-ellipses" size={20} color="white" />
              {unreadCount > 0 && (
                <View
                  className="absolute bg-red-500 rounded-full items-center justify-center"
                  style={{ top: 4, right: 4, minWidth: 16, height: 16, paddingHorizontal: 3 }}
                >
                  <Text style={{ fontSize: 9, lineHeight: 11 }} className="text-white font-bold">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {isPending && (
            <TouchableOpacity
              onPress={handleCancel}
              disabled={cancelling}
              accessibilityRole="button"
              accessibilityLabel="Cancel delivery"
              className="h-11 px-4 rounded-full bg-[#212126] flex-row justify-center items-center gap-1"
            >
              {cancelling ? (
                <ActivityIndicator color="#F87171" />
              ) : (
                <>
                  <Ionicons name="close" size={16} color="#F87171" />
                  <Text className="text-red-400 text-sm font-semibold">Cancel</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Where the package is headed next */}
      <Text className="text-gray-400 text-xs mt-4">
        {pickedUp ? "Delivering to" : "Pick up from"}
      </Text>
      <View className="flex-row items-center gap-2 mt-1 pr-16">
        <Ionicons name="location-sharp" size={16} color="white" />
        <Text numberOfLines={1} className="text-white text-base flex-1">
          {(pickedUp ? item.dropoff_name : item.pickup_name) || "Unknown"}
        </Text>
      </View>

      <Text className="text-gray-400 text-xs mt-3">Status</Text>
      <View className="flex-row items-center gap-2 mt-1">
        <Animated.View
          style={[pulseStyle, { backgroundColor: statusInfo.color }]}
          className="w-2.5 h-2.5 rounded-full"
        />
        <Text className="text-white text-base font-semibold">
          {statusInfo.label}
        </Text>
      </View>

      {/* The customer gives these codes to the rider */}
      <View className="flex-row gap-3 mt-4">
        <View className="flex-1 bg-[#212126]/90 rounded-2xl px-3 py-2">
          <Text className="text-gray-400 text-[11px]">Pickup code</Text>
          {pickedUp ? (
            <View className="flex-row items-center gap-1">
              <Ionicons name="checkmark-circle" size={14} color="#22C55E" />
              <Text className="text-white text-sm font-semibold">Confirmed</Text>
            </View>
          ) : (
            <Text selectable className="text-white text-base font-bold tracking-widest">
              {item.pickup_code ?? "—"}
            </Text>
          )}
        </View>
        <View className="flex-1 bg-[#212126]/90 rounded-2xl px-3 py-2">
          <Text className="text-gray-400 text-[11px]">Drop-off code</Text>
          <Text selectable className="text-white text-base font-bold tracking-widest">
            {item.dropoff_code ?? "—"}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default IncompleteDeliveryCard;
