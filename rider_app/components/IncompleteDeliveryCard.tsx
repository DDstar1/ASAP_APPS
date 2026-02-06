import React from "react";
import { View, Text, TouchableOpacity, Image, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import MaskedView from "@react-native-masked-view/masked-view";
import { openGoogleMaps, openOrderChat } from "@/utils/utils_for_me";
import { IMAGES, MY_ICONS } from "@/assets/assetsData";

type Props = {
  item: any;
  index?: number;
  width: number;
};

export default function IncompleteDeliveryCard({ item, index, width }: Props) {
  const rawStatus = item.status;
  const normalizedStatus = rawStatus?.trim().toLowerCase();

  console.log("📦 Delivery card render", {
    orderId: item.id,
    rawStatus: `"${rawStatus}"`,
    rawLength: rawStatus?.length,
    normalizedStatus,
    shouldShowMessageButton: normalizedStatus !== "pending",
  });
  console.log("📦 Item data:", item);

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
          onPress={() =>
            openGoogleMaps({
              order_status: item.status,
              pickupLat: item.pickup_lat,
              pickupLng: item.pickup_long,
              dropoffLat: item.dropoff_lat,
              dropoffLng: item.dropoff_long,
            })
          }
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

      {/* Image */}
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
          source={
            item.image_url ? { uri: item.image_url } : IMAGES.indomie_package
          }
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
        />
      </MaskedView>
    </View>
  );
}
