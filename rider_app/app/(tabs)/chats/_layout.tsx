import { Stack } from "expo-router";
import { TouchableOpacity, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";

export default function ChatsLayout() {
  const router = useRouter();
  const { name } = useLocalSearchParams(); // receives name passed via params

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#111827" }, // dark gray background
      }}
    >
      {/* Chat list */}
      <Stack.Screen name="index" options={{ headerShown: false }} />

      {/* Individual chat page */}
      <Stack.Screen
        name="[chat_id]"
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: "#111827" },
          headerTitleStyle: { color: "#fff", fontSize: 18, fontWeight: "600" },
          headerLeft: () => (
            <TouchableOpacity
              onPress={async () => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.back();
              }}
              style={{ paddingHorizontal: 16 }}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
          ),
        }}
      />
    </Stack>
  );
}
