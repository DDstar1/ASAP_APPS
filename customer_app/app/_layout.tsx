import "./global.css";

import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Stack, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import "react-native-reanimated";
import { useColorScheme } from "@/hooks/use-color-scheme";
import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity } from "react-native";
import * as Linking from "expo-linking";
import { useEffect } from "react";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();

  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  // ✅ Handle deep links here
  useEffect(() => {
    const handleDeepLink = (event: Linking.EventType | { url: string }) => {
      const url = event.url;
      if (!url) return;

      const { hostname, queryParams } = Linking.parse(url);
      console.log("📩 Incoming deep link:", url);

      if (hostname === "view-location" && queryParams) {
        const { lat, lng } = queryParams;

        // Redirect to /home with params to open modal
        router.push({
          pathname: "/(tabs)/home",
          params: {
            modal: "sharedlocation",
            edit: "true",
            lat,
            lng,
          },
        });
      }
    };

    // Listen for incoming links when app is open
    const sub = Linking.addEventListener("url", handleDeepLink);

    // Handle case when app was opened from a link (cold start)
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => sub.remove();
  }, []);

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
        <Stack.Screen name="auth" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
