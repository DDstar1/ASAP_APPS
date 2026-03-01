import { MY_ICONS } from "@/assets/assetsData";
import React from "react";
import { View, Text } from "react-native";

// Status config — maps store status strings to display labels + colors
const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string }
> = {
  pending: { label: "Pending", color: "#FBBF24", bg: "#2D2008" },
  arriving_pickup: { label: "Picking Up", color: "#60A5FA", bg: "#0D1F3C" },
  in_transit: { label: "In Transit", color: "#34D399", bg: "#052E1C" },
  delivered: { label: "Delivered", color: "#A3E635", bg: "#1A2E05" },
};

type Props = {
  item: {
    id: string;
    order_code: string;
    status: string;
    pickup_name: string;
    dropoff_name: string;
    delivery_accepted_time: number;
  };
};

function formatTime(ts: number) {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDate(ts: number) {
  if (!ts) return "—";
  return new Date(ts).toLocaleDateString([], {
    day: "numeric",
    month: "short",
  });
}

export default function CompletedOrderCard({ item }: Props) {
  const statusCfg = STATUS_CONFIG[item.status] ?? {
    label: item.status,
    color: "#7A7F9A",
    bg: "#1A1C24",
  };

  return (
    <View className="bg-[#12141A] px-5 py-4  my-4 rounded-2xl border border-[#1F2230]">
      {/* ── Top row: order code + status badge ── */}
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          {MY_ICONS.delivery("#4F8EF7", 16)}
          <Text className="text-[#F0F2F8] text-sm font-bold tracking-wide">
            {item.order_code}
          </Text>
        </View>

        <View
          className="rounded-full px-3 py-1 border"
          // inline for dynamic border color
          style={{
            backgroundColor: statusCfg.bg,
            borderColor: statusCfg.color + "40",
            borderWidth: 1,
            borderRadius: 999,
            paddingHorizontal: 12,
            paddingVertical: 4,
          }}
        >
          <Text
            style={{ color: statusCfg.color }}
            className="text-[11px] font-bold tracking-wider uppercase"
          >
            {statusCfg.label}
          </Text>
        </View>
      </View>

      {/* ── Route row: pickup → dropoff ── */}
      <View className="flex-row items-center gap-2 mb-3">
        {/* Pickup */}
        <View className="flex-1">
          <Text className="text-[10px] font-bold tracking-widest text-[#7A7F9A] uppercase mb-0.5">
            From
          </Text>
          <Text
            className="text-[#F0F2F8] text-sm font-medium"
            numberOfLines={1}
          >
            {item.pickup_name}
          </Text>
        </View>

        {/* Arrow */}
        <View className="items-center px-1">
          {MY_ICONS.arrowRight("#3D4160", 18)}
        </View>

        {/* Dropoff */}
        <View className="flex-1 items-end">
          <Text className="text-[10px] font-bold tracking-widest text-[#7A7F9A] uppercase mb-0.5 text-right">
            To
          </Text>
          <Text
            className="text-[#F0F2F8] text-sm font-medium text-right"
            numberOfLines={1}
          >
            {item.dropoff_name}
          </Text>
        </View>
      </View>

      {/* ── Bottom row: date + time ── */}
      <View className="flex-row items-center justify-between pt-3 border-t border-[#1F2230]">
        <View className="flex-row items-center gap-1.5">
          {MY_ICONS.calendar?.("#7A7F9A", 13) ?? null}
          <Text className="text-[#7A7F9A] text-xs">
            {formatDate(item.delivery_accepted_time)}
          </Text>
        </View>
        <View className="flex-row items-center gap-1.5">
          {MY_ICONS.clock?.("#7A7F9A", 13) ?? null}
          <Text className="text-[#7A7F9A] text-xs">
            {formatTime(item.delivery_accepted_time)}
          </Text>
        </View>
        <Text className="text-[#3D4160] text-[10px] font-mono">
          #
          {String(item.id ?? "")
            .slice(0, 8)
            .toUpperCase()}
        </Text>
      </View>
    </View>
  );
}
