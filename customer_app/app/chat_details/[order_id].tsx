//Old Chat Screen

import ChatCameraModal from "@/components/ChatCameraModal";
import { getChatImageUrls, uploadChatImage } from "@/lib/chat-images";
import { supabaseEvents } from "@/lib/supabase";
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
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
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
  const [cameraVisible, setCameraVisible] = useState(false);
  // Signed URLs for chat_images paths, and the photo open full screen
  const [imageUrls, setImageUrls] = useState<Record<string, string>>({});
  const [viewerUri, setViewerUri] = useState<string | null>(null);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    fetchUserSession();
  }, []);

  // Rider's messages arrive while the chat is open
  useEffect(() => {
    const onMessage = (row: any) => {
      if (
        Number(row?.delivery_order_id) !== Number(order_id) ||
        row.sender_id !== String(riderId)
      )
        return;
      setMessages((prev) =>
        prev.some((m) => m.id === row.id) ? prev : [...prev, row],
      );
      setUnreadCount(String(order_id), 0);
      markMessagesAsRead(Number(order_id));
    };
    supabaseEvents.on("message_insert", onMessage);
    return () => supabaseEvents.off("message_insert", onMessage);
  }, [order_id, riderId]);

  // Sign any photo paths we haven't resolved yet
  useEffect(() => {
    const missing = messages
      .map((m) => m.image_url)
      .filter((p): p is string => !!p && !imageUrls[p]);
    if (!missing.length) return;
    getChatImageUrls(missing).then((urls) =>
      setImageUrls((prev) => ({ ...prev, ...urls })),
    );
  }, [messages]);

  useEffect(() => {
    const loadMessages = async () => {
      setLoading(true);

      const msgs = await getMessages(String(riderId));
      // Keep anything sent or received while the history was loading
      setMessages((prev) => [
        ...msgs,
        ...prev.filter((m) => !msgs.some((saved) => saved.id === m.id)),
      ]);
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

  // Shows the message straight away, then swaps in the saved row, or marks
  // it failed. getContent runs after it's shown (e.g. the photo upload).
  const postMessage = async (
    preview: { message: string; local_uri?: string; uploading?: boolean },
    getContent: () => Promise<{ message: string; image_url?: string | null }>,
  ) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const tempId = `local-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        ...preview,
        id: tempId,
        sender_id: user?.id,
        receiver_id: riderId as string,
        delivery_order_id: Number(order_id),
        created_at: new Date().toISOString(),
        is_read: false,
      },
    ]);
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    try {
      const saved = await sendMessageToSupabase({
        ...(await getContent()),
        sender_id: user?.id!,
        receiver_id: riderId as string,
        delivery_order_id: Number(order_id),
      });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...saved, local_uri: preview.local_uri } : m,
        ),
      );
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...m, uploading: false, failed: true } : m,
        ),
      );
    }
  };

  const sendMessage = async () => {
    const text = message;
    if (!text.trim()) return;

    setMessage("");
    Keyboard.dismiss();
    await postMessage({ message: text }, async () => ({ message: text }));
  };

  // Show the photo straight away from the phone, then upload and send
  const sendPhoto = (localUri: string) =>
    postMessage({ message: "", local_uri: localUri, uploading: true }, async () => ({
      message: "",
      image_url: await uploadChatImage(Number(order_id), localUri),
    }));

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
                        {(item.local_uri || item.image_url) && (
                          <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={() =>
                              setViewerUri(
                                item.local_uri ?? imageUrls[item.image_url],
                              )
                            }
                            className="w-56 h-56 rounded-xl overflow-hidden bg-gray-800 mb-1 justify-center items-center"
                          >
                            {(item.local_uri || imageUrls[item.image_url]) && (
                              <Image
                                source={{
                                  uri:
                                    item.local_uri ?? imageUrls[item.image_url],
                                }}
                                style={{ width: "100%", height: "100%" }}
                                resizeMode="cover"
                              />
                            )}
                            {item.uploading && (
                              <View className="absolute inset-0 bg-black/40 justify-center items-center">
                                <ActivityIndicator color="white" />
                              </View>
                            )}
                          </TouchableOpacity>
                        )}

                        {!!item.message && (
                          <Text className="text-white text-base">
                            {item.message}
                          </Text>
                        )}

                        {item.failed && (
                          <Text className="text-red-300 text-xs">
                            Not sent
                          </Text>
                        )}

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
          <TouchableOpacity
            onPress={() => setCameraVisible(true)}
            activeOpacity={0.8}
            className="p-3 rounded-full bg-gray-800 mr-2"
          >
            <Ionicons name="camera" size={20} color="white" />
          </TouchableOpacity>
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

        <ChatCameraModal
          visible={cameraVisible}
          onClose={() => setCameraVisible(false)}
          onSend={sendPhoto}
        />

        {/* Full-screen photo */}
        <Modal
          visible={!!viewerUri}
          transparent
          animationType="fade"
          onRequestClose={() => setViewerUri(null)}
        >
          <View className="flex-1 bg-black">
            {viewerUri && (
              <Image
                source={{ uri: viewerUri }}
                style={{ flex: 1 }}
                resizeMode="contain"
              />
            )}
            <TouchableOpacity
              onPress={() => setViewerUri(null)}
              className="absolute top-14 right-5 p-2 bg-black/60 rounded-full"
            >
              <Ionicons name="close" size={26} color="white" />
            </TouchableOpacity>
          </View>
        </Modal>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}
