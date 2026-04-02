import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useUserStore } from "@/store/useUserStore";

export default function Index() {
  const router = useRouter();
  const { user, fetchUserSession } = useUserStore();

  useEffect(() => {
    fetchUserSession().then(() => {
      if (user) {
        router.replace("/home"); // logged in
      } else {
        router.replace("/onboarding"); // logged out
      }
    });
  }, [user]);

  return (
    <View className="flex-1 justify-center items-center">
      <ActivityIndicator size="large" color="#ff923e" />
    </View>
  );
}
