import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import MaskedView from "@react-native-masked-view/masked-view";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { openGoogleMaps, openOrderChat } from "@/utils/utils_for_me";
import { IMAGES, MY_ICONS } from "@/assets/assetsData";
import { useUnreadCountStore } from "@/store/useUnreadCountStore";

type Props = {
  item: any;
  index?: number;
  width: number;
  isHighlighted?: boolean;
};

export default function IncompleteDeliveryCard({
  item,
  index,
  width,
  isHighlighted = false,
}: Props) {
  const rawStatus = item.status;
  const normalizedStatus = rawStatus?.trim().toLowerCase();

  const unreadCount = useUnreadCountStore(
    (state) => state.counts[item.id] ?? 0,
  );

  // Animated value for shiny border
  const shimmer = useSharedValue(0);

  useEffect(() => {
    if (isHighlighted) {
      shimmer.value = withRepeat(
        withTiming(1, { duration: 1500, easing: Easing.linear }),
        3,
        false,
      );
    }
  }, [isHighlighted]);

  const animatedBorderStyle = useAnimatedStyle(() => {
    if (!isHighlighted) return {};

    return {
      borderWidth: 3,
      borderColor: `hsl(${shimmer.value * 360}, 100%, 50%)`,
      shadowColor: `hsl(${shimmer.value * 360}, 100%, 50%)`,
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0.8,
      shadowRadius: 10,
      elevation: 10,
    };
  });

  return (
    <Animated.View
      style={[animatedBorderStyle, { marginRight: 16 }]}
      className="rounded-2xl overflow-hidden"
    >
      <View
        key={index}
        style={{ width: width * 0.85, height: "100%" }}
        className="bg-[#3C3C43] h-fit rounded-2xl gap-2 flex items-center flex-row overflow-hidden relative p-3"
      >
        {/* Top-right action buttons */}
        <View className="absolute top-3 z-20 right-3 flex-col gap-3">
          {/* Message button */}
          {normalizedStatus !== "pending" && (
            <TouchableOpacity
              onPress={() => openOrderChat(item.id)}
              className="p-2 bg-gray-200 rounded-full"
            >
              {MY_ICONS.message("black", 25)}

              {/* Unread badge */}
              {unreadCount > 0 && (
                <View className="absolute -top-1 -right-1 bg-red-500 rounded-full min-w-[18px] h-[18px] items-center justify-center px-1">
                  <Text className="text-white text-[10px] font-bold">
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Navigation Buttons */}
        <View className="flex-row gap-2 absolute bottom-3 z-20 right-3 items-center">
          <TouchableOpacity
            onPress={() =>
              openGoogleMaps({
                order_status: item.status,
                pickupLat: item.pickup_lat,
                pickupLng: item.pickup_long,
                dropoffLat: item.dropoff_lat,
                dropoffLng: item.dropoff_long,
                navigateTo: "pickup",
              })
            }
            className="px-3 py-2 bg-blue-500 rounded-lg flex-row items-center justify-center gap-1"
          >
            {MY_ICONS.map("white", 16)}
            <Text className="text-white text-xs font-semibold">To Pickup</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              openGoogleMaps({
                order_status: item.status,
                pickupLat: item.pickup_lat,
                pickupLng: item.pickup_long,
                dropoffLat: item.dropoff_lat,
                dropoffLng: item.dropoff_long,
                navigateTo: "dropoff",
              })
            }
            className="px-3 py-2 bg-green-500 rounded-lg flex-row items-center justify-center gap-1"
          >
            {MY_ICONS.map("white", 16)}
            <Text className="text-white text-xs font-semibold">To Dropoff</Text>
          </TouchableOpacity>
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

          {/* Status */}
          <View className="flex-row items-center justify-between w-full">
            <View className="flex-col">
              <Text className="text-gray-400 text-xs mb-1">Status</Text>
              <View className="flex-row items-center">
                {MY_ICONS.circle(item.statusColor ?? "#22C55E", 7)}
                <Text className="text-white text-sm ml-2">
                  {rawStatus?.replace("_", " ")}
                </Text>
              </View>
            </View>
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
    </Animated.View>
  );
}
