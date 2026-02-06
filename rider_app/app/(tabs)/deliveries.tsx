// app/(tabs)/deliveries.tsx
import React, { useEffect } from "react";
import { useLocalSearchParams } from "expo-router";
import { Dimensions, FlatList, SectionList, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MY_ICONS } from "@/assets/assetsData";
import { orderSections } from "@/utils/dummyData";
import CompletedOrderCards from "@/components/CompletedOrderCards";
import IncompleteDeliveryCard from "@/components/IncompleteDeliveryCard";
import IncompleteDeliverySkeleton from "@/components/ui/skeletons/IncompleteDeliverySkeleton";
import CompletedOrderSkeleton from "@/components/ui/skeletons/CompletedOrderSkeleton";
import { useCurrentDeliveryStore } from "@/store/useCurrentDeliveriesStore";

const HIGHLIGHT_WINDOW = 120_00; // 10 seconds

const OrdersPage = () => {
  const { width } = Dimensions.get("window");

  const { newlyAcceptedId, time_added } = useLocalSearchParams();

  const { currentDeliveries, loading, fetchCurrentDeliveries } =
    useCurrentDeliveryStore();

  useEffect(() => {
    fetchCurrentDeliveries();
  }, []);

  // ✅ Parse time safely
  const acceptedTime =
    typeof time_added === "string" ? Number(time_added) : null;

  // ✅ Single source of truth for highlight
  const isHighlightActive = (itemId: Number) => {
    const now = Date.now();

    console.log("🟡 Highlight check start", {
      itemId,
      newlyAcceptedId,
      acceptedTime,
      now,
    });

    if (!acceptedTime) {
      console.log("❌ No acceptedTime → highlight disabled");
      return false;
    }

    if (Number(itemId) !== Number(newlyAcceptedId)) {
      console.log("❌ ID mismatch", {
        itemId,
        newlyAcceptedId,
      });
      return false;
    }

    const elapsed = now - acceptedTime;
    const isActive = elapsed <= HIGHLIGHT_WINDOW;

    console.log(isActive ? "✅ Highlight ACTIVE" : "⏱️ Highlight EXPIRED", {
      elapsedMs: elapsed,
      windowMs: HIGHLIGHT_WINDOW,
      remainingMs: Math.max(HIGHLIGHT_WINDOW - elapsed, 0),
    });

    return isActive;
  };

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

      {/* Current Deliveries */}
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
          style={{
            maxHeight: currentDeliveries.length > 0 ? 230 : 100,
          }}
          renderItem={() => <IncompleteDeliverySkeleton width={width} />}
        />
      ) : (
        <FlatList
          data={currentDeliveries}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 16,
            marginBottom: 10,
            alignItems: "center",
            justifyContent: "center",
          }}
          style={{
            maxHeight: currentDeliveries.length > 0 ? 230 : 100,
          }}
          keyExtractor={(item, index) => `${item.order_code}-${index}`}
          renderItem={({ item, index }) => (
            <IncompleteDeliveryCard
              item={item}
              index={index}
              width={width}
              isHighlighted={isHighlightActive(item.id)} // ✅ clean + correct
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

      {/* Completed Deliveries */}
      <Text className="text-white text-center text-2xl font-medium mb-1">
        Completed Deliveries
      </Text>

      {loading ? (
        <View className="px-6">
          {[1, 2, 3, 4, 5, 6].map((_, index) => (
            <CompletedOrderSkeleton key={index} />
          ))}
        </View>
      ) : (
        <SectionList
          sections={orderSections}
          keyExtractor={(item, index) => item.id + index}
          renderItem={({ item }) => <CompletedOrderCards item={item} />}
          renderSectionHeader={renderSectionHeader}
          stickySectionHeadersEnabled
          className="flex-1 px-6"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </SafeAreaView>
  );
};

export default OrdersPage;
