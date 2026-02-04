import { cleanAddress, timeAgo } from "@/utils/utils_for_me";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";

interface OrderSummaryProps {
  order: {
    id: number;
    pickup_name: string;
    dropoff_name: string;
    price: string;
    distance: string;
    eta: string;
    pickupTime: string;
    created_at: string;
  };
  onAccept?: () => void;
}

const OrderSummary = ({ order, onAccept }: OrderSummaryProps) => {
  return (
    <View className="bg-white flex-col gap-3 rounded-2xl p-4 mb-3 border border-gray-100">
      {/* Header with Price */}
      <View className="flex-row justify-between items-center mb-3">
        <View className="flex-row gap-1 items-center bg-gray-100 px-3 py-1 rounded-full">
          <Ionicons name="time-outline" size={14} color="#6B7280" />
          <Text className="text-xs text-gray-400 mr-2">
            Posted {timeAgo(order.created_at)}
          </Text>
        </View>
        <Text className="text-lg font-bold text-green-600">{order.price}</Text>
      </View>
      <View className="flex-row items-center justify-between">
        <View className="flex gap-3 w-10/12 justify-between">
          {/* From Restaurant */}
          <View className="flex-col  items-start mb-2">
            <View className="flex-row justify-center items-center">
              <View className="w-7 h-7 bg-orange-100 rounded-lg justify-center items-center mr-2 ">
                <Ionicons name="restaurant" size={14} color="#F97316" />
              </View>
              <Text className="text-xs w-20 text-gray-500 ">Pickup</Text>
            </View>

            <Text className="text-xs text-gray-500 mt-0.5">
              {cleanAddress(order.pickup_name)}
            </Text>
          </View>
          {/* To Customer*/}
          <View className="flex-col  items-start mb-2">
            <View className="flex-row justify-center items-center">
              <View className="w-7 h-7 bg-orange-100 rounded-lg justify-center items-center mr-2 mt-0.5">
                <Ionicons name="location" size={14} color="#3B82F6" />
              </View>
              <Text className="text-xs w-20 text-gray-500 ">Destination</Text>
            </View>

            <Text className="text-xs text-gray-500 mt-0.5">
              {cleanAddress(order.dropoff_name)}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          className="bg-green-600 h-8 px-4 py-2 self-end rounded-full"
          onPress={onAccept}
          activeOpacity={0.8}
        >
          <Text className="text-white text-xs font-semibold">Accept</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default OrderSummary;
