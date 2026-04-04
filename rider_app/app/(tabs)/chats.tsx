import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MY_ICONS } from "@/assets/assetsData";
import { getMessagesList } from "@/lib/supabase-app-functions";
import { openOrderChat } from "@/utils/utils_for_me";

const ChatsListPage = () => {
  const { width } = Dimensions.get("window");
  const router = useRouter();

  const [conversations, setConversations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  const fetchConversations = async () => {
    setLoading(true);
    setError(null);

    const { success, data, error: fetchError } = await getMessagesList();

    if (success) {
      setConversations(data);
    } else {
      setError("Failed to load messages");
      console.error("Error loading conversations:", fetchError);
    }

    setLoading(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const renderChatCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => openOrderChat(item.deliveryOrderId)}
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

  const renderEmptyState = () => (
    <View className="flex-1 items-center justify-center py-20">
      <Text className="text-gray-400 text-base">No messages yet</Text>
      <Text className="text-gray-500 text-sm mt-2">
        Your conversations will appear here
      </Text>
    </View>
  );

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-gray-900">
      {/* Header */}
      <View className="flex-row items-center justify-between px-6 py-10">
        <Text className="text-white text-2xl font-semibold">Messages</Text>
        <View className="flex-row items-center">
          {MY_ICONS.message("white", 24)}
        </View>
      </View>

      {/* Loading State */}
      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#FB923C" />
        </View>
      ) : error ? (
        /* Error State */
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-red-400 text-base text-center">{error}</Text>
          <TouchableOpacity
            onPress={fetchConversations}
            className="mt-4 bg-orange-500 px-6 py-3 rounded-lg"
          >
            <Text className="text-white font-semibold">Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* All Chats List */
        <FlatList
          data={conversations}
          keyExtractor={(item) => item.id}
          renderItem={renderChatCard}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ marginBottom: 0, marginHorizontal: 16 }}
          ListEmptyComponent={renderEmptyState}
        />
      )}
    </SafeAreaView>
  );
};

export default ChatsListPage;
