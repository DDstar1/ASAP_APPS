// app/index.tsx
import { useRouter } from "expo-router";

import { useEffect } from "react";
import { ActivityIndicator, Image, View } from "react-native";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    // redirect to onboarding when app starts
    router.replace("/onboarding");
  }, []);

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
        color="#EE7F3A"
        style={{ position: "absolute", bottom: 80 }}
      />
    </View>
  );
}
