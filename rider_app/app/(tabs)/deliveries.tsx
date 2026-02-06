import React, { useEffect, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  SectionList,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { IMAGES, MY_ICONS } from "@/assets/assetsData";
import {
  getOrderClientInfo,
  getRiderCurrentDeliveries,
} from "@/lib/supabase-functions";
import { orderSections } from "@/utils/dummyData";
import CompletedOrderCards from "@/components/CompletedOrderCards";
import IncompleteDeliveryCard from "@/components/IncompleteDeliveryCard";
import IncompleteDeliverySkeleton from "@/components/ui/skeletons/IncompleteDeliverySkeleton";
import CompletedOrderSkeleton from "@/components/ui/skeletons/CompletedOrderSkeleton";

const OrdersPage = () => {
  const [currentDeliveries, setCurrentDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { width } = Dimensions.get("window");

  useEffect(() => {
    const fetchDeliveries = async () => {
      setLoading(true);
      try {
        const response = await getRiderCurrentDeliveries();
        if (response.success) {
          setCurrentDeliveries(response.data);
          //console.log("✅ Fetched deliveries:", response.data);
        } else {
          console.error("❌ Failed to fetch deliveries:", response.error);
        }
      } catch (err) {
        console.error("❌ Error fetching deliveries:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchDeliveries();
  }, []);

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

      {/* Current Tracking Cards (Horizontal Scroll) */}
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
            <IncompleteDeliveryCard item={item} index={index} width={width} />
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

      {/* Orders History List with Sticky Headers */}
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
