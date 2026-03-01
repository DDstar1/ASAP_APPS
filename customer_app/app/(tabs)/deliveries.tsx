// app/(tabs)/orders.tsx
import React, { useEffect, useMemo } from "react";
import { Dimensions, FlatList, SectionList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MY_ICONS } from "@/assets/assetsData";
import IncompleteDeliveryCard from "@/components/IncompleteDeliveryCard";
import CompletedOrderCards from "@/components/CompletedOrderCards";
import CompletedOrderSkeleton from "@/components/ui/skeletons/CompletedOrderSkeleton";
import IncompleteDeliverySkeleton from "@/components/ui/skeletons/IncompleteDeliverySkeleton";
import { useCustomerDeliveryStore } from "@/store/useCustomerDeliveriesStore";

const ACCENT_COLOR = "#4F8EF7";

const OrdersPage = () => {
  const { width } = Dimensions.get("window");
  const { AllDeliveries, loading, fetchAllDeliveries } =
    useCustomerDeliveryStore();

  useEffect(() => {
    fetchAllDeliveries();
  }, []);

  // Active = anything not yet delivered
  const activeDeliveries = useMemo(
    () =>
      AllDeliveries.filter(
        (item) =>
          item.status === "pending" ||
          item.status === "arriving_pickup" ||
          item.status === "in_transit",
      ),
    [AllDeliveries],
  );

  // Completed = delivered
  const completedDeliveries = useMemo(
    () => AllDeliveries.filter((item) => item.status === "delivered"),
    [AllDeliveries],
  );

  // ─── Sub-components ────────────────────────────────────────────────────────
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

  const Divider = () => <View className="h-px bg-[#1F2230] mx-6 my-2" />;

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-[#0A0B0F]">
      {/* ── Header ── */}
      <View className="flex-row items-center justify-between px-6 pt-3 pb-5">
        <View>
          <Text className="text-[28px] font-extrabold text-[#F0F2F8] -tracking-wide">
            My Orders
          </Text>
        </View>
        <View className="w-11 h-11 rounded-2xl bg-[#1C2E52] items-center justify-center border border-[#4F8EF7]/20">
          {MY_ICONS.message(ACCENT_COLOR, 20)}
        </View>
      </View>

      <Divider />

      {/* ── Active Deliveries ── */}
      <View className="px-6 pt-3 pb-2">
        <SectionLabel
          title="Active"
          count={loading ? undefined : activeDeliveries.length}
        />
      </View>

      <View style={{ maxHeight: 240 }}>
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
            data={activeDeliveries}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 24,
              alignItems: "center",
            }}
            ItemSeparatorComponent={() => <View className="w-3" />}
            keyExtractor={(item, index) => `${item.order_code}-${index}`}
            renderItem={({ item }) => (
              <IncompleteDeliveryCard item={item} width={width} />
            )}
            ListEmptyComponent={() => (
              <View
                style={{ width: width - 48, height: 72 }}
                className="bg-[#12141A] rounded-2xl border my-4 border-dashed border-[#1F2230] flex-row items-center px-5 gap-4"
              >
                <Text className="text-2xl">📦</Text>
                <View className="gap-0.5">
                  <Text className="text-sm font-bold text-[#F0F2F8]">
                    No Active Orders
                  </Text>
                  <Text className="text-xs text-[#7A7F9A]">
                    Your current deliveries will appear here
                  </Text>
                </View>
              </View>
            )}
          />
        )}
      </View>

      <Divider />

      {/* ── Completed Orders ── */}
      <View className="px-6 pt-3 pb-2">
        <SectionLabel
          title="Completed"
          count={loading ? undefined : completedDeliveries.length}
        />
      </View>

      {loading ? (
        <View className="flex-1 px-6 gap-3">
          {[1, 2, 3, 4].map((_, i) => (
            <CompletedOrderSkeleton key={i} />
          ))}
        </View>
      ) : (
        <SectionList
          sections={[{ title: "Completed", data: completedDeliveries }]}
          keyExtractor={(item, index) => `${String(item.id)}-${index}`}
          renderItem={({ item }) => <CompletedOrderCards item={item} />}
          stickySectionHeadersEnabled
          className="flex-1 px-6"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32 }}
          ItemSeparatorComponent={() => <View className="h-px bg-[#1F2230]" />}
          ListEmptyComponent={() => (
            <View className="py-8 items-center">
              <Text className="text-sm text-[#3D4160]">
                No completed orders yet
              </Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
};

export default OrdersPage;
