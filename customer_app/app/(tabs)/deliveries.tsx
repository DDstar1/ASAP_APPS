// app/(tabs)/deliveries.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  RefreshControl,
  SectionList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import IncompleteDeliveryCard from "@/components/IncompleteDeliveryCard";
import CompletedOrderCards, {
  finishedAt,
} from "@/components/CompletedOrderCards";
import CompletedOrderSkeleton from "@/components/ui/skeletons/CompletedOrderSkeleton";
import CompletedOrdersEmptyState from "@/components/CompletedOrdersEmptyState";
import { useCustomerDeliveryStore } from "@/store/useCustomerDeliveriesStore";
import { router } from "expo-router";
import SelectItemTypeScreen from "@/components/SelectItemTypeScreen";

// Orders a rider is still working on (or still being found for)
const ACTIVE_STATUSES = [
  "pending",
  "arriving_pickup",
  "in_transit",
  "driver_arrived",
];

const OrdersPage = () => {
  const [ItemTypeVisible, setItemTypeVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const { AllDeliveries, loading, fetchAllDeliveries } =
    useCustomerDeliveryStore();

  useEffect(() => {
    fetchAllDeliveries();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchAllDeliveries();
    setRefreshing(false);
  };

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

        <TouchableOpacity
          onPress={() => router.push("/all_chats")}
          accessibilityRole="button"
          accessibilityLabel="Messages"
          className="w-11 h-11 rounded-full bg-[#3C3C43] items-center justify-center"
        >
          <Ionicons name="chatbubble-ellipses-outline" size={20} color="white" />
        </TouchableOpacity>
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
          renderItem={({ item }) => (
            <CompletedOrderCards
              item={item}
              onRebook={() => setItemTypeVisible(true)}
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
              tintColor="#EE7F3A"
              colors={["#EE7F3A"]}
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

      {/* Select Item Modal */}
      <SelectItemTypeScreen
        visible={ItemTypeVisible}
        onClose={() => setItemTypeVisible(false)}
        onConfirm={async (packageType, description) => {
          try {
            router.navigate({
              pathname: "/map",
              params: {
                packageType,
                packageDescription: description,
              },
            });
          } catch (error) {
            console.error("Failed to save package type:", error);
            Alert.alert("Error", "Failed to save package type");
            router.navigate("/map");
          }
        }}
      />
    </SafeAreaView>
  );
};

export default OrdersPage;
