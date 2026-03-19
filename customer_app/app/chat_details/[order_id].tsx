//Old Chat Screen

import {
  getMessages,
  markMessagesAsRead,
  sendMessageToSupabase,
} from "@/lib/supabase-app-functions";
import { useCustomerDeliveryStore } from "@/store/useCustomerDeliveriesStore";
import { useUserStore } from "@/store/useUserStore";
import { timeAgo } from "@/utils/my_utils";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ChatDetailScreen() {
  const { id: riderId, order_id, name } = useLocalSearchParams();
  const { fetchUserSession, user } = useUserStore();
  const { setUnreadCount, fetchUnreadCounts, AllDeliveries } =
    useCustomerDeliveryStore();

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchUserSession();
  }, []);

  useEffect(() => {
    const loadMessages = async () => {
      setLoading(true);

      const msgs = await getMessages(String(riderId));
      setMessages(msgs);
      setLoading(false);

      setTimeout(
        () => flatListRef.current?.scrollToEnd({ animated: true }),
        100,
      );

      // Clear badge instantly in store
      setUnreadCount(String(order_id), 0);

      // Mark as read in DB
      await markMessagesAsRead(Number(order_id));

      // Refresh all counts from DB to stay in sync
      fetchUnreadCounts(AllDeliveries.map((d) => String(d.id)));
    };

    loadMessages();
  }, [order_id]);

  const sendMessage = async () => {
    if (!message.trim()) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const newMsg = {
      id: Date.now().toString(),
      message: message,
      sender_id: user?.id,
      receiver_id: riderId as string,
      delivery_order_id: Number(order_id),
      created_at: new Date().toISOString(),
      is_read: false,
    };

    setMessages((prev) => [...prev, newMsg]);
    setMessage("");
    Keyboard.dismiss();

    try {
      await sendMessageToSupabase({
        message: newMsg.message,
        sender_id: user?.id!,
        receiver_id: riderId as string,
        delivery_order_id: newMsg.delivery_order_id,
      });
    } catch (error) {
      console.error("Failed to send message:", error);
    }

    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 50}
    >
      <SafeAreaView
        className="flex-1 bg-gray-900"
        edges={["left", "right", "bottom"]}
      >
        <Stack.Screen
          options={{
            headerTitle: () => (
              <View className="flex-row items-center gap-2">
                <View className="w-10 h-10 rounded-full bg-gray-700 items-center justify-center">
                  <Text className="text-white font-semibold text-base">
                    {name ? String(name).charAt(0).toUpperCase() : "#"}
                  </Text>
                </View>
                <Text className="text-black text-lg font-semibold">
                  {name ? String(name) : `Chat #${order_id}`}
                </Text>
              </View>
            ),
            headerRight: () => (
              <TouchableOpacity
                onPress={() =>
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                }
                className="mr-2"
              >
                <Ionicons name="call" size={24} color="black" />
              </TouchableOpacity>
            ),
          }}
        />

        {/* Messages */}
        <View className="flex-1 justify-center">
          {loading ? (
            <ActivityIndicator size="large" color="#3B82F6" />
          ) : messages.length === 0 ? (
            <View className="flex-1 items-center justify-center px-8">
              <Ionicons name="chatbubbles-outline" size={64} color="#6B7280" />
              <Text className="text-gray-400 text-center mt-4 text-base">
                No messages yet. Start the conversation!
              </Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id.toString()}
              ListHeaderComponent={() => (
                <View className="items-center py-3">
                  <View className="flex-row items-center gap-2 px-4">
                    <View className="flex-1 h-[0.5px] bg-gray-700" />
                    <Text className="text-gray-600 text-xs tracking-widest uppercase">
                      {messages.length} message
                      {messages.length !== 1 ? "s" : ""}
                    </Text>
                    <View className="flex-1 h-[0.5px] bg-gray-700" />
                  </View>
                </View>
              )}
              renderItem={({ item, index }) => {
                const isMyMessage = item.sender_id === user?.id;

                // Show unread divider above the first unread message from the other person
                const isFirstUnread =
                  !item.is_read &&
                  item.sender_id !== user?.id &&
                  (index === 0 ||
                    messages[index - 1]?.is_read ||
                    messages[index - 1]?.sender_id === user?.id);

                return (
                  <>
                    {isFirstUnread && (
                      <View className="flex-row items-center gap-2 px-4 my-2">
                        <View className="flex-1 h-[0.5px] bg-blue-100/60" />
                        <Text className="text-blue-900/60 text-[10px] tracking-widest uppercase">
                          Unread
                        </Text>
                        <View className="flex-1 h-[0.5px] bg-blue-100/60" />
                      </View>
                    )}

                    <View
                      className={`my-1 px-4 ${
                        isMyMessage ? "items-end" : "items-start"
                      }`}
                    >
                      <View
                        className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                          isMyMessage
                            ? "bg-blue-500 rounded-br-none"
                            : "bg-gray-700 rounded-bl-none"
                        }`}
                      >
                        <Text className="text-white text-base">
                          {item.message}
                        </Text>

                        <Text
                          className={`text-xs mt-1 ${
                            isMyMessage ? "text-blue-100" : "text-gray-400"
                          }`}
                        >
                          {timeAgo(item.created_at)}
                        </Text>
                      </View>
                    </View>
                  </>
                );
              }}
              contentContainerStyle={{ paddingVertical: 10 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              onContentSizeChange={() =>
                flatListRef.current?.scrollToEnd({ animated: true })
              }
            />
          )}
        </View>

        {/* Input bar */}
        <View className="flex-row items-center px-4 py-3 border-t border-gray-800">
          <TextInput
            className="flex-1 bg-gray-800 text-white px-4 py-3 rounded-2xl mr-2"
            placeholder="Type a message..."
            placeholderTextColor="#9CA3AF"
            value={message}
            onChangeText={setMessage}
            onSubmitEditing={sendMessage}
            returnKeyType="send"
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            onPress={sendMessage}
            activeOpacity={0.8}
            className={`p-3 rounded-full ${
              message.trim() ? "bg-blue-500" : "bg-gray-700"
            }`}
            disabled={!message.trim()}
          >
            <Ionicons name="send" size={20} color="white" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
