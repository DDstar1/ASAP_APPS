import { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { supabase } from "@/lib/supabase";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useUserStore } from "@/store/useUserStore";
import { MyKeyboardAvoidingWrapper } from "@/components/MyKeyboardAvoidingWrapper";
import { SafeAreaView } from "react-native-safe-area-context";
import SetPasswordIllustration from "@/components/illustrations/SetPasswordIllustration";
import { MaterialIcons } from "@expo/vector-icons";

export default function SetNewPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionRestored, setSessionRestored] = useState(false);
  const router = useRouter();
  const params = useLocalSearchParams(); // Get query params from router

  const { setIsResettingPassword } = useUserStore();
  const tokenFragment = params.token;

  useEffect(() => {
    if (!tokenFragment) return;

    const restoreSession = async () => {
      try {
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
            Alert.alert("Error restoring session", error.message);
          } else {
            setSessionRestored(true);
          }
        } else {
          Alert.alert(
            "Invalid Link",
            "The password reset link is invalid or has expired.",
          );
        }
      } catch (error) {
        console.error("Unexpected error restoring session:", error);
      }
    };

    const timer = setTimeout(() => restoreSession(), 10000);
    return () => clearTimeout(timer);
  }, [tokenFragment]);

  const handleSave = async () => {
    if (!password || !confirmPassword) {
      return Alert.alert("Error", "Please enter your password and confirm it");
    }

    if (password.length < 6) {
      return Alert.alert("Error", "Password must be at least 6 characters");
    }

    if (password !== confirmPassword) {
      return Alert.alert("Error", "Passwords do not match");
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
            onPress: () => {
              router.replace("/auth/login");
              setIsResettingPassword(false);
            },
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
      <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-[#080e1c]">
        <View className="flex-1 justify-center items-center px-6">
          <View className="bg-[#0f1626] rounded-2xl p-8 items-center max-w-sm w-full">
            <MaterialIcons name="lock-reset" size={48} color="#ff923e" />
            <Text className="text-[#e0e5f9] text-xl font-bold mt-6 mb-3">
              Validating link
            </Text>
            <Text className="text-[#a5abbd] text-sm text-center leading-6">
              Please wait while we verify your password reset link.
            </Text>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 p-6 py-20 gap-1 bg-[#080e1c] justify-start">
      <MyKeyboardAvoidingWrapper>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View className="pt-4">
            {/* Title */}
            <Text className="text-2xl font-bold mb-2 text-[#e0e5f9]">
              Set New Password
            </Text>
            <Text className="mb-6 text-[#a5abbd]">
              Enter your new password below
            </Text>

            {/* New Password Input */}
            <TextInput
              className="bg-[#0d1629] p-4 rounded-md mb-4 text-[#e0e5f9]"
              placeholder="New Password"
              placeholderTextColor="#a5abbd"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Confirm Password Input */}
            <TextInput
              className="bg-[#0d1629] p-4 rounded-md mb-6 text-[#e0e5f9]"
              placeholder="Confirm Password"
              placeholderTextColor="#a5abbd"
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              autoCapitalize="none"
              autoCorrect={false}
            />

            {/* Save Button */}
            <TouchableOpacity
              onPress={handleSave}
              disabled={loading}
              className="py-4 rounded-full"
              style={{
                backgroundColor: "#ff923e", // solid primary orange
                overflow: "hidden",
              }}
            >
              <Text className="text-center text-[#e0e5f9] font-bold text-base">
                {loading ? "Saving..." : "Save Password"}
              </Text>
            </TouchableOpacity>
          </View>
          {/* ── Illustration ── */}
          <View className="flex-1 items-center justify-end pb-4 pt-6">
            <View className="w-12 h-[1px] bg-[#1e2d4a] mb-7" />

            <SetPasswordIllustration height={250} width={250} />

            <Text className="text-[#2a3245] text-[10px] tracking-[2px] mt-3 uppercase">
              Secured with Supabase Auth
            </Text>
          </View>
        </ScrollView>
      </MyKeyboardAvoidingWrapper>
    </SafeAreaView>
  );
}
