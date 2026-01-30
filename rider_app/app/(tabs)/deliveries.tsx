import React, { useEffect, useState } from "react";
import {
  Dimensions,
  FlatList,
  Image,
  SectionList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { IMAGES, MY_ICONS } from "@/assets/assetsData";
import {
  getOrderClientInfo,
  getRiderCurrentDeliveries,
} from "@/lib/supabase-functions";
import { orderSections } from "@/utils/dummyData";
import { openGoogleMaps } from "@/utils/my_utils";
import { router } from "expo-router";

const OrdersPage = () => {
  const { width } = Dimensions.get("window");
  const [currentDeliveries, setCurrentDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const openOrderChat = async (orderId: number) => {
    try {
      const clientInfo = await getOrderClientInfo(orderId);

      if (!clientInfo) return;

      router.push({
        pathname: "chat_details/[order_id]",
        params: {
          order_id: orderId, // must match the route param
          name: clientInfo.name,
        },
      });
    } catch (error) {
      console.error("Failed to open order chat:", error);
    }
  };

  useEffect(() => {
    const fetchDeliveries = async () => {
      setLoading(true);
      try {
        const response = await getRiderCurrentDeliveries();
        if (response.success) {
          setCurrentDeliveries(response.data);
          console.log("✅ Fetched deliveries:", response.data);
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

  const renderOrderCard = ({ item }: { item: any }) => (
    <>
      <View className="flex-col gap-4 justify-between bg-orange-500 rounded-2xl p-4 mb-4">
        <View className="flex-row justify-between w-full mb-2">
          <View>
            <Text className="text-white text-lg font-bold">{item.id}</Text>
            <View className="flex-row items-center gap-3">
              <Text className="text-white text-sm font-medium">
                {item.category}
              </Text>
              <Text className="text-orange-200 text-sm">{item.distance}</Text>
            </View>
          </View>

          <View className="flex-col gap-1 items-start justify-between mb-2">
            <Text className="text-orange-200 text-sm">{item.date}</Text>
            <Text className="text-orange-200 text-sm">{item.time}</Text>
          </View>

          {/* Material Image */}
          <Image
            source={item.materialImage || IMAGES.indomie_package}
            className="w-14 h-14 rounded-lg bg-white/20"
            resizeMode="cover"
          />
        </View>

        <View className="flex-row justify-between w-full mb-2">
          <Text className="text-white text-base">{item.location}</Text>
          <DirectionArrows direction={item.direction} />
          <Text className="text-white text-base">{item.location}</Text>
        </View>
      </View>
    </>
  );

  const renderDeliveryCard = (item: any, index: number) => (
    <View
      key={index}
      style={{ width: width * 0.9, height: "100%" }}
      className="bg-[#3C3C43] h-fit rounded-2xl gap-2 flex items-center flex-row overflow-hidden relative p-3 mr-4"
    >
      {/* Top-right action buttons */}
      <View className="absolute top-0 right-0 flex gap-3 z-10">
        {/* Map button */}
        <TouchableOpacity
          onPress={() => openGoogleMaps(item.dropoff_lat, item.dropoff_long)}
          className="p-2 bg-gray-200 rounded-full"
        >
          {MY_ICONS.map("black", 25)}
        </TouchableOpacity>

        {/* Message button */}
        <TouchableOpacity
          onPress={() => openOrderChat(item.id)}
          className="p-2 bg-gray-200 rounded-full"
        >
          {MY_ICONS.message("black", 25)}
        </TouchableOpacity>
      </View>
      {/* Left Side */}
      <View className="flex-1 mr-2">
        {/* Order / ID */}
        <Text className="text-white text-lg font-bold mb-2">
          #{item.order_code}
        </Text>

        {/* Pickup Point */}
        <Text className="text-gray-400 text-xs mb-1">Pickup</Text>
        <View className="flex-row items-center mb-2">
          {MY_ICONS.location("#9CA3AF", 14)}
          <Text numberOfLines={2} className="text-white text-sm ml-2">
            {item.pickup_name || "Unknown"}
          </Text>
        </View>

        {/* Dropoff Point */}
        <Text className="text-gray-400 text-xs mb-1">Dropoff</Text>
        <View className="flex-row items-center mb-2">
          {MY_ICONS.location("#9CA3AF", 14)}
          <Text numberOfLines={2} className="text-white text-sm ml-2">
            {item.dropoff_name || "Unknown"}
          </Text>
        </View>

        {/* Status */}
        <Text className="text-gray-400 text-xs mb-1">Status</Text>
        <View className="flex-row items-center">
          {MY_ICONS.circle(item.statusColor ?? "#22C55E", 7)}
          <Text className="text-white text-sm ml-2">
            {item.status.replace("_", " ")}
          </Text>
        </View>
      </View>

      {/* Map / Image */}
      <Image
        style={{ width: 120, height: "100%" }}
        source={item.map || IMAGES.indomie_package}
        className="w-32 h-32 rounded-lg overflow-hidden bg-white"
        resizeMode="contain"
      />
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
        <Text className="text-white text-2xl font-semibold">
          All Deliveries
        </Text>
        {MY_ICONS.message("white", 24)}
      </View>

      {/* Current Tracking Cards (Horizontal Scroll) */}
      <Text className="text-white text-center text-2xl font-medium mb-1">
        Current Delivery
      </Text>
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
        renderItem={({ item, index }) => renderDeliveryCard(item, index)}
        ListEmptyComponent={() => (
          <View
            style={{ width: width * 0.9, padding: 35 }}
            className="bg-gray-700  rounded-2xl flex justify-center items-center  "
          >
            <Text className="text-white text-base">No current deliveries</Text>
          </View>
        )}
      />
      {/* Orders History List with Sticky Headers */}
      <Text className="text-white text-center text-2xl font-medium mb-1">
        Completed Deliveries
      </Text>
      <SectionList
        sections={orderSections}
        keyExtractor={(item, index) => item.id + index}
        renderItem={renderOrderCard}
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
