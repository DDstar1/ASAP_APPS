// app/index.tsx
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const timer = setTimeout(() => {
      router.replace("/onboarding");
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  return (
    <View className="flex-1 justify-center items-center">
      <ActivityIndicator size="large" color="#ff923e" />
    </View>
  );
}
