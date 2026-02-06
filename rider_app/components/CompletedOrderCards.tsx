import { MY_ICONS } from "@/assets/assetsData";
import React from "react";
import { View, Text, Image } from "react-native";
import { IMAGES } from "@/assets/assetsData";

type Props = {
  item: any;
};

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

export default function CompletedOrderCard({ item }: Props) {
  return (
    <View className="bg-orange-500 rounded-2xl p-4 mb-4">
      {/* 3 columns x 2 rows grid */}
      <View className="flex-col gap-4">
        {/* First Row */}
        <View className="flex-row justify-between items-start">
          {/* Cell 1 */}
          <View style={{ width: "40%" }} className="pr-2">
            <Text className="text-white text-lg font-bold">{item.id}</Text>

            <View className="flex-row items-center gap-2 flex-wrap">
              <Text className="text-white text-sm font-medium">
                {item.category}
              </Text>
              <Text className="text-orange-200 text-sm">{item.distance}</Text>
            </View>
          </View>

          {/* Cell 2 */}
          <View
            style={{ width: "25%" }}
            className="flex-col gap-1 items-center justify-start px-2"
          >
            <Text className="text-orange-200 text-sm">{item.date}</Text>
            <Text className="text-orange-200 text-sm">{item.time}</Text>
          </View>

          {/* Cell 3 */}
          <View style={{ width: "35%" }} className="items-end pl-2">
            <Image
              source={item.materialImage || IMAGES.indomie_package}
              className="w-14 h-14 rounded-lg bg-white/20"
              resizeMode="cover"
            />
          </View>
        </View>

        {/* Second Row */}
        <View className="flex-row justify-between items-center">
          {/* Cell 4 */}
          <View style={{ width: "38%" }} className="pr-2">
            <Text className="text-white text-base" numberOfLines={2}>
              {item.location}
            </Text>
          </View>

          {/* Cell 5 */}
          <View style={{ width: "25%" }} className="items-center">
            <DirectionArrows direction={item.direction} />
          </View>

          {/* Cell 6 */}
          <View style={{ width: "38%" }} className="items-end pl-2">
            <Text className="text-white text-base" numberOfLines={2}>
              {item.location}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
