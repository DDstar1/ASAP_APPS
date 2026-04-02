import { useEffect, useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import { supabase } from "@/lib/supabase";
import { useRouter, useLocalSearchParams } from "expo-router";

export default function SetNewPassword() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionRestored, setSessionRestored] = useState(false);
  const router = useRouter();
  const params = useLocalSearchParams(); // Get query params from router

  const tokenFragment = params.token; // This is the fragment from RootLayout

  useEffect(() => {
    if (!tokenFragment) return;

    const restoreSession = async () => {
      try {
        // Parse fragment params (access_token, refresh_token, type)
        const searchParams = new URLSearchParams(tokenFragment);
        const accessToken = searchParams.get("access_token");
        const refreshToken = searchParams.get("refresh_token");
        const type = searchParams.get("type");

        if (accessToken && refreshToken && type === "recovery") {
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) {
            console.error("Session error:", error);
            Alert.alert("Error restoring session", error.message);
          } else {
            console.log("Session restored successfully:", data);
            setSessionRestored(true);
          }
        } else {
          Alert.alert(
            "Invalid Link",
            "The password reset link is invalid or has expired.",
          );
        }
      } catch (error) {
        console.error("Error restoring session:", error);
      }
    };

    restoreSession();
  }, [tokenFragment]);

  const handleSave = async () => {
    if (!password) {
      return Alert.alert("Error", "Please enter a new password");
    }

    if (password.length < 6) {
      return Alert.alert("Error", "Password must be at least 6 characters");
    }

    setLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        Alert.alert("Error", error.message);
      } else {
        Alert.alert("Success", "Password updated successfully!", [
          {
            text: "OK",
            onPress: () => router.replace("/auth/login"),
          },
        ]);
      }
    } catch (error) {
      Alert.alert("Error", "Something went wrong. Please try again.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (!sessionRestored) {
    return (
      <View className="flex-1 justify-center items-center p-6 bg-white">
        <Text className="text-xl font-bold mb-4">Restoring session...</Text>
        <Text className="text-gray-600 text-center">
          Please wait while we validate your password reset link.
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1 p-6 bg-white justify-center">
      <Text className="text-2xl font-bold mb-2">Set New Password</Text>
      <Text className="text-gray-600 mb-6">Enter your new password below</Text>

      <TextInput
        className="bg-gray-100 p-4 rounded-xl mb-4 text-base"
        placeholder="New Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <TouchableOpacity
        onPress={handleSave}
        className="bg-orange-500 py-4 rounded-xl"
        disabled={loading}
      >
        <Text className="text-center text-white font-semibold text-base">
          {loading ? "Saving..." : "Save Password"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
