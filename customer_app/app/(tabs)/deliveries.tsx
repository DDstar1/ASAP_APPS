// app/(tabs)/deliveries.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  RefreshControl,
  SectionList,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import IncompleteDeliveryCard from "@/components/IncompleteDeliveryCard";
import CompletedOrderCards, {
  finishedAt,
} from "@/components/CompletedOrderCards";
import CompletedOrderSkeleton from "@/components/ui/skeletons/CompletedOrderSkeleton";
import CompletedOrdersEmptyState from "@/components/CompletedOrdersEmptyState";
import { useCustomerDeliveryStore } from "@/store/useCustomerDeliveriesStore";
import { router } from "expo-router";
import ReviewCard, { PackageReview } from "@/components/ReviewCard";
import { supabase } from "@/lib/supabase";

// RLS returns only disputes on the signed-in customer's orders
async function fetchReviews() {
  const { data } = await supabase
    .from("back_package_disputes")
    .select("id, order_id, reason, status, refund_amount, refund_status, created_at")
    .order("created_at", { ascending: false });
  return (data ?? []) as PackageReview[];
}

// Orders a rider is still working on (or still being found for)
const ACTIVE_STATUSES = [
  "pending",
  "arriving_pickup",
  "in_transit",
  "driver_arrived",
];

const OrdersPage = () => {
  const [refreshing, setRefreshing] = useState(false);
  const { AllDeliveries, loading, fetchAllDeliveries } =
    useCustomerDeliveryStore();

  const [reviews, setReviews] = useState<PackageReview[]>([]);

  useEffect(() => {
    fetchAllDeliveries();
    fetchReviews().then(setReviews);
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    const [, latest] = await Promise.all([fetchAllDeliveries(), fetchReviews()]);
    setReviews(latest);
    setRefreshing(false);
  };

  const reviewsFooter =
    reviews.length > 0 ? (
      <View className="pt-4">
        <Text className="text-lg font-bold text-white pb-1">
          {reviews.some((r) => r.status === "pending") ? "Pending Reviews" : "Reviews"}
        </Text>
        {reviews.map((review) => (
          <ReviewCard
            key={review.id}
            review={review}
            orderCode={
              AllDeliveries.find((d) => Number(d.id) === review.order_id)?.order_code ??
              `#${review.order_id}`
            }
          />
        ))}
      </View>
    ) : null;

  const activeDeliveries = useMemo(
    () => AllDeliveries.filter((item) => ACTIVE_STATUSES.includes(item.status)),
    [AllDeliveries],
  );

  const completedDeliveries = useMemo(
    // Delivered and cancelled, most recently finished first
    () =>
      AllDeliveries.filter(
        (item) => item.status === "delivered" || item.status === "cancelled",
      ).sort((a, b) => finishedAt(b) - finishedAt(a)),

    [AllDeliveries],
  );

  // "May 2025" groups, by when each order finished
  const completedSections = useMemo(() => {
    const groups: { title: string; data: typeof completedDeliveries }[] = [];
    for (const item of completedDeliveries) {
      const at = finishedAt(item);
      const title = at
        ? new Date(at).toLocaleDateString("en-GB", {
            month: "long",
            year: "numeric",
          })
        : "Earlier";
      const last = groups[groups.length - 1];
      if (last?.title === title) last.data.push(item);
      else groups.push({ title, data: [item] });
    }
    return groups;
  }, [completedDeliveries]);

  // Active orders sit above the history, one "Current Tracking" card each
  const activeHeader = (
    <View className="pb-2">
      {activeDeliveries.length > 0 && (
        <>
          <Text className="text-white text-lg font-bold mb-3">
            {activeDeliveries.length > 1
              ? `Current Tracking (${activeDeliveries.length})`
              : "Current Tracking"}
          </Text>
          {activeDeliveries.map((item) => (
            <IncompleteDeliveryCard key={String(item.id)} item={item} />
          ))}
        </>
      )}
    </View>
  );

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-black">
      {/* ── Header ── */}
      <View className="flex-row items-center justify-between px-5 pt-3 pb-4">
        <Text className="text-[28px] font-extrabold text-white">My Orders</Text>
      </View>

      {loading && AllDeliveries.length === 0 ? (
        <View className="flex-1 px-5 gap-3">
          {[1, 2, 3, 4].map((_, i) => (
            <CompletedOrderSkeleton key={i} />
          ))}
        </View>
      ) : (
        <SectionList
          sections={completedSections}
          keyExtractor={(item, index) => `${String(item.id)}-${index}`}
          ListHeaderComponent={activeHeader}
          ListFooterComponent={reviewsFooter}
          renderItem={({ item }) => (
            <CompletedOrderCards
              item={item}
              onRebook={() =>
                router.navigate({ pathname: "/map", params: { rebook: String(item.id) } })
              }
            />
          )}
          renderSectionHeader={({ section }) => (
            <Text className="text-lg font-bold text-white bg-black pt-4 pb-1">
              {section.title}
            </Text>
          )}
          stickySectionHeadersEnabled
          className="px-5"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#FF7518"
              colors={["#FF7518"]}
            />
          }
          contentContainerStyle={{ paddingBottom: 32, flexGrow: 1 }}
          ListEmptyComponent={() => (
            <CompletedOrdersEmptyState
              activeDeliveriesCount={activeDeliveries.length}
              onSendPackage={() => router.push("/map")}
            />
          )}
        />
      )}
    </SafeAreaView>
  );
};

export default OrdersPage;
