import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, Image, View } from "react-native";
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
