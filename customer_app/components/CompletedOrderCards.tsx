import { MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { getReturnCode } from "@/lib/supabase-app-functions";

const CARD_COLOR = "#EE7F3A";
const DELIVERED_CHEVRON = "#FFFFFF";
const CANCELLED_CHEVRON = "#C81E1E";

type Props = {
  item: {
    id: number | string;
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
  onRebook?: () => void;
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

export default function CompletedOrderCard({ item, onRebook }: Props) {
  const cancelled = item.status === "cancelled";
  const at = finishedAt(item);
  const km = distanceKm(item);
  const chevron = cancelled ? CANCELLED_CHEVRON : DELIVERED_CHEVRON;
  const chevronIcon = cancelled ? "keyboard-arrow-left" : "keyboard-arrow-right";

  // Cancelled after pickup: the rider brings the package back and enters this code
  const [returnCode, setReturnCode] = useState<string | null>(null);
  useEffect(() => {
    if (!cancelled) return;
    getReturnCode(Number(item.id)).then(setReturnCode);
  }, [cancelled, item.id]);

  return (
    <View
      className="rounded-3xl px-5 py-4 my-2"
      style={{ backgroundColor: CARD_COLOR }}
      accessibilityLabel={`Order ${item.order_code}, ${cancelled ? "cancelled" : "delivered"}`}
    >
      {/* ── Order code + Rebook ── */}
      <View className="flex-row items-center justify-between mb-3">
        <Text
          className="text-white text-lg font-extrabold tracking-wide flex-1 mr-3"
          numberOfLines={1}
        >
          {item.order_code}
        </Text>
        {onRebook && (
          <TouchableOpacity
            onPress={onRebook}
            activeOpacity={0.8}
            className="bg-white rounded-full px-4 py-1.5"
          >
            <Text
              style={{ color: CARD_COLOR }}
              className="text-xs font-bold"
            >
              Rebook
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View className="flex-row items-center">
        {/* ── Date + pickup ── */}
        <View className="flex-1">
          <Text className="text-white/70 text-xs">{formatDate(at)}</Text>
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
            <Text className="text-white/80 text-[11px] font-semibold mt-0.5">
              {km < 10 ? km.toFixed(1) : Math.round(km)}km
            </Text>
          )}
        </View>

        {/* ── Time + package type ── */}
        <View className="flex-1 items-end">
          <Text className="text-white/70 text-xs">{formatTime(at)}</Text>
          <Text
            className="text-white text-sm font-semibold mt-1 text-right"
            numberOfLines={1}
          >
            {item.package_type || "Package"}
          </Text>
        </View>
      </View>

      {/* ── Return code: give it to the rider when they hand the package back ── */}
      {returnCode && (
        <View className="mt-4 bg-white/15 rounded-2xl px-4 py-3 flex-row items-center justify-between">
          <View className="flex-1 mr-3">
            <Text className="text-white text-xs font-semibold">
              Return code
            </Text>
            <Text className="text-white/80 text-[11px] mt-0.5">
              Give this to the rider when they return your package
            </Text>
          </View>
          <Text className="text-white text-xl font-extrabold tracking-widest">
            {returnCode}
          </Text>
        </View>
      )}
    </View>
  );
}
