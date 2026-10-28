// app/index.tsx
import { useRouter } from "expo-router";

import { useEffect } from "react";
import { ActivityIndicator, Image, View } from "react-native";
import { useUserStore } from "@/store/useUserStore";

export default function Index() {
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const loading = useUserStore((s) => s.loading);

  // _layout starts the session check; wait for it before choosing a screen
  useEffect(() => {
    if (loading) return;
    router.replace(user ? "/(tabs)/home" : "/onboarding");
  }, [loading]);

  return (
    // Same image and colour as the native splash so the hand-off doesn't jump
    <View className="flex-1 justify-center items-center bg-[#1F2124]">
      <Image
        source={require("../assets/images/splash-asap.png")}
        style={{ width: 200, height: 287 }}
        resizeMode="contain"
        accessibilityLabel="ASAP"
      />
      <ActivityIndicator
        size="small"
        color="#FF7518"
        style={{ position: "absolute", bottom: 80 }}
      />
    </View>
  );
}
