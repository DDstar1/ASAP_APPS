import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { openGoogleMaps, openOrderChat } from "@/utils/utils_for_me";
import { IMAGES } from "@/assets/assetsData";
import { useUnreadCountStore } from "@/store/useUnreadCountStore";
import { PulseDot } from "@/components/PulseDot";

const ORANGE = "#FF7518";

// What the rider should be doing right now, per status
const STATUS: Record<string, { label: string; color: string }> = {
  pending: { label: "Awaiting start", color: "#EAB308" },
  arriving_pickup: { label: "Heading to pickup", color: ORANGE },
  in_transit: { label: "In transit", color: "#22C55E" },
  driver_arrived: { label: "At drop-off", color: "#22C55E" },
};

type Props = {
  item: any;
  isHighlighted?: boolean;
};

export default function IncompleteDeliveryCard({
  item,
  isHighlighted = false,
}: Props) {
  const normalizedStatus = item.status?.trim().toLowerCase();
  const status = STATUS[normalizedStatus] ?? {
    label: item.status?.replace("_", " ") ?? "—",
    color: item.statusColor ?? "#22C55E",
  };

  const unreadCount = useUnreadCountStore(
    (state) => state.counts[item.id] ?? 0,
  );

  // Glowing border on a just-accepted order
  const shimmer = useSharedValue(0);

  useEffect(() => {
    if (isHighlighted) {
      shimmer.value = withRepeat(
        withTiming(1, { duration: 1500, easing: Easing.linear }),
        3,
        false,
      );
    }
  }, [isHighlighted]);

  const animatedBorderStyle = useAnimatedStyle(() => {
    if (!isHighlighted) return {};

    return {
      borderWidth: 2,
      borderColor: ORANGE,
      opacity: 0.75 + 0.25 * Math.sin(shimmer.value * Math.PI * 2),
    };
  });

  const navigate = (navigateTo: "pickup" | "dropoff") =>
    openGoogleMaps({
      order_status: item.status,
      pickupLat: item.pickup_lat,
      pickupLng: item.pickup_long,
      dropoffLat: item.dropoff_lat,
      dropoffLng: item.dropoff_long,
      navigateTo,
    });

  // Before pickup the next leg is the pickup; after, the drop-off
  const pickedUp =
    normalizedStatus === "in_transit" || normalizedStatus === "driver_arrived";

  return (
    <Animated.View
      style={animatedBorderStyle}
      className="rounded-3xl overflow-hidden bg-[#3C3C43] mb-3"
    >
      {/* Faint map lines behind the content */}
      <Image
        source={IMAGES.map_lines}
        resizeMode="cover"
        style={{
          position: "absolute",
          right: -40,
          top: 0,
          bottom: 0,
          width: "70%",
          opacity: 0.35,
        }}
      />

      <View className="p-5">
        {/* ── Code + chat ── */}
        <View className="flex-row items-center justify-between">
          <Text className="text-white text-xl font-extrabold tracking-wide">
            #{item.order_code}
          </Text>

          {normalizedStatus !== "pending" && (
            <TouchableOpacity
              onPress={() => openOrderChat(item.id)}
              accessibilityRole="button"
              accessibilityLabel={
                unreadCount > 0
                  ? `Chat with customer, ${unreadCount} unread`
                  : "Chat with customer"
              }
              className="w-11 h-11 rounded-full bg-[#212126] items-center justify-center"
            >
              <Ionicons name="chatbubble-ellipses" size={20} color="white" />
              {unreadCount > 0 && (
                <View className="absolute -top-1 -right-1 bg-red-500 rounded-full min-w-[18px] h-[18px] items-center justify-center px-1">
                  <Text className="text-white text-[10px] font-bold">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* ── Route ── */}
        <View className="mt-4 gap-3">
          <Stop label="Pick up from" name={item.pickup_name} dot="#EF4444" />
          <Stop label="Delivering to" name={item.dropoff_name} dot="#22C55E" />
        </View>

        {/* ── Status ── */}
        <View className="flex-row items-center mt-4">
          <PulseDot isOnline color={status.color} />
          <Text
            style={{ color: status.color }}
            className="text-sm font-bold ml-2"
          >
            {status.label}
          </Text>
        </View>

        {/* ── Navigate: next leg is the solid button ── */}
        <View className="flex-row gap-3 mt-4">
          <NavButton
            label="To pickup"
            primary={!pickedUp}
            onPress={() => navigate("pickup")}
          />
          <NavButton
            label="To drop-off"
            primary={pickedUp}
            onPress={() => navigate("dropoff")}
          />
        </View>
      </View>
    </Animated.View>
  );
}

function Stop({ label, name, dot }: { label: string; name?: string; dot: string }) {
  return (
    <View className="flex-row items-start gap-3">
      <View
        className="w-2.5 h-2.5 rounded-full mt-1.5"
        style={{ backgroundColor: dot }}
      />
      <View className="flex-1">
        <Text className="text-gray-400 text-xs">{label}</Text>
        <Text numberOfLines={2} className="text-white text-sm font-semibold">
          {name || "Unknown"}
        </Text>
      </View>
    </View>
  );
}

function NavButton({
  label,
  primary,
  onPress,
}: {
  label: string;
  primary: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Navigate ${label.toLowerCase()}`}
      className={`flex-1 h-11 rounded-full flex-row items-center justify-center gap-1.5 ${
        primary ? "bg-[#FF7518]" : "bg-[#212126]"
      }`}
    >
      <Ionicons name="navigate" size={15} color="white" />
      <Text className="text-white text-sm font-bold">{label}</Text>
    </TouchableOpacity>
  );
}
