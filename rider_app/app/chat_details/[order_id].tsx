import { getMessages, sendMessageToSupabase } from "@/lib/supabase-functions";
import { useUserStore } from "@/store/useUserStore";
import { timeAgo } from "@/utils/utils_for_me";
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

// Helper function to format timestamp

export default function ChatDetailScreen() {
  const { id: clientId, order_id, name } = useLocalSearchParams();
  const { fetchUserSession, user } = useUserStore();

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  console.log("ChatDetailScreen params:", { clientId, order_id, name });
  console.log("Current user:", user);

  // Get current user session
  useEffect(() => {
    fetchUserSession();
  }, []);

  const flatListRef = useRef<FlatList>(null);

  // Fetching messages from API or Supabase
  useEffect(() => {
    const loadMessages = async () => {
      setLoading(true);
      const msgs = await getMessages(String(clientId));
      setMessages(msgs);
      setLoading(false);
      setTimeout(
        () => flatListRef.current?.scrollToEnd({ animated: true }),
        100,
      );
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
      receiver_id: clientId as string, // Set appropriately based on your logic
      delivery_order_id: Number(order_id),
      created_at: new Date().toISOString(),
    };

    // Optimistically update UI
    setMessages((prev) => [...prev, newMsg]);
    setMessage("");
    Keyboard.dismiss();

    try {
      // Send message to Supabase
      await sendMessageToSupabase({
        message: newMsg.message,
        sender_id: user?.id!,
        receiver_id: clientId as string,
        delivery_order_id: newMsg.delivery_order_id,
      });
    } catch (error) {
      console.error("Failed to send message:", error);
      // Optionally: Remove the optimistic message or show error
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
              renderItem={({ item }) => {
                const isMyMessage = item.sender_id === user?.id;

                return (
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
                      <Text selectable className="text-white text-base">
                        {item.message}
                      </Text>

                      {/* Timestamp */}
                      <Text
                        className={`text-xs mt-1 ${
                          isMyMessage ? "text-blue-100" : "text-gray-400"
                        }`}
                      >
                        {timeAgo(item.created_at)}
                      </Text>
                    </View>
                  </View>
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
