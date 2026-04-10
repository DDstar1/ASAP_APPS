import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { TextInput } from "react-native-paper";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import * as Linking from "expo-linking";
import { signUpUser } from "@/lib/supabase-app-functions";
import { MyKeyboardAvoidingWrapper } from "@/components/MyKeyboardAvoidingWrapper";

const createSessionFromUrl = async (url: string) => {
  const { params } = QueryParams.getQueryParams(url);
  const { access_token, refresh_token } = params;
  if (access_token) {
    const { error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });
    if (error) console.error(error);
  }
};

const inputTheme = {
  colors: {
    onSurfaceVariant: "#e0e5f9",
    outline: "rgba(255,255,255,0.08)",
    surfaceVariant: "#131a2e",
    primary: "#ff923e",
  },
};

export default function SignUpScreen() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const url = Linking.useURL();
  useEffect(() => {
    if (url) {
      createSessionFromUrl(url);
      router.replace("/(tabs)/home");
    }
  }, [url]);

  const handleSignUp = async () => {
    if (!username || !email || !password || !confirmPassword)
      return Alert.alert("Error", "All fields are required");
    if (password !== confirmPassword)
      return Alert.alert("Error", "Passwords do not match");

    setLoading(true);
    try {
      await signUpUser(email, password, username);
      Alert.alert(
        "Verify Your Email",
        "A verification link has been sent to your inbox.",
      );
      router.navigate("/(tabs)/home");
    } catch (err: any) {
      Alert.alert("Signup Failed", err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MyKeyboardAvoidingWrapper>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center", // ← centers content vertically
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        className="bg-[#080e1c] px-6"
      >
        {/* Logo Row */}
        <View className="flex-row items-center mb-8">
          <View className="w-2.5 h-2.5 rounded-full bg-[#ff923e] mr-2.5" />
          <Text className="text-xs font-semibold text-[#a5abbd] tracking-widest uppercase">
            ASAP Delivery
          </Text>
        </View>

        {/* Heading */}
        <Text className="text-[34px] font-bold text-[#e0e5f9] leading-tight mb-1.5">
          Create an Account.
        </Text>
        <Text className="text-sm text-[#a5abbd] mb-9">
          Sign up to start sending your packages
        </Text>

        {/* Username */}
        <TextInput
          label="Username"
          mode="outlined"
          placeholder="yourname"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          left={<TextInput.Icon icon="account-outline" color="#a5abbd" />}
          textColor="#e0e5f9"
          outlineColor="rgba(255,255,255,0.08)"
          activeOutlineColor="#ff923e"
          style={{
            backgroundColor: "#131a2e",
            marginBottom: 16,
            borderRadius: 12,
          }}
          theme={inputTheme}
        />

        {/* Email */}
        <TextInput
          label="Email"
          mode="outlined"
          placeholder="your@email.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          left={<TextInput.Icon icon="email-outline" color="#a5abbd" />}
          textColor="#e0e5f9"
          outlineColor="rgba(255,255,255,0.08)"
          activeOutlineColor="#ff923e"
          style={{
            backgroundColor: "#131a2e",
            marginBottom: 16,
            borderRadius: 12,
          }}
          theme={inputTheme}
        />

        {/* Password */}
        <TextInput
          label="Password"
          mode="outlined"
          placeholder="••••••••"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          left={<TextInput.Icon icon="lock-outline" color="#a5abbd" />}
          right={
            <TextInput.Icon
              icon={showPassword ? "eye-off-outline" : "eye-outline"}
              onPress={() => setShowPassword(!showPassword)}
              color="#a5abbd"
            />
          }
          textColor="#e0e5f9"
          outlineColor="rgba(255,255,255,0.08)"
          activeOutlineColor="#ff923e"
          style={{
            backgroundColor: "#131a2e",
            marginBottom: 16,
            borderRadius: 12,
          }}
          theme={inputTheme}
        />

        {/* Confirm Password */}
        <TextInput
          label="Confirm Password"
          mode="outlined"
          placeholder="••••••••"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirm}
          left={<TextInput.Icon icon="lock-check-outline" color="#a5abbd" />}
          right={
            <TextInput.Icon
              icon={showConfirm ? "eye-off-outline" : "eye-outline"}
              onPress={() => setShowConfirm(!showConfirm)}
              color="#a5abbd"
            />
          }
          textColor="#e0e5f9"
          outlineColor="rgba(255,255,255,0.08)"
          activeOutlineColor="#ff923e"
          style={{
            backgroundColor: "#131a2e",
            marginBottom: 28,
            borderRadius: 12,
          }}
          theme={inputTheme}
        />

        {/* Create Account Button */}
        <TouchableOpacity
          onPress={handleSignUp}
          disabled={loading}
          className="w-full py-4 rounded-full bg-[#ff923e] items-center mb-6"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-base font-semibold">
              Create Account
            </Text>
          )}
        </TouchableOpacity>

        {/* OR Divider */}
        <View className="flex-row items-center mb-4">
          <View className="flex-1 h-px bg-white/[0.07]" />
          <Text className="text-xs text-[#3d4560] mx-3">OR</Text>
          <View className="flex-1 h-px bg-white/[0.07]" />
        </View>

        {/* Sign In — full width outlined pill */}
        <TouchableOpacity
          onPress={() => router.navigate("/auth/login")}
          className="w-full py-4 rounded-full border border-[#ff923e]/35 items-center"
        >
          <Text className="text-base font-semibold text-[#ff923e]">
            Already have an account? Sign In
          </Text>
        </TouchableOpacity>

        <Text className="text-[11px] text-[#3d4560] text-center mt-6 leading-relaxed">
          By signing up, you agree to our Terms &amp; Privacy Policy.
        </Text>
      </ScrollView>
    </MyKeyboardAvoidingWrapper>
  );
}
