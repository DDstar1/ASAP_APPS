import "./global.css";

import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";

import { Ionicons } from "@expo/vector-icons";
import { useFonts } from "expo-font";
import * as Linking from "expo-linking";
import { useEffect, useState } from "react";
import { TouchableOpacity } from "react-native";

import { useColorScheme } from "@/hooks/use-color-scheme";

/* -------------------------------------------------
 * Types
 * ------------------------------------------------- */
type PendingLink = {
  lat?: string;
  lng?: string;
};

/* -------------------------------------------------
 * Helpers
 * ------------------------------------------------- */
const normalizeParam = (value?: string | string[]): string | undefined => {
  return Array.isArray(value) ? value[0] : value;
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  const [pendingLink, setPendingLink] = useState<PendingLink | null>(null);

  /* -------------------------------------------------
   * 1️⃣ Parse deep links (NO navigation here)
   * ------------------------------------------------- */
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const { hostname, queryParams } = Linking.parse(event.url);

      console.log("📩 Incoming deep link:", event.url);

      if (hostname === "view-location" && queryParams) {
        const lat = normalizeParam(queryParams.lat);
        const lng = normalizeParam(queryParams.lng);

        // Optional safety check
        if (lat && lng) {
          setPendingLink({ lat, lng });
        }
      }
    };

    // App already open
    const sub = Linking.addEventListener("url", handleDeepLink);

    // Cold start
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => sub.remove();
  }, []);

  /* -------------------------------------------------
   * 2️⃣ Navigate ONLY after Stack is mounted
   * ------------------------------------------------- */
  useEffect(() => {
    if (!loaded || !pendingLink) return;

    router.navigate({
      pathname: "/(tabs)/home",
      params: {
        modal: "sharedlocation",
        edit: "true",
        lat: pendingLink.lat,
        lng: pendingLink.lng,
      },
    });

    setPendingLink(null);
  }, [loaded, pendingLink]);

  /* -------------------------------------------------
   * 3️⃣ Prevent rendering until fonts load
   * ------------------------------------------------- */
  if (!loaded) return null;

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
            title: "Track ...",
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

        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        <Stack.Screen
          name="saved-locations"
          options={{
            headerShown: false,
            presentation: "transparentModal",
          }}
        />

        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>

      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
