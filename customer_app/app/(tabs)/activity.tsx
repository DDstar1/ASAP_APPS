import React from "react";
import {
  Dimensions,
  Image,
  ScrollView,
  SectionList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { IMAGES, MY_ICONS } from "@/assets/assetsData";

const OrdersPage = () => {
  const { width } = Dimensions.get("window");

  // Group orders by month
  const orderSections = [
    {
      title: "May 2025",
      data: [
        {
          id: "TRK-1A9X-74KD",
          date: "23-05-2025",
          time: "9:28pm",
          location: "Sapele Rd Benin",
          category: "Food",
          distance: "17km",
          direction: "right",
        },
        {
          id: "TRK-2B8K-53QL",
          date: "23-05-2025",
          time: "10:45am",
          location: "Lekki Phase 1",
          category: "Gadgets",
          distance: "8km",
          direction: "left",
        },
        {
          id: "TRK-3C7M-62VR",
          date: "23-05-2025",
          time: "3:15pm",
          location: "Abuja Garki",
          category: "Fabric",
          distance: "24km",
          direction: "right",
        },
        {
          id: "TRK-4D6P-81ZW",
          date: "24-05-2025",
          time: "7:00pm",
          location: "Yaba Lagos",
          category: "Documents",
          distance: "5km",
          direction: "left",
        },
      ],
    },
    {
      title: "April 2025",
      data: [
        {
          id: "TRK-5E3N-92PQ",
          date: "15-04-2025",
          time: "2:30pm",
          location: "Victoria Island",
          category: "Electronics",
          distance: "12km",
          direction: "right",
        },
        {
          id: "TRK-3C7M-62VR",
          date: "23-05-2025",
          time: "3:15pm",
          location: "Abuja Garki",
          category: "Fabric",
          distance: "24km",
          direction: "right",
        },
        {
          id: "TRK-4D6P-81ZW",
          date: "24-05-2025",
          time: "7:00pm",
          location: "Yaba Lagos",
          category: "Documents",
          distance: "5km",
          direction: "left",
        },
        {
          id: "TRK-3C7M-62VR",
          date: "23-05-2025",
          time: "3:15pm",
          location: "Abuja Garki",
          category: "Fabric",
          distance: "24km",
          direction: "right",
        },
        {
          id: "TRK-4D6P-81ZW",
          date: "24-05-2025",
          time: "7:00pm",
          location: "Yaba Lagos",
          category: "Documents",
          distance: "5km",
          direction: "left",
        },
      ],
    },
  ];

  const currentTrackings = [
    {
      id: "TRK-9F2X-7A6B",
      location: "Sapele Rd Benin",
      status: "In Transit",
      statusColor: "#22c55e",
      map: IMAGES.dummy_map,
    },
    {
      id: "TRK-8D7L-5Q3C",
      location: "Lekki Phase 1",
      status: "Pending Pickup",
      statusColor: "#facc15",
      map: IMAGES.dummy_map,
    },
    {
      id: "TRK-1H9J-4T7Z",
      location: "Abuja Garki",
      status: "Delivered",
      statusColor: "#3b82f6",
      map: IMAGES.dummy_map,
    },
  ];

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
    <View className="bg-orange-500 rounded-2xl p-4 mb-4">
      <View className="flex-row items-start justify-between mb-2">
        <View className="flex-1">
          <Text className="text-white text-lg font-bold">{item.id}</Text>
          <Text className="text-orange-200 text-sm">{item.date}</Text>
        </View>
        <TouchableOpacity className="bg-white rounded-full px-4 py-2">
          <Text className="text-gray-900 text-sm font-medium">Rebook</Text>
        </TouchableOpacity>
      </View>

      <View className="flex-row items-center justify-between">
        <View className="flex-1">
          <Text className="text-white text-base">{item.location}</Text>
        </View>

        <View className="flex-row items-center space-x-4">
          <DirectionArrows direction={item.direction} />

          <View className="items-end">
            <Text className="text-orange-200 text-sm">{item.time}</Text>
            <Text className="text-white text-sm font-medium">
              {item.category}
            </Text>
            <Text className="text-orange-200 text-sm">{item.distance}</Text>
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
    <SafeAreaView className="flex-1 bg-gray-900">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <Text className="text-white text-2xl font-semibold">My Orders</Text>
        {MY_ICONS.message("white", 24)}
      </View>

      {/* Current Tracking Cards (Horizontal Scroll) */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="px-4 mb-6"
        contentContainerStyle={{ alignItems: "center" }}
        style={{ maxHeight: 180 }}
      >
        {currentTrackings.map((item, index) => (
          <View
            key={index}
            style={{ width: width * 0.85 }}
            className="bg-[#3C3C43] rounded-2xl flex flex-row overflow-hidden h-full relative mr-4 p-3"
          >
            {/* Left Side */}
            <View className="flex-1 pr-2">
              <Text className="text-white text-sm font-medium mb-1">
                Current Tracking
              </Text>
              <Text className="text-white text-lg font-bold mb-2">
                #{item.id}
              </Text>

              <Text className="text-gray-400 text-xs mb-1">
                Current Location
              </Text>
              <View className="flex-row items-center mb-2">
                {MY_ICONS.location("#9CA3AF", 14)}
                <Text className="text-white text-sm ml-2">{item.location}</Text>
              </View>

              <Text className="text-gray-400 text-xs mb-1">Status</Text>
              <View className="flex-row items-center">
                {MY_ICONS.circle(item.statusColor, 7)}
                <Text className="text-white text-sm ml-2">{item.status}</Text>
              </View>
            </View>

            {/* Map Image */}
            <Image source={item.map} className="w-2/5 h-32 rounded-lg" />
          </View>
        ))}
      </ScrollView>

      {/* Orders History List with Sticky Headers */}
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
