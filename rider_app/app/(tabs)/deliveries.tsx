// app/(tabs)/deliveries.tsx
import React, { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  Dimensions,
  FlatList,
  RefreshControl,
  SectionList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MY_ICONS } from "@/assets/assetsData";
import CompletedOrderCards, {
  finishedAt,
} from "@/components/CompletedOrderCards";
import IncompleteDeliveryCard from "@/components/IncompleteDeliveryCard";
import IncompleteDeliverySkeleton from "@/components/ui/skeletons/IncompleteDeliverySkeleton";
import CompletedOrderSkeleton from "@/components/ui/skeletons/CompletedOrderSkeleton";
import {
  isActiveStatus,
  useAcceptedDeliveryStore,
} from "@/store/useAcceptedDeliveriesStore";
import ActiveDeliveriesEmptyState from "@/components/ActiveDeliveriesEmptyState";
import EarningsPanel from "@/components/EarningsPanel";
import ReturnCodeModal from "@/components/ReturnCodeModal";
import { useUserStore } from "@/store/useUserStore";

const HIGHLIGHT_WINDOW = 120_000; // 2 minutes
const ACCENT_COLOR = "#4F8EF7";

type Tab = "deliveries" | "earnings";

const TABS: { key: Tab; label: string }[] = [
  { key: "deliveries", label: "Deliveries" },
  { key: "earnings", label: "Earnings" },
];

const openDeliveryDetails = (orderCode: string) =>
  router.navigate({ pathname: "/order_detail", params: { orderCode } });

const OrdersPage = () => {
  const { width } = Dimensions.get("window");
  const { newlyAcceptedId, time_added } = useLocalSearchParams();
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<Tab>("deliveries");

  const AcceptedDeliveries = useAcceptedDeliveryStore(
    (s) => s.AcceptedDeliveries,
  );

  const loading = useAcceptedDeliveryStore((s) => s.loading);

  const fetchAcceptedDeliveries = useAcceptedDeliveryStore(
    (s) => s.fetchAcceptedDeliveries,
  );

  const userId = useUserStore((s) => s.user?.id);

  // Cancelled-after-pickup orders still waiting to go back to the sender.
  // In the store so a cancel seen on Home or a push tap updates it here too.
  const openReturns = useAcceptedDeliveryStore((s) => s.openReturnIds);
  const fetchOpenReturns = useAcceptedDeliveryStore((s) => s.fetchOpenReturns);
  const [returnOrderRef, setReturnOrderRef] = useState<string | null>(null);

  useEffect(() => {
    fetchAcceptedDeliveries();
    fetchOpenReturns();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchAcceptedDeliveries(), fetchOpenReturns()]);
    setRefreshing(false);
  };

  const acceptedTime =
    typeof time_added === "string" ? Number(time_added) : null;

  const isHighlightActive = (itemId: number) => {
    if (!acceptedTime) return false;
    if (Number(itemId) !== Number(newlyAcceptedId)) return false;
    return Date.now() - acceptedTime <= HIGHLIGHT_WINDOW;
  };

  const onGoingDeliveries = AcceptedDeliveries.filter((item) =>
    isActiveStatus(item.status),
  );

  // Delivered and cancelled, most recently finished first
  const completedDeliveries = AcceptedDeliveries.filter(
    (item) => item.status === "delivered" || item.status === "cancelled",
  ).sort((a, b) => finishedAt(b) - finishedAt(a));

  // "May 2025" groups, by when each order finished
  const completedSections: {
    title: string;
    data: typeof completedDeliveries;
  }[] = [];
  for (const item of completedDeliveries) {
    const at = finishedAt(item);
    const title = at
      ? new Date(at).toLocaleDateString("en-GB", {
          month: "long",
          year: "numeric",
        })
      : "Earlier";
    const last = completedSections[completedSections.length - 1];
    if (last?.title === title) last.data.push(item);
    else completedSections.push({ title, data: [item] });
  }

  // Cancelled trips earn nothing
  const deliveredDeliveries = completedDeliveries.filter(
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

      {/* ── Tab switcher ────────────────────────────────────────────────────── */}
      <View className="flex-row mx-6 mb-3 p-1 rounded-2xl bg-[#12141A] border border-[#1F2230]">
        {TABS.map(({ key, label }) => {
          const active = tab === key;
          return (
            <TouchableOpacity
              key={key}
              activeOpacity={0.8}
              onPress={() => setTab(key)}
              className="flex-1 items-center py-2.5 rounded-xl"
              style={active ? { backgroundColor: "#1C2E52" } : undefined}
            >
              <Text
                style={{ color: active ? ACCENT_COLOR : "#7A7F9A" }}
                className="text-sm font-bold"
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Divider />

      {tab === "earnings" ? (
        <View className="flex-1 pt-3">
          <EarningsPanel
            completedDeliveries={deliveredDeliveries}
            onRefreshDeliveries={fetchAcceptedDeliveries}
          />
        </View>
      ) : (
        <>
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
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => openDeliveryDetails(item.order_code)}
              >
                <IncompleteDeliveryCard
                  item={item}
                  index={index}
                  width={width}
                  isHighlighted={isHighlightActive(item.id)}
                />
              </TouchableOpacity>
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
          sections={completedSections}
          renderSectionHeader={({ section }) => (
            <Text className="text-sm font-bold text-[#F0F2F8] bg-[#0A0B0F] pt-4 pb-3">
              {section.title}
            </Text>
          )}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => openDeliveryDetails(item.order_code)}
            >
              <CompletedOrderCards
                item={item}
                // The order stays 'cancelled'; the return's own status lives in
                // app_returned ('returning' → 'returned'). Only cancelled orders
                // with an open return (picked up before the cancel) get the button.
                onAtReturnPoint={
                  item.status === "cancelled" &&
                  openReturns.includes(Number(item.id))
                    ? () => setReturnOrderRef(item.order_code)
                    : undefined
                }
              />
            </TouchableOpacity>
          )}
          stickySectionHeadersEnabled
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 32, paddingHorizontal: 18 }}
          ItemSeparatorComponent={() => <View className="h-3" />}
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
        </>
      )}

      <ReturnCodeModal
        visible={returnOrderRef !== null}
        orderRef={returnOrderRef}
        driverId={userId ?? ""}
        onClose={() => setReturnOrderRef(null)}
        onSuccess={() => {
          setReturnOrderRef(null);
          fetchOpenReturns();
        }}
      />
    </SafeAreaView>
  );
};

export default OrdersPage;
