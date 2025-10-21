import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { Ionicons } from "@expo/vector-icons";

export default function ChatDetailScreen() {
  const { id, name } = useLocalSearchParams();
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    { id: "1", text: "Hey there 👋", sender: "them" },
    { id: "2", text: "Hello! How’s your day going?", sender: "me" },
  ]);

  const flatListRef = useRef<FlatList>(null);

  const sendMessage = async () => {
    if (!message.trim()) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const newMsg = {
      id: Date.now().toString(),
      text: message,
      sender: "me",
    };

    setMessages((prev) => [...prev, newMsg]);
    setMessage("");

    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"} // or 'position' for Android
      style={{ flex: 1 }}
    >
      {/* ✅ Custom header handled by Stack options */}
      <Stack.Screen
        options={{
          title: name ? String(name) : `Chat #${id}`,
        }}
      />

      {/* ✅ Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            className={`my-1 px-4 ${
              item.sender === "me" ? "items-end" : "items-start"
            }`}
          >
            <View
              className={`max-w-[80%] px-4 py-2 rounded-2xl ${
                item.sender === "me"
                  ? "bg-blue-500 rounded-br-none"
                  : "bg-gray-700 rounded-bl-none"
              }`}
            >
              <Text className="text-white text-base">{item.text}</Text>
            </View>
          </View>
        )}
        contentContainerStyle={{ paddingVertical: 10 }}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
      />

      {/* ✅ Input bar */}
      <View className="flex-row items-center px-4 py-3 border-t border-gray-800 bg-gray-900">
        <TextInput
          className="flex-1 bg-gray-800 text-white px-4 py-2 rounded-2xl mr-2"
          placeholder="Type a message..."
          placeholderTextColor="#9CA3AF"
          value={message}
          onChangeText={setMessage}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
        />
        <TouchableOpacity
          onPress={sendMessage}
          activeOpacity={0.8}
          className="bg-blue-500 p-3 rounded-full"
        >
          <Ionicons name="send" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}
