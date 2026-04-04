// app/(tabs)/deliveries.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useLocalSearchParams } from "expo-router";
import {
  Dimensions,
  FlatList,
  RefreshControl,
  SectionList,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MY_ICONS } from "@/assets/assetsData";
import CompletedOrderCards from "@/components/CompletedOrderCards";
import IncompleteDeliveryCard from "@/components/IncompleteDeliveryCard";
import IncompleteDeliverySkeleton from "@/components/ui/skeletons/IncompleteDeliverySkeleton";
import CompletedOrderSkeleton from "@/components/ui/skeletons/CompletedOrderSkeleton";
import { useAcceptedDeliveryStore } from "@/store/useAcceptedDeliveriesStore";
import ActiveDeliveriesEmptyState from "@/components/ActiveDeliveriesEmptyState";

const HIGHLIGHT_WINDOW = 120_000; // 2 minutes
const ACCENT_COLOR = "#4F8EF7";

const OrdersPage = () => {
  const { width } = Dimensions.get("window");
  const { newlyAcceptedId, time_added } = useLocalSearchParams();
  const [refreshing, setRefreshing] = useState(false);

  const AcceptedDeliveries = useAcceptedDeliveryStore(
    (s) => s.AcceptedDeliveries,
  );

  const loading = useAcceptedDeliveryStore((s) => s.loading);

  const fetchAcceptedDeliveries = useAcceptedDeliveryStore(
    (s) => s.fetchAcceptedDeliveries,
  );

  useEffect(() => {
    fetchAcceptedDeliveries();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAcceptedDeliveries();
    setRefreshing(false);
  };

  const acceptedTime =
    typeof time_added === "string" ? Number(time_added) : null;

  const isHighlightActive = (itemId: number) => {
    if (!acceptedTime) return false;
    if (Number(itemId) !== Number(newlyAcceptedId)) return false;
    return Date.now() - acceptedTime <= HIGHLIGHT_WINDOW;
  };

  const onGoingDeliveries = AcceptedDeliveries.filter(
    (item) =>
      item.status === "pending" ||
      item.status === "arriving_pickup" ||
      item.status === "in_transit",
  );

  const completedDeliveries = AcceptedDeliveries.filter(
    (item) => item.status === "delivered",
  );

  // ─── Section Label ─────────────────────────────────────────────────────────
  const SectionLabel = ({
    title,
    count,
  }: {
    title: string;
    count?: number;
  }) => (
    <View className="flex-row items-center gap-2">
      <Text className="text-[11px] font-bold tracking-widest text-[#7A7F9A] uppercase">
        {title}
      </Text>
      {count !== undefined && (
        <View className="bg-[#1A1C24] rounded-lg px-2 py-0.5 border border-[#1F2230]">
          <Text className="text-[11px] font-semibold text-[#7A7F9A]">
            {count}
          </Text>
        </View>
      )}
    </View>
  );

  // ─── Divider ───────────────────────────────────────────────────────────────
  const Divider = () => <View className="h-px bg-[#1F2230] mx-6 my-2" />;

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={ACCENT_COLOR}
      colors={[ACCENT_COLOR]}
    />
  );

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-[#0A0B0F]">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <View className="flex-row items-center justify-between px-6 pt-3 pb-5">
        <View>
          <Text className="text-[28px] font-extrabold text-[#F0F2F8] -tracking-wide">
            Deliveries
          </Text>
        </View>
        <View className="w-11 h-11 rounded-2xl bg-[#1C2E52] items-center justify-center border border-[#4F8EF7]/20">
          {MY_ICONS.delivery(ACCENT_COLOR, 20)}
        </View>
      </View>

      <Divider />

      {/* ── Active Deliveries — fixed height, never grows ───────────────────── */}
      <View className="px-6 pt-3 pb-2">
        <SectionLabel
          title="Active"
          count={loading ? undefined : onGoingDeliveries.length}
        />
      </View>

      <View style={{ maxHeight: 230 }}>
        {loading ? (
          <FlatList
            horizontal
            data={[1, 2, 3]}
            keyExtractor={(item) => item.toString()}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 24,
              alignItems: "center",
            }}
            renderItem={() => <IncompleteDeliverySkeleton width={width} />}
          />
        ) : (
          <FlatList
            data={onGoingDeliveries}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 24,
              alignItems: "center",
            }}
            ItemSeparatorComponent={() => <View className="w-3" />}
            keyExtractor={(item, index) => `${item.order_code}-${index}`}
            renderItem={({ item, index }) => (
              <IncompleteDeliveryCard
                item={item}
                index={index}
                width={width}
                isHighlighted={isHighlightActive(item.id)}
              />
            )}
            ListEmptyComponent={() => (
              <ActiveDeliveriesEmptyState width={width} />
            )}
          />
        )}
      </View>

      <Divider />

      {/* ── Completed Deliveries — flex-1 fills ALL remaining space ─────────── */}
      <View className="px-6 pt-3 pb-2">
        <SectionLabel
          title="Completed"
          count={loading ? undefined : completedDeliveries.length}
        />
      </View>

      {loading ? (
        <View className="flex-1 px-6 gap-6">
          {[1, 2, 3, 4].map((_, index) => (
            <CompletedOrderSkeleton key={index} />
          ))}
        </View>
      ) : (
        <SectionList
          sections={[{ title: "Completed", data: completedDeliveries }]}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={({ item }) => <CompletedOrderCards item={item} />}
          stickySectionHeadersEnabled
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: 18 }}
          ItemSeparatorComponent={() => (
            <View className="h-px my-3 bg-[#1F2230]" />
          )}
          refreshControl={refreshControl}
          ListEmptyComponent={() => (
            <View className="py-8 items-center">
              <Text className="text-sm text-[#3D4160]">
                No completed deliveries yet
              </Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
};

export default OrdersPage;
