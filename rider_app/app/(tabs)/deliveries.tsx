// app/(tabs)/deliveries.tsx
import React, { useEffect, useMemo } from "react";
import { useLocalSearchParams } from "expo-router";
import { Dimensions, FlatList, SectionList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MY_ICONS } from "@/assets/assetsData";
import CompletedOrderCards from "@/components/CompletedOrderCards";
import IncompleteDeliveryCard from "@/components/IncompleteDeliveryCard";
import IncompleteDeliverySkeleton from "@/components/ui/skeletons/IncompleteDeliverySkeleton";
import CompletedOrderSkeleton from "@/components/ui/skeletons/CompletedOrderSkeleton";
import { useAcceptedDeliveryStore } from "@/store/useAcceptedDeliveriesStore";

const HIGHLIGHT_WINDOW = 120_000; // 2 minutes

const OrdersPage = () => {
  const { width } = Dimensions.get("window");
  const { newlyAcceptedId, time_added } = useLocalSearchParams();

  const { AcceptedDeliveries, loading, fetchAcceptedDeliveries } =
    useAcceptedDeliveryStore();

  useEffect(() => {
    fetchAcceptedDeliveries();
  }, []);

  // ✅ Parse accepted time safely
  const acceptedTime =
    typeof time_added === "string" ? Number(time_added) : null;

  // ✅ Highlight logic
  const isHighlightActive = (itemId: number) => {
    const now = Date.now();

    if (!acceptedTime) return false;
    if (Number(itemId) !== Number(newlyAcceptedId)) return false;

    const elapsed = now - acceptedTime;
    return elapsed <= HIGHLIGHT_WINDOW;
  };

  // ✅ Separate deliveries properly
  const activeDeliveries = useMemo(
    () =>
      AcceptedDeliveries.filter(
        (item) =>
          item.status === "pending" ||
          item.status === "arriving_pickup" ||
          item.status === "in_transit",
      ),
    [AcceptedDeliveries],
  );

  const completedDeliveries = useMemo(
    () => AcceptedDeliveries.filter((item) => item.status === "delivered"),
    [AcceptedDeliveries],
  );

  const renderSectionHeader = ({ section }: { section: any }) => (
    <View className="bg-gray-900 py-2">
      <Text className="text-gray-400 text-sm">{section.title}</Text>
    </View>
  );

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-gray-900">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <Text className="text-white text-2xl font-semibold">
          All Deliveries
        </Text>
        {MY_ICONS.delivery("white", 24)}
      </View>

      {/* ================= ACTIVE DELIVERIES ================= */}
      <Text className="text-white text-center text-2xl font-medium mb-1">
        Current Delivery
      </Text>

      {loading ? (
        <FlatList
          horizontal
          data={[1, 2, 3]}
          keyExtractor={(item) => item.toString()}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
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
            paddingHorizontal: 16,
            marginBottom: 10,
            alignItems: "center",
          }}
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
            <View
              style={{ width: width * 0.9, padding: 35 }}
              className="bg-gray-700 rounded-2xl flex justify-center items-center"
            >
              <Text className="text-white text-base">
                No current deliveries
              </Text>
            </View>
          )}
        />
      )}

      {/* ================= COMPLETED DELIVERIES ================= */}
      <Text className="text-white text-center text-2xl font-medium mb-1">
        Completed Deliveries
      </Text>

      {loading ? (
        <View className="px-6">
          {[1, 2, 3, 4].map((_, index) => (
            <CompletedOrderSkeleton key={index} />
          ))}
        </View>
      ) : (
        <SectionList
          sections={[
            {
              title: "Completed",
              data: completedDeliveries,
            },
          ]}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={({ item }) => <CompletedOrderCards item={item} />}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled
          className="flex-1 px-6"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
          ListEmptyComponent={() => (
            <Text className="text-gray-500 text-center mt-4">
              No completed deliveries yet
            </Text>
          )}
        />
      )}
    </SafeAreaView>
  );
};

export default OrdersPage;
