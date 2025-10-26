import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface OrderSummaryProps {
  order: {
    id: number;
    from: string;
    fromAddress: string;
    to: string;
    price: string;
    distance: string;
    eta: string;
    pickupTime: string;
  };
  onAccept?: () => void;
}

const OrderSummary = ({ order, onAccept }: OrderSummaryProps) => {
  return (
    <View className="bg-white rounded-2xl p-4 mb-3 border border-gray-100">
      {/* Header with Price */}
      <View className="flex-row justify-between items-center mb-3">
        <Text className="text-lg font-bold text-green-600">{order.price}</Text>
        <View className="flex-row items-center bg-gray-100 px-3 py-1 rounded-full">
          <Ionicons name="time-outline" size={14} color="#6B7280" />
          <Text className="text-xs text-gray-600 ml-1 font-medium">
            {order.eta}
          </Text>
        </View>
      </View>
      <View className="flex-row items-center justify-between">
        <View className="flex gap-1 justify-between">
          {/* From Restaurant */}
          <View className="flex-row  items-center mb-2">
            <View className="w-7 h-7 bg-orange-100 rounded-lg justify-center items-center mr-2 mt-0.5">
              <Ionicons name="restaurant" size={14} color="#F97316" />
            </View>
            <View className="flex flex-row items-center">
              <Text className="text-xs w-20 text-gray-500 mb-0.5">Pickup</Text>
              <Text className="text-xs text-gray-500 mt-0.5">
                {order.fromAddress}
              </Text>
            </View>
          </View>
          {/* To Customer*/}
          <View className="flex-row  items-center mb-2">
            <View className="w-7 h-7 bg-orange-100 rounded-lg justify-center items-center mr-2 mt-0.5">
              <Ionicons name="location" size={14} color="#3B82F6" />
            </View>
            <View className="flex flex-row items-center">
              <Text className="text-xs w-20 text-gray-500 mb-0.5">
                Destination
              </Text>
              <Text className="text-xs text-gray-500 mt-0.5">
                {order.fromAddress}
              </Text>
            </View>
          </View>
        </View>
        <TouchableOpacity
          className="bg-green-600 h-8 px-4 py-2 self-end rounded-full"
          onPress={onAccept}
          activeOpacity={0.8}
        >
          <Text className="text-white text-xs font-semibold">View</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default OrderSummary;
