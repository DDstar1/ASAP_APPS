import { useEffect } from "react";
import * as Linking from "expo-linking";
import { supabase } from "@/lib/supabase";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import { useRouter } from "expo-router";
import { View, ActivityIndicator } from "react-native";

export default function AuthCallback() {
  const router = useRouter();
  const url = Linking.useURL();

  useEffect(() => {
    const handleDeepLink = async () => {
      if (!url) return;
      const { params } = QueryParams.getQueryParams(url);
      const { access_token, refresh_token } = params;

      if (access_token) {
        await supabase.auth.setSession({ access_token, refresh_token });
        router.replace("/(tabs)/home");
      }
    };

    handleDeepLink();
  }, [url]);

  return (
    <View className="flex-1 justify-center items-center bg-[#1c1c1e]">
      <ActivityIndicator size="large" color="#10B981" />
    </View>
  );
}
