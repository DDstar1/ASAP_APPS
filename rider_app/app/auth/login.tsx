import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
} from "react-native";
import { TextInput } from "react-native-paper";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import { makeRedirectUri } from "expo-auth-session";
import { supabase } from "@/lib/supabase";
import { signInUser } from "@/lib/supabase-app-functions";
import { MyKeyboardAvoidingWrapper } from "@/components/MyKeyboardAvoidingWrapper";

const redirectTo = makeRedirectUri({
  scheme: "com.asapCustomer",
  path: "auth-callback",
});

const createSessionFromUrl = async (url: string) => {
  const { params } = QueryParams.getQueryParams(url);
  const { access_token, refresh_token } = params;
  if (access_token) {
    const { error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });
    if (error) console.error("Session creation failed:", error);
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

export default function AuthScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotVisible, setForgotVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const url = Linking.useURL();
  useEffect(() => {
    if (url) {
      createSessionFromUrl(url);
      router.replace("/(tabs)/home");
    }
  }, [url]);

  const handleSignIn = async () => {
    if (!email || !password)
      return Alert.alert("Error", "Email and password required");
    setLoading(true);
    try {
      await signInUser(email, password);
      router.replace("/(tabs)/home");
    } catch (err: any) {
      Alert.alert("Login Failed", err.message);
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
        className="bg-[#080e1c] px-6 "
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
          Welcome Back.
        </Text>
        <Text className="text-sm text-[#a5abbd] mb-9">
          Sign in to track your deliveries
        </Text>

        {/* Email Input */}
        <TextInput
          label="Email"
          mode="outlined"
          placeholder="your@email.com"
          value={email}
          onChangeText={setEmail}
          left={<TextInput.Icon icon="email-outline" color="#a5abbd" />}
          keyboardType="email-address"
          autoCapitalize="none"
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

        {/* Password Input */}
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
            marginBottom: 8,
            borderRadius: 12,
          }}
          theme={inputTheme}
        />

        {/* Forgot Password — muted, low-hierarchy */}
        <TouchableOpacity
          onPress={() => router.push("/auth/resetPassword/forgot-password")}
          className="self-end mb-7"
        >
          <Text className="text-xs font-normal text-[#3d4560]">
            Forgot password?
          </Text>
        </TouchableOpacity>

        {/* Sign In Button */}
        <TouchableOpacity
          onPress={handleSignIn}
          disabled={loading}
          className="w-full py-4 rounded-full bg-[#ff923e] items-center mb-6"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-base font-semibold">Sign In</Text>
          )}
        </TouchableOpacity>

        {/* OR Divider */}
        <View className="flex-row items-center mb-4">
          <View className="flex-1 h-px bg-white/[0.07]" />
          <Text className="text-xs text-[#3d4560] mx-3">OR</Text>
          <View className="flex-1 h-px bg-white/[0.07]" />
        </View>

        {/* Create Account — full width outlined pill */}
        <TouchableOpacity
          onPress={() => router.navigate("/auth/signup")}
          className="w-full py-4 rounded-full border border-[#ff923e]/35 items-center"
        >
          <Text className="text-base font-semibold text-[#ff923e]">
            Create Account
          </Text>
        </TouchableOpacity>

        <Text className="text-[11px] text-[#3d4560] text-center mt-6 leading-relaxed">
          By continuing, you agree to our Terms &amp; Privacy Policy.
        </Text>
      </ScrollView>
    </MyKeyboardAvoidingWrapper>
  );
}
