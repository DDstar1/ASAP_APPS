import React, { useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { useRiderEarnings } from "@/hooks/use-rider-earnings";
import { TIER_LABEL, formatNaira } from "@/lib/earnings";
import { AcceptedDelivery } from "@/store/useAcceptedDeliveriesStore";

// Money is green across the earnings tab
const EARN_COLOR = "#22C55E";
const EARN_DEEP = "#15803D";

type Props = {
  completedDeliveries: AcceptedDelivery[];
  onRefreshDeliveries: () => Promise<void>;
};

export default function EarningsPanel({
  completedDeliveries,
  onRefreshDeliveries,
}: Props) {
  const [refreshing, setRefreshing] = useState(false);
  const { tier, ratePercent, loading, rows, totals, reload } =
    useRiderEarnings(completedDeliveries);

  const onRefresh = async () => {
    setRefreshing(true);
    await onRefreshDeliveries(); // new references re-trigger reload()
    await reload();
    setRefreshing(false);
  };

  const unpricedCount = rows.filter((r) => r.earning == null).length;

  const header = (
    <View className="gap-4 pb-4">
      {/* ── Total ── */}
      <View
        className="rounded-3xl px-5 py-5 overflow-hidden"
        style={{ backgroundColor: EARN_DEEP }}
      >
        <View className="flex-row items-center justify-between">
          <Text className="text-white/80 text-xs font-bold tracking-widest uppercase">
            Total earnings
          </Text>
          <View className="rounded-full px-3 py-1 bg-white/20">
            <Text className="text-white text-[11px] font-bold tracking-wider">
              {tier ? TIER_LABEL[tier] : "Tier not set"} · {ratePercent}%
            </Text>
          </View>
        </View>
        <Text className="text-white text-[36px] font-extrabold mt-2">
          {loading ? "—" : formatNaira(totals.all)}
        </Text>
        <Text className="text-white/80 text-xs mt-1">
          {rows.length} completed deliver{rows.length === 1 ? "y" : "ies"}
        </Text>
      </View>

      {/* ── Today / This week ── */}
      <View className="flex-row gap-3">
        <StatCard label="Today" value={loading ? "—" : formatNaira(totals.today)} />
        <StatCard
          label="This week"
          value={loading ? "—" : formatNaira(totals.thisWeek)}
        />
      </View>

      {!tier && !loading && (
        <Text className="text-gray-400 text-xs">
          Your payout tier hasn&apos;t been set yet, so earnings show the {ratePercent}%
          rate. Contact support if you own your bike outright.
        </Text>
      )}
      {unpricedCount > 0 && !loading && (
        <Text className="text-gray-400 text-xs">
          {unpricedCount} deliver{unpricedCount === 1 ? "y has" : "ies have"} no
          fee on record and {unpricedCount === 1 ? "isn't" : "aren't"} counted.
        </Text>
      )}

      <Text className="text-white text-lg font-bold mt-2">Per delivery</Text>
    </View>
  );

  return (
    <FlatList
      data={rows}
      keyExtractor={(r) => String(r.delivery.id)}
      ListHeaderComponent={header}
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
      ItemSeparatorComponent={() => <View className="h-2" />}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={EARN_COLOR}
          colors={[EARN_COLOR]}
        />
      }
      renderItem={({ item: r }) => (
        <View className="flex-row items-center bg-[#212126] rounded-2xl px-4 py-3">
          <View className="w-10 h-10 rounded-full bg-[#22C55E]/15 items-center justify-center mr-3">
            <Ionicons name="cube-outline" size={18} color={EARN_COLOR} />
          </View>
          <View className="flex-1 mr-4">
            <Text className="text-white text-sm font-bold tracking-wide">
              {r.delivery.order_code}
            </Text>
            <Text className="text-gray-400 text-xs mt-0.5" numberOfLines={1}>
              {new Date(r.at).toLocaleDateString([], {
                day: "numeric",
                month: "short",
              })}{" "}
              · {r.delivery.dropoff_name}
            </Text>
          </View>
          <View className="items-end">
            <Text
              style={{ color: r.earning != null ? EARN_COLOR : "#6B6B70" }}
              className="text-base font-bold"
            >
              {r.earning != null ? `+${formatNaira(r.earning)}` : "—"}
            </Text>
            <Text className="text-gray-500 text-[11px] mt-0.5">
              {r.fee != null ? `of ${formatNaira(r.fee)}` : "no fee"}
            </Text>
          </View>
        </View>
      )}
      ListEmptyComponent={
        loading ? null : (
          <View className="py-10 items-center">
            <Ionicons name="wallet-outline" size={36} color="#6B6B70" />
            <Text className="text-gray-400 text-sm mt-3">
              Complete a delivery to start earning
            </Text>
          </View>
        )
      }
    />
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 bg-[#212126] rounded-2xl px-4 py-4">
      <Text className="text-gray-400 text-[11px] font-bold tracking-widest uppercase">
        {label}
      </Text>
      <Text style={{ color: EARN_COLOR }} className="text-xl font-bold mt-1">
        {value}
      </Text>
    </View>
  );
}
