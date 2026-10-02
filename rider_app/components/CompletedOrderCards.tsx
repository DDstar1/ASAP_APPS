import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

// Customer app's My Orders card, in the rider app's palette
const CARD_COLOR = "#1C2E52";
const DELIVERED_CHEVRON = "#FFFFFF";
const CANCELLED_CHEVRON = "#F87171";

type Props = {
  item: {
    id: number;
    order_code: string;
    status: string;
    pickup_name: string;
    pickup_lat: number;
    pickup_long: number;
    dropoff_lat: number;
    dropoff_long: number;
    package_type?: string | null;
    delivery_accepted_time: number;
    dropoff_time?: string | null;
    cancelled_at?: string | null;
    created_at?: string;
  };
  // Set on cancelled orders the rider still has to return to the pickup point
  onAtReturnPoint?: () => void;
};

// When the order finished: dropped off, or cancelled. Older rows may lack
// those, so fall back to when it was accepted / created.
export function finishedAt(item: Props["item"]): number {
  const iso =
    item.status === "cancelled"
      ? item.cancelled_at
      : (item.dropoff_time ??
        (item.delivery_accepted_time
          ? new Date(item.delivery_accepted_time).toISOString()
          : null));
  const ts = new Date(iso ?? item.created_at ?? 0).getTime();
  return Number.isNaN(ts) ? 0 : ts;
}

// Straight-line pickup → dropoff distance; the road route is longer
function distanceKm(item: Props["item"]): number | null {
  const lat1 = Number(item.pickup_lat);
  const lon1 = Number(item.pickup_long);
  const lat2 = Number(item.dropoff_lat);
  const lon2 = Number(item.dropoff_long);
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return null;

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// 23-05-2025
function formatDate(ts: number) {
  if (!ts) return "—";
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}`;
}

// 9:28pm
function formatTime(ts: number) {
  if (!ts) return "—";
  const d = new Date(ts);
  const hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours % 12 || 12}:${minutes}${hours < 12 ? "am" : "pm"}`;
}

export default function CompletedOrderCard({ item, onAtReturnPoint }: Props) {
  const cancelled = item.status === "cancelled";
  const at = finishedAt(item);
  const km = distanceKm(item);
  const chevron = cancelled ? CANCELLED_CHEVRON : DELIVERED_CHEVRON;
  const chevronIcon = cancelled ? "keyboard-arrow-left" : "keyboard-arrow-right";

  return (
    <View
      className="rounded-3xl px-5 py-4 border border-[#4F8EF7]/20"
      style={{ backgroundColor: CARD_COLOR }}
      accessibilityLabel={`Order ${item.order_code}, ${cancelled ? "cancelled" : "delivered"}`}
    >
      {/* ── Order code ── */}
      <Text
        className="text-white text-lg font-extrabold tracking-wide mb-3"
        numberOfLines={1}
      >
        {item.order_code}
      </Text>

      <View className="flex-row items-center">
        {/* ── Date + pickup ── */}
        <View className="flex-1">
          <Text className="text-white/60 text-xs">{formatDate(at)}</Text>
          <Text
            className="text-white text-sm font-semibold mt-1"
            numberOfLines={1}
          >
            {item.pickup_name || "—"}
          </Text>
        </View>

        {/* ── Chevrons: > > > delivered, < < < cancelled ── */}
        <View className="items-center px-2">
          <View className="flex-row">
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ marginHorizontal: -5 }}>
                <MaterialIcons name={chevronIcon} size={22} color={chevron} />
              </View>
            ))}
          </View>
          {km != null && (
            <Text className="text-white/70 text-[11px] font-semibold mt-0.5">
              {km < 10 ? km.toFixed(1) : Math.round(km)}km
            </Text>
          )}
        </View>

        {/* ── Time + package type ── */}
        <View className="flex-1 items-end">
          <Text className="text-white/60 text-xs">{formatTime(at)}</Text>
          <Text
            className="text-white text-sm font-semibold mt-1 text-right"
            numberOfLines={1}
          >
            {item.package_type || "Package"}
          </Text>
        </View>
      </View>

      {/* ── Return to pickup: opens the return code input ── */}
      {onAtReturnPoint && (
        <TouchableOpacity
          onPress={onAtReturnPoint}
          activeOpacity={0.85}
          className="mt-4 py-3 rounded-full items-center justify-center flex-row gap-2"
          style={{ backgroundColor: "#ff923e" }}
        >
          <MaterialIcons name="assignment-return" size={18} color="#000" />
          <Text className="text-black font-bold text-sm">AT RETURN POINT</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
