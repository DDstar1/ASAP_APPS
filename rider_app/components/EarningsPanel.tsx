import React, { useState } from "react";
import { FlatList, RefreshControl, Text, View } from "react-native";

import { MY_ICONS } from "@/assets/assetsData";
import { useRiderEarnings } from "@/hooks/use-rider-earnings";
import { TIER_LABEL, formatNaira } from "@/lib/earnings";
import { AcceptedDelivery } from "@/store/useAcceptedDeliveriesStore";

const ACCENT_COLOR = "#4F8EF7";
const EARN_COLOR = "#A3E635";

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
      <View className="bg-[#12141A] rounded-2xl border border-[#1F2230] px-5 py-5">
        <View className="flex-row items-center justify-between">
          <Text className="text-[11px] font-bold tracking-widest text-[#7A7F9A] uppercase">
            Total earnings
          </Text>
          <View
            className="rounded-full px-3 py-1"
            style={{
              backgroundColor: "#1C2E52",
              borderColor: ACCENT_COLOR + "40",
              borderWidth: 1,
            }}
          >
            <Text
              style={{ color: ACCENT_COLOR }}
              className="text-[11px] font-bold tracking-wider"
            >
              {tier ? TIER_LABEL[tier] : "Tier not set"} · {ratePercent}%
            </Text>
          </View>
        </View>
        <Text className="text-[#F0F2F8] text-[34px] font-extrabold mt-2">
          {loading ? "—" : formatNaira(totals.all)}
        </Text>
        <Text className="text-[#7A7F9A] text-xs mt-1">
          {rows.length} completed deliver{rows.length === 1 ? "y" : "ies"}
        </Text>
      </View>

      {/* ── Today / This week ── */}
      <View className="flex-row gap-4">
        <StatCard label="Today" value={loading ? "—" : formatNaira(totals.today)} />
        <StatCard
          label="This week"
          value={loading ? "—" : formatNaira(totals.thisWeek)}
        />
      </View>

      {!tier && !loading && (
        <Text className="text-[#7A7F9A] text-xs">
          Your payout tier hasn't been set yet, so earnings show the {ratePercent}%
          rate. Contact support if you own your bike outright.
        </Text>
      )}
      {unpricedCount > 0 && !loading && (
        <Text className="text-[#7A7F9A] text-xs">
          {unpricedCount} deliver{unpricedCount === 1 ? "y has" : "ies have"} no
          fee on record and {unpricedCount === 1 ? "isn't" : "aren't"} counted.
        </Text>
      )}

      <Text className="text-[11px] font-bold tracking-widest text-[#7A7F9A] uppercase mt-2">
        Per delivery
      </Text>
    </View>
  );

  return (
    <FlatList
      data={rows}
      keyExtractor={(r) => String(r.delivery.id)}
      ListHeaderComponent={header}
      contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 32 }}
      showsVerticalScrollIndicator={false}
      ItemSeparatorComponent={() => <View className="h-px my-3 bg-[#1F2230]" />}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={ACCENT_COLOR}
          colors={[ACCENT_COLOR]}
        />
      }
      renderItem={({ item: r }) => (
        <View className="flex-row items-center justify-between">
          <View className="flex-1 mr-4">
            <View className="flex-row items-center gap-2">
              {MY_ICONS.delivery(ACCENT_COLOR, 14)}
              <Text className="text-[#F0F2F8] text-sm font-bold tracking-wide">
                {r.delivery.order_code}
              </Text>
            </View>
            <Text className="text-[#7A7F9A] text-xs mt-1" numberOfLines={1}>
              {new Date(r.at).toLocaleDateString([], {
                day: "numeric",
                month: "short",
              })}{" "}
              · {r.delivery.dropoff_name}
            </Text>
          </View>
          <View className="items-end">
            <Text
              style={{ color: r.earning != null ? EARN_COLOR : "#3D4160" }}
              className="text-base font-bold"
            >
              {r.earning != null ? formatNaira(r.earning) : "—"}
            </Text>
            <Text className="text-[#3D4160] text-[11px] mt-0.5">
              {r.fee != null ? `of ${formatNaira(r.fee)}` : "no fee"}
            </Text>
          </View>
        </View>
      )}
      ListEmptyComponent={
        loading ? null : (
          <View className="py-8 items-center">
            <Text className="text-sm text-[#3D4160]">
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
    <View className="flex-1 bg-[#12141A] rounded-2xl border border-[#1F2230] px-4 py-4">
      <Text className="text-[10px] font-bold tracking-widest text-[#7A7F9A] uppercase">
        {label}
      </Text>
      <Text className="text-[#F0F2F8] text-lg font-bold mt-1">{value}</Text>
    </View>
  );
}
