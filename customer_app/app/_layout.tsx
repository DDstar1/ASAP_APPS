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

import {
  startMessageEvents,
  stopAllListeners,
} from "@/lib/supabase-realtime-functions";
import { useUserStore } from "@/store/useUserStore";

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
  const { fetchUserSession, user, setIsResettingPassword } = useUserStore();

  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  const [pendingLink, setPendingLink] = useState<PendingLink | null>(null);
  const [passwordResetToken, setPasswordResetToken] = useState<string | null>(
    null,
  );

  // ✅ Fetch user session from Supabase
  useEffect(() => {
    fetchUserSession();
  }, []);

  /* -------------------------------------------------
   * 1️⃣ Parse deep links (NO navigation here)
   * ------------------------------------------------- */
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const parsed = Linking.parse(event.url);

      console.log("📩 Incoming deep link:", event.url);

      // Manually extract fragment (everything after #)
      const hashIndex = event.url.indexOf("#");
      const fragment = hashIndex >= 0 ? event.url.substring(hashIndex + 1) : "";

      console.log("🔹 fragment:", fragment);

      // ✅ Handle Supabase password recovery
      if (fragment.includes("type=recovery")) {
        console.log(
          "🔐 Detected password recovery link, navigating to reset screen...",
        );
        setPasswordResetToken(fragment); // Store token if needed later
        setIsResettingPassword(true);
      }

      // Existing logic: location links
      if (parsed.hostname === "view-location" && parsed.queryParams) {
        const lat = normalizeParam(parsed.queryParams.lat);
        const lng = normalizeParam(parsed.queryParams.lng);

        if (lat && lng) setPendingLink({ lat, lng });
      }
    };

    const sub = Linking.addEventListener("url", handleDeepLink);

    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => sub.remove();
  }, []);

  // Handle Supabase Realtime Notifications
  useEffect(() => {
    console.log("RootLayout: User changed:", user);
    if (!user) return;
    console.log(`${user.id} logged in, setting up realtime listeners...`);

    // Start messages realtime (anonymous users CAN receive messages)
    startMessageEvents(user.id); // add this

    // Cleanup
    return () => {
      stopAllListeners();
    };
  }, [user?.userId, user?.isAnonymous]);

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
   * 2️⃣ Navigate To Set New Password Screen (if token exists)
   * ------------------------------------------------- */
  // RootLayout.tsx
  useEffect(() => {
    if (!loaded || !passwordResetToken) return;

    console.log(
      "Detected password recovery token, navigating to set-new-password...",
    );
    router.navigate({
      pathname: "/auth/resetPassword/set-new-password",
      params: {
        token: passwordResetToken,
      },
    });

    // DON'T clear the token here! Let the page handle session restoration.
    // setPasswordResetToken(null);
  }, [loaded, passwordResetToken]);

  /* -------------------------------------------------
   * 3️⃣ Prevent rendering until fonts load
   * ------------------------------------------------- */
  // if (!loaded) return null;

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <Stack
        screenOptions={{
          animation: "slide_from_left",
        }}
      >
        <Stack.Screen
          name="onboarding/index"
          options={{ headerShown: false }}
        />

        <Stack.Screen name="map/index" options={{ headerShown: false }} />

        <Stack.Screen
          name="trackPackage/index"
          options={{
            title: "Track ...",
            headerShown: true,
            headerLeft: () => (
              <TouchableOpacity
                onPress={() => router.push("/(tabs)/deliveries")}
              >
                <Ionicons
                  name="arrow-back"
                  size={24}
                  color="black"
                  style={{ marginLeft: 10, marginRight: 15 }}
                />
              </TouchableOpacity>
            ),
          }}
        />

        <Stack.Screen name="index" options={{ headerShown: false }} />

        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

        {/* <Stack.Screen
          name="saved-locations"
          options={{
            headerShown: false,
            presentation: "transparentModal",
          }}
        /> */}

        <Stack.Screen
          name="all_chats/index"
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
