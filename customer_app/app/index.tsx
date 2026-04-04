import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { useUserStore } from "@/store/useUserStore";

export default function Index() {
  const router = useRouter();
  const { fetchUserSession, isResettingPassword } = useUserStore();

  useEffect(() => {
    // Run once on mount only
    const init = async () => {
      await fetchUserSession();

      // Read fresh state directly from the store, not from closure
      const freshUser = useUserStore.getState().user;

      if (isResettingPassword) return; // 🛑 Don't redirect during password reset

      if (freshUser) {
        router.replace("/home");
      } else {
        router.replace("/onboarding");
      }
    };

    init();
  }, []); // 👈 Empty deps — run once on mount, never again

  return (
    <View className="flex-1 justify-center items-center">
      <ActivityIndicator size="large" color="#ff923e" />
    </View>
  );
}
