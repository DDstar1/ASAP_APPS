import React from "react";
import {
  Dimensions,
  SectionList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";

import { IMAGES, MY_ICONS } from "@/assets/assetsData";

const ChatsListPage = () => {
  const { width } = Dimensions.get("window");
  const router = useRouter();

  // Group chats by date
  const chatSections = [
    {
      title: "Today",
      data: [
        {
          id: "1",
          clientName: "John Adeyemi",
          lastMessage: "Thanks! I'll be waiting at the gate.",
          time: "2:45 PM",
          orderId: "TRK-1A9X-74KD",
          status: "In Transit",
          statusColor: "#FB923C",
          avatar: null,
        },
        {
          id: "2",
          clientName: "Sarah Okafor",
          lastMessage: "Can you call me when you arrive?",
          time: "1:30 PM",
          unreadCount: 2,
          orderId: "TRK-2B8K-53QL",
          status: "Delivered",
          statusColor: "#34D399",
          avatar: null,
        },
        {
          id: "3",
          clientName: "Michael Benson",
          lastMessage: "Perfect! See you soon.",
          time: "11:15 AM",
          unreadCount: 0,
          orderId: "TRK-3C7M-62VR",
          status: "Delivered",
          statusColor: "#34D399",
          avatar: null,
        },
      ],
    },
    {
      title: "Yesterday",
      data: [
        {
          id: "4",
          clientName: "Grace Eze",
          lastMessage: "Thank you for the delivery!",
          time: "8:20 PM",
          unreadCount: 0,
          orderId: "TRK-4D6P-81ZW",
          status: "Delivered",
          statusColor: "#34D399",
          avatar: null,
        },
        {
          id: "5",
          clientName: "David Okonkwo",
          lastMessage: "I'm at the office now.",
          time: "3:45 PM",
          unreadCount: 0,
          orderId: "TRK-5E3N-92PQ",
          status: "Delivered",
          statusColor: "#34D399",
          avatar: null,
        },
      ],
    },
    {
      title: "This Week",
      data: [
        {
          id: "6",
          clientName: "Chioma Nwankwo",
          lastMessage: "Please handle with care, it's fragile.",
          time: "Mon",
          unreadCount: 0,
          orderId: "TRK-6F4R-73MN",
          status: "Delivered",
          statusColor: "#34D399",
          avatar: null,
        },
        {
          id: "7",
          clientName: "Ahmed Yusuf",
          lastMessage: "The address is correct.",
          time: "Sun",
          unreadCount: 0,
          orderId: "TRK-7G5T-84OP",
          status: "Delivered",
          statusColor: "#34D399",
          avatar: null,
        },
        {
          id: "8",
          clientName: "Blessing Oluwaseun",
          lastMessage: "Great service, thank you!",
          time: "Sat",
          unreadCount: 0,
          orderId: "TRK-8H6Y-95QR",
          status: "Delivered",
          statusColor: "#34D399",
          avatar: null,
        },
      ],
    },
  ];

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleChatPress = async (chat: any) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: "/(tabs)/chats/[chat_id]",
      params: { id: chat.id, name: chat.clientName },
    });
  };

  const renderChatCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => handleChatPress(item)}
      className="bg-[#3C3C43] rounded-2xl p-4 mt-1.5 mb-3 mr-1.5 flex-row items-center"
    >
      {/* Unread Messages Info */}
      {item.unreadCount > 0 && (
        <View className="bg-orange-500 absolute -right-1.5 -top-1.5 rounded-full w-6 h-6 items-center justify-center">
          <Text className="text-white text-xs font-bold">
            {item.unreadCount}
          </Text>
        </View>
      )}

      {/* Avatar */}
      <View className="w-14 h-14 rounded-full bg-orange-500 items-center justify-center mr-4">
        <Text className="text-white text-lg font-bold">
          {getInitials(item.clientName)}
        </Text>
      </View>

      {/* Chat Info */}
      <View className="flex-1">
        <View className="flex-row items-center justify-between mb-1">
          <Text className="text-white text-base font-semibold">
            {item.clientName}
          </Text>
          <Text className="text-gray-400 text-xs">{item.time}</Text>
        </View>

        <View className="flex-row items-center justify-between">
          <Text className="text-gray-400 text-sm mb-2" numberOfLines={1}>
            {item.lastMessage}
          </Text>
          <View className="flex-row items-center">
            {MY_ICONS.circle(item.statusColor, 6)}
            <Text className="text-xs ml-1" style={{ color: item.statusColor }}>
              {item.status}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderSectionHeader = ({ section }: { section: any }) => (
    <View className="bg-gray-900 py-3">
      <Text className="text-gray-400 text-sm font-medium">{section.title}</Text>
    </View>
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-900">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-4">
        <Text className="text-white text-2xl font-semibold">Messages</Text>
        <View className="flex-row items-center">
          {MY_ICONS.message("white", 24)}
        </View>
      </View>

      {/* All Chats List */}
      <SectionList
        sections={chatSections}
        keyExtractor={(item) => item.id}
        renderItem={renderChatCard}
        renderSectionHeader={renderSectionHeader}
        stickySectionHeadersEnabled={true}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ marginBottom: 0, marginHorizontal: 16 }}
      />
    </SafeAreaView>
  );
};

export default ChatsListPage;
