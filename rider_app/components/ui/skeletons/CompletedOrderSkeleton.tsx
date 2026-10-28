import React from "react";
import { View } from "react-native";

export default function CompletedOrderSkeleton() {
  return (
    <View className="bg-[#2C2C30] rounded-2xl p-4 mb-4">
      <View className="flex-row justify-between mb-4">
        <View className="h-5 w-32 bg-[#3C3C43] rounded" />
        <View className="h-5 w-20 bg-[#3C3C43] rounded" />
      </View>

      <View className="flex-row justify-between">
        <View className="h-4 w-40 bg-[#3C3C43] rounded" />
        <View className="h-4 w-40 bg-[#3C3C43] rounded" />
      </View>
    </View>
  );
}
