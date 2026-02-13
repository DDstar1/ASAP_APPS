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
import { orderSections } from "@/utils/dummyData";
import { getClientCurrentDeliveries } from "@/lib/supabase-app-functions";
import IncompleteDeliveryCard from "@/components/IncompleteDeliveryCard";

const OrdersPage = () => {
  const { width } = Dimensions.get("window");
  const [currentDeliveries, setCurrentDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchDeliveries = async () => {
      setLoading(true);
      try {
        const response = await getClientCurrentDeliveries();
        if (response.success) {
          setCurrentDeliveries(response.data);
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

  const DirectionArrows = ({ direction }: { direction: string }) => (
    <View className="flex-row items-center">
      {direction === "right" ? (
        <>
          {MY_ICONS.arrowRight("#fed7aa", 20)}
          {MY_ICONS.arrowRight("#fed7aa", 20)}
          {MY_ICONS.arrowRight("#fed7aa", 20)}
        </>
      ) : (
        <>
          {MY_ICONS.arrowLeft("#fca5a5", 20)}
          {MY_ICONS.arrowLeft("#fca5a5", 20)}
          {MY_ICONS.arrowLeft("#fca5a5", 20)}
        </>
      )}
    </View>
  );

  const renderCompletedOrderCard = ({ item }: { item: any }) => (
    <View className="bg-orange-500 rounded-2xl p-4 mb-4">
      {/* 3 columns x 2 rows grid */}
      <View className="flex-col gap-4">
        {/* First Row - 3 cells */}
        <View className="flex-row justify-between items-start">
          {/* Cell 1 - 33.33% width */}
          <View style={{ width: "40%" }} className="pr-2">
            <Text className="text-white text-lg font-bold">{item.id}</Text>
            <View className="flex-row items-center gap-2 flex-wrap">
              <Text className="text-white text-sm font-medium">
                {item.category}
              </Text>
              <Text className="text-orange-200 text-sm">{item.distance}</Text>
            </View>
          </View>

          {/* Cell 2 - 40% width */}
          <View
            style={{ width: "25%" }}
            className="flex-col gap-1 items-center justify-start px-2"
          >
            <Text className="text-orange-200 text-sm">{item.date}</Text>
            <Text className="text-orange-200 text-sm">{item.time}</Text>
          </View>

          {/* Cell 3 - 33.33% width */}
          <View style={{ width: "35%" }} className="items-end pl-2">
            <Image
              source={item.materialImage || IMAGES.indomie_package}
              className="w-14 h-14 rounded-lg bg-white/20"
              resizeMode="cover"
            />
          </View>
        </View>

        {/* Second Row - 3 cells */}
        <View className="flex-row justify-between items-center">
          {/* Cell 4 - 33.33% width */}
          <View style={{ width: "38%" }} className="pr-2">
            <Text className="text-white text-base" numberOfLines={2}>
              {item.location}
            </Text>
          </View>

          {/* Cell 5 - 33.33% width */}
          <View style={{ width: "25%" }} className="items-center">
            <DirectionArrows direction={item.direction} />
          </View>

          {/* Cell 6 - 33.33% width */}
          <View style={{ width: "38%" }} className="items-end pl-2">
            <Text className="text-white text-base" numberOfLines={2}>
              {item.location}
            </Text>
          </View>
        </View>
      </View>
    </View>
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
        <Text className="text-white text-2xl font-semibold">My Orders</Text>
        {MY_ICONS.message("white", 24)}
      </View>

      {/* Current Tracking Cards (Horizontal Scroll) */}
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
          maxHeight: currentDeliveries.length > 0 ? 250 : 100,
        }}
        keyExtractor={(item, index) => `${item.order_code}-${index}`}
        renderItem={({ item }) => (
          <IncompleteDeliveryCard item={item} width={width} />
        )}
        ListEmptyComponent={() => (
          <View
            style={{ width: width * 0.9, padding: 35 }}
            className="bg-gray-700 rounded-2xl flex justify-center items-center"
          >
            <Text className="text-white text-base">No current deliveries</Text>
          </View>
        )}
      />

      {/* Orders History List with Sticky Headers */}
      <SectionList
        sections={orderSections}
        keyExtractor={(item, index) => item.id + index}
        renderItem={renderCompletedOrderCard}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled={true}
        className="flex-1 px-6"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </SafeAreaView>
  );
};

export default OrdersPage;
