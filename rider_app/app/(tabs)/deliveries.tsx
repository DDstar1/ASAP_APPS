// app/(tabs)/deliveries.tsx
import React, { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import {
  RefreshControl,
  SectionList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import CompletedOrderCards, {
  finishedAt,
} from "@/components/CompletedOrderCards";
import IncompleteDeliveryCard from "@/components/IncompleteDeliveryCard";
import CompletedOrderSkeleton from "@/components/ui/skeletons/CompletedOrderSkeleton";
import {
  isActiveStatus,
  useAcceptedDeliveryStore,
} from "@/store/useAcceptedDeliveriesStore";
import EarningsPanel from "@/components/EarningsPanel";
import ReturnCodeModal from "@/components/ReturnCodeModal";
import { useUserStore } from "@/store/useUserStore";

const HIGHLIGHT_WINDOW = 120_000; // 2 minutes
const ORANGE = "#FF7518";
const GREEN = "#16A34A";

type Tab = "deliveries" | "earnings";

// Earnings is money, so its tab lights up green
const TABS: { key: Tab; label: string; color: string }[] = [
  { key: "deliveries", label: "Orders", color: ORANGE },
  { key: "earnings", label: "Earnings", color: GREEN },
];

// orderCode is the screen title; get-trip is looked up by payment_reference
const openDeliveryDetails = (
  orderCode: string,
  paymentReference: string | null | undefined,
) =>
  router.navigate({
    pathname: "/order_detail",
    params: { orderCode, paymentReference: paymentReference ?? "" },
  });

const OrdersPage = () => {
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

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={onRefresh}
      tintColor={ORANGE}
      colors={[ORANGE]}
    />
  );

  // Active orders stack above the history, one card each
  const activeHeader = (
    <View className="pb-2">
      <Text className="text-white text-lg font-bold mb-3">
        {onGoingDeliveries.length > 1
          ? `Current Deliveries (${onGoingDeliveries.length})`
          : "Current Delivery"}
      </Text>
      {onGoingDeliveries.length === 0 ? (
        <View className="bg-[#212126] rounded-3xl px-5 py-6 flex-row items-center gap-4">
          <View className="w-11 h-11 rounded-full bg-[#3C3C43] items-center justify-center">
            <Ionicons name="bicycle" size={22} color={ORANGE} />
          </View>
          <View className="flex-1">
            <Text className="text-white font-semibold">No active delivery</Text>
            <Text className="text-gray-400 text-xs mt-0.5">
              Go online on Home to receive new orders
            </Text>
          </View>
        </View>
      ) : (
        onGoingDeliveries.map((item) => (
          <TouchableOpacity
            key={`${item.order_code}-${item.id}`}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`Open order ${item.order_code}`}
            onPress={() =>
              openDeliveryDetails(item.order_code, item.payment_reference)
            }
          >
            <IncompleteDeliveryCard
              item={item}
              isHighlighted={isHighlightActive(item.id)}
            />
          </TouchableOpacity>
        ))
      )}
    </View>
  );

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-black">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <View className="px-5 pt-3 pb-4">
        <Text className="text-[28px] font-extrabold text-white">
          {tab === "earnings" ? "Earnings" : "My Orders"}
        </Text>
      </View>

      {/* ── Tab switcher ────────────────────────────────────────────────────── */}
      <View
        className="flex-row mx-5 mb-3 p-1 rounded-full bg-[#212126]"
        accessibilityRole="tablist"
      >
        {TABS.map(({ key, label, color }) => {
          const active = tab === key;
          return (
            <TouchableOpacity
              key={key}
              activeOpacity={0.8}
              onPress={() => setTab(key)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              className="flex-1 h-11 flex-row items-center justify-center gap-1.5 rounded-full"
              style={active ? { backgroundColor: color } : undefined}
            >
              <Ionicons
                name={key === "earnings" ? "wallet" : "cube"}
                size={16}
                color={active ? "white" : "#9CA3AF"}
              />
              <Text
                style={{ color: active ? "white" : "#9CA3AF" }}
                className="text-sm font-bold"
              >
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {tab === "earnings" ? (
        <View className="flex-1 pt-2">
          <EarningsPanel
            completedDeliveries={deliveredDeliveries}
            onRefreshDeliveries={fetchAcceptedDeliveries}
          />
        </View>
      ) : loading && AcceptedDeliveries.length === 0 ? (
        <View className="flex-1 px-5 pt-2 gap-4">
          {[1, 2, 3, 4].map((_, index) => (
            <CompletedOrderSkeleton key={index} />
          ))}
        </View>
      ) : (
        <SectionList
          sections={completedSections}
          ListHeaderComponent={activeHeader}
          renderSectionHeader={({ section }) => (
            <Text className="text-lg font-bold text-white bg-black pt-4 pb-1">
              {section.title}
            </Text>
          )}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.85}
              className="my-2"
              onPress={() =>
                openDeliveryDetails(item.order_code, item.payment_reference)
              }
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
          className="flex-1 px-5"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: 8, paddingBottom: 32 }}
          refreshControl={refreshControl}
          ListFooterComponent={
            completedSections.length === 0 ? (
              <View className="py-8 items-center">
                <Ionicons name="archive-outline" size={32} color="#6B6B70" />
                <Text className="text-sm text-gray-400 mt-2">
                  No completed deliveries yet
                </Text>
              </View>
            ) : null
          }
        />
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
