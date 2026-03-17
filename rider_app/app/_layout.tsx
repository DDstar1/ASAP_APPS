import "./global.css";

import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native";
import { useEffect } from "react";
import { useUserStore } from "@/store/useUserStore";
import {
  startDeliveryEvents,
  startMessageEvents,
  stopAllListeners,
} from "@/lib/supabase-realtime-functions";
import "@/utils/utils_orderLocationTracking";

export default function RootLayout() {
  const { fetchUserSession, user } = useUserStore();

  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  // ✅ Fetch user session from Supabase
  useEffect(() => {
    fetchUserSession();
  }, []);

  // Handle Supabase Realtime Notifications
  useEffect(() => {
    console.log("RootLayout: User changed:", user);
    if (!user) return;
    console.log(`${user.id} logged in, setting up realtime listeners...`);

    // Start messages realtime (anonymous users CAN receive messages)
    startDeliveryEvents();

    startMessageEvents(user.id);

    // Cleanup
    return () => {
      stopAllListeners();
    };
  }, [user?.id, user?.isAnonymous]);

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen
          name="onboarding/index"
          options={{ headerShown: false }}
        />
        <Stack.Screen name="map/index" options={{ headerShown: false }} />
        <Stack.Screen
          name="trackPackage/index"
          options={({ navigation }) => ({
            headerShown: true,
            headerLeft: () => (
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate("(tabs)", { screen: "activity" })
                }
              >
                <Ionicons
                  name="arrow-back"
                  size={24}
                  color="black"
                  style={{ marginLeft: 10 }}
                />
              </TouchableOpacity>
            ),
          })}
        />
        <Stack.Screen
          name="order_detail/index"
          options={{
            headerShown: true,
            title: "Order Details",
            headerStyle: {
              backgroundColor: "#111827", // Primary Background
            },
            headerTintColor: "#FFFFFF", // Primary Text
            headerTitleStyle: {
              fontWeight: "bold",
            },
          }}
        />
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
