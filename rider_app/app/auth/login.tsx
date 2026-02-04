import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { TextInput } from "react-native-paper";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import { makeRedirectUri } from "expo-auth-session";
import { supabase } from "@/lib/supabase";
import { signInUser } from "@/lib/supabase-functions";

const redirectTo = makeRedirectUri({
  scheme: "com.asapRider",
  path: "auth-callback",
});

// ✅ Handles magic link redirects (email verification callback)
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

export default function RiderAuthScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // ✅ Handle deep link redirects after verification
  const url = Linking.useURL();
  useEffect(() => {
    if (url) {
      createSessionFromUrl(url);
      router.replace("/(tabs)/home");
    }
  }, [url]);

  // ✅ Login handler using reusable function
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
    <ScrollView
      contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
      keyboardShouldPersistTaps="handled"
      className="bg-[#1c1c1e]"
    >
      <View className="px-6">
        {/* Rider-specific heading */}
        <Text className="text-white text-3xl font-bold mb-2 text-center">
          Rider Login
        </Text>
        <Text className="text-white/70 text-center mb-8">
          Access your rider dashboard and start delivering
        </Text>

        {/* ✅ Email Input */}
        <TextInput
          label="Email"
          mode="outlined"
          placeholder="Enter your email"
          value={email}
          onChangeText={setEmail}
          left={<TextInput.Icon icon="email-outline" color="#aaa" />}
          keyboardType="email-address"
          autoCapitalize="none"
          textColor="#fff"
          outlineColor="#333"
          activeOutlineColor="#4ade80"
          style={{
            backgroundColor: "#2c2c2e",
            marginBottom: 16,
            borderRadius: 12,
          }}
          theme={{
            colors: {
              onSurfaceVariant: "#fff",
              outline: "#444",
              surfaceVariant: "#2c2c2e",
            },
          }}
        />

        {/* ✅ Password Input */}
        <TextInput
          label="Password"
          mode="outlined"
          placeholder="Enter your password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          left={<TextInput.Icon icon="lock-outline" color="#aaa" />}
          right={
            <TextInput.Icon
              icon={showPassword ? "eye-off-outline" : "eye-outline"}
              onPress={() => setShowPassword(!showPassword)}
              color="#aaa"
            />
          }
          textColor="#fff"
          outlineColor="#333"
          activeOutlineColor="#4ade80"
          style={{
            backgroundColor: "#2c2c2e",
            marginBottom: 24,
            borderRadius: 12,
          }}
          theme={{
            colors: {
              onSurfaceVariant: "#fff",
              outline: "#444",
              surfaceVariant: "#2c2c2e",
            },
          }}
        />

        {/* ✅ Sign In Button */}
        <TouchableOpacity
          onPress={handleSignIn}
          disabled={loading}
          className="bg-green-600 py-4 rounded-2xl mb-4"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-center text-base font-semibold">
              Sign In
            </Text>
          )}
        </TouchableOpacity>

        {/* ✅ Create Rider Account Link */}
        <TouchableOpacity onPress={() => router.navigate("/auth/signup")}>
          <Text className="text-green-400 text-right text-base font-semibold">
            Create Rider Account
          </Text>
        </TouchableOpacity>

        {/* Terms */}
        <Text className="text-gray-400 text-xs text-center mt-6">
          By continuing, you agree to our Terms & Privacy Policy.
        </Text>
      </View>
    </ScrollView>
  );
}
