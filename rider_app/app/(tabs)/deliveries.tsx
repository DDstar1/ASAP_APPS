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
import { LinearGradient } from "expo-linear-gradient";
import MaskedView from "@react-native-masked-view/masked-view";

import { IMAGES, MY_ICONS } from "@/assets/assetsData";
import {
  getOrderClientInfo,
  getRiderCurrentDeliveries,
} from "@/lib/supabase-functions";
import { orderSections } from "@/utils/dummyData";
import { openGoogleMaps, openOrderChat } from "@/utils/utils_for_me";

const OrdersPage = () => {
  const { width } = Dimensions.get("window");
  const [currentDeliveries, setCurrentDeliveries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Inside your renderIncompleteDeliveryCard
const renderIncompleteDeliveryCard = (item: any, index: number) => {
  const rawStatus = item.status;
  const normalizedStatus = rawStatus?.trim().toLowerCase();

  console.log("📦 Delivery card render", {
    orderId: item.id,
    rawStatus: `"${rawStatus}"`,
    rawLength: rawStatus?.length,
    normalizedStatus,
    shouldShowMessageButton: normalizedStatus !== "pending",
  });

  return (
    <View
      key={index}
      style={{ width: width * 0.9, height: "100%" }}
      className="bg-[#3C3C43] h-fit rounded-2xl gap-2 flex items-center flex-row overflow-hidden relative p-3 mr-4"
    >
      {/* Top-right action buttons */}
      <View className="absolute top-3 z-20 right-3 flex-col gap-3">
        {/* Map button */}
        <TouchableOpacity
          onPress={() => openGoogleMaps(item.dropoff_lat, item.dropoff_long)}
          className="p-2 bg-gray-200 rounded-full"
        >
          {MY_ICONS.map("black", 25)}
        </TouchableOpacity>

        {/* Message button */}
        {normalizedStatus !== "pending" && (
          <TouchableOpacity
            onPress={() => openOrderChat(item.id)}
            className="p-2 bg-gray-200 rounded-full"
          >
            {MY_ICONS.message("black", 25)}
          </TouchableOpacity>
        )}
      </View>

      {/* Left Side */}
      <View className="flex-1 mr-20 z-10">
        <Text className="text-white text-lg font-bold mb-2">
          #{item.order_code}
        </Text>

        <Text className="text-gray-400 text-xs mb-1">Pickup</Text>
        <View className="flex-row items-center mb-2">
          {MY_ICONS.location("#9CA3AF", 14)}
          <Text numberOfLines={2} className="text-white text-sm ml-2">
            {item.pickup_name || "Unknown"}
          </Text>
        </View>

        <Text className="text-gray-400 text-xs mb-1">Dropoff</Text>
        <View className="flex-row items-center mb-2">
          {MY_ICONS.location("#9CA3AF", 14)}
          <Text numberOfLines={2} className="text-white text-sm ml-2">
            {item.dropoff_name || "Unknown"}
          </Text>
        </View>

        <Text className="text-gray-400 text-xs mb-1">Status</Text>
        <View className="flex-row items-center">
          {MY_ICONS.circle(item.statusColor ?? "#22C55E", 7)}
          <Text className="text-white text-sm ml-2">
            {rawStatus?.replace("_", " ")}
          </Text>
        </View>
      </View>

      {/* Map / Image */}
      <MaskedView
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: "50%",
          height: "110%",
        }}
        maskElement={
          <LinearGradient
            colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.3)"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ flex: 1 }}
          />
        }
      >
        <Image
          source={IMAGES.indomie_package}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
        />
      </MaskedView>
    </View>
  );
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
        renderItem={({ item, index }) => renderIncompleteDeliveryCard(item, index)}
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
