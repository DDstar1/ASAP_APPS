import "./global.css";

import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { router, Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { useColorScheme } from "@/hooks/use-color-scheme";
import { Ionicons } from "@expo/vector-icons";
import { AppState, TouchableOpacity } from "react-native";
import { useEffect } from "react";
import { useUserStore } from "@/store/useUserStore";
import {
  startDeliveryEvents,
  startMessageEvents,
  startRideOfferEvents,
  stopAllListeners,
} from "@/lib/supabase-realtime-functions";
import { supabaseEvents } from "@/lib/supabase";
import {
  registerForPushNotifications,
  useNotificationTaps,
} from "@/lib/push-notifications";
import { fetchPendingOfferIds } from "@/lib/ride-offers";
import { useRideOfferStore } from "@/store/useRideOfferStore";
import { useAcceptedDeliveryStore } from "@/store/useAcceptedDeliveriesStore";
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

    // Ride offers: realtime while open, OS push while closed
    startRideOfferEvents(user.id);
    registerForPushNotifications();

    // Cleanup
    return () => {
      stopAllListeners();
    };
  }, [user?.id]);

  // Show new offers as they arrive; hide them once answered or expired
  useEffect(() => {
    if (!user) return;
    const { showOffer, dismissOffer } = useRideOfferStore.getState();

    const onInsert = (row: { id: string; status: string }) => {
      if (row.status === "pending") showOffer(row.id);
    };
    const onUpdate = (row: { id: string; status: string }) => {
      if (row.status !== "pending") dismissOffer(row.id);
    };
    supabaseEvents.on("ride_offer_insert", onInsert);
    supabaseEvents.on("ride_offer_update", onUpdate);

    // Catch offers missed while the app was closed or in the background
    const checkPending = async () => {
      for (const id of await fetchPendingOfferIds()) showOffer(id);
    };
    checkPending();
    const appStateSub = AppState.addEventListener("change", (state) => {
      if (state === "active") checkPending();
    });

    return () => {
      supabaseEvents.off("ride_offer_insert", onInsert);
      supabaseEvents.off("ride_offer_update", onUpdate);
      appStateSub.remove();
    };
  }, [user?.id]);

  // Tapping a ride offer push opens it on the home tab
  useNotificationTaps(loaded && !!user, (data) => {
    if (data.type === "ride_offer" && data.offer_id) {
      router.navigate("/(tabs)/home");
      useRideOfferStore.getState().showOffer(data.offer_id);
    }
    // Cancelled order: open Deliveries with the order moved to Completed
    // (and its AT RETURN POINT button, if the package was picked up)
    if (data.type === "order_cancelled") {
      useAcceptedDeliveryStore.getState().refreshAfterCancel();
      router.navigate("/(tabs)/deliveries");
    }
  });

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
        <Stack.Screen
          name="guidelines/index"
          options={{ headerShown: false, gestureEnabled: false }}
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
