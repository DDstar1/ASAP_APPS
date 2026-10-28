import React from "react";
import { View } from "react-native";

export default function IncompleteDeliverySkeleton({
  width,
}: {
  width: number;
}) {
  return (
    <View
      style={{ width: width * 0.9, height: 180 }}
      className="bg-[#2C2C30] rounded-2xl mr-4 p-4 justify-between"
    >
      <View className="h-5 w-32 bg-[#3C3C43] rounded" />
      <View className="h-4 w-48 bg-[#3C3C43] rounded" />
      <View className="h-4 w-40 bg-[#3C3C43] rounded" />
      <View className="h-4 w-28 bg-[#3C3C43] rounded" />
    </View>
  );
}
