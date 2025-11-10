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
import { makeRedirectUri } from "expo-auth-session";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import * as Linking from "expo-linking";
import { signUpUser } from "@/lib/supabase-functions";

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

export default function RiderSignUpScreen() {
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
    if (!username || !email || !password || !confirmPassword) {
      return Alert.alert("Error", "All fields are required");
    }
    if (password !== confirmPassword) {
      return Alert.alert("Error", "Passwords do not match");
    }

    setLoading(true);
    try {
      await signUpUser(email, password, username);
      Alert.alert(
        "Verify Your Email",
        "A verification link has been sent to your inbox."
      );
      router.push("/(tabs)/home");
    } catch (err: any) {
      Alert.alert("Signup Failed", err.message || "An error occurred");
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
          Rider Sign Up
        </Text>
        <Text className="text-white/70 text-center mb-8">
          Create your rider account to start delivering
        </Text>

        {/* Username */}
        <TextInput
          label="Username"
          mode="outlined"
          value={username}
          onChangeText={setUsername}
          style={{ marginBottom: 12, backgroundColor: "#2c2c2e" }}
          outlineStyle={{ borderColor: "#3a3a3c" }}
          textColor="#fff"
          theme={{ colors: { primary: "#34D399" } }}
        />

        {/* Email */}
        <TextInput
          label="Email"
          mode="outlined"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          style={{ marginBottom: 12, backgroundColor: "#2c2c2e" }}
          outlineStyle={{ borderColor: "#3a3a3c" }}
          textColor="#fff"
          theme={{ colors: { primary: "#34D399" } }}
        />

        {/* Password */}
        <TextInput
          label="Password"
          mode="outlined"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          right={
            <TextInput.Icon
              icon={showPassword ? "eye-off" : "eye"}
              onPress={() => setShowPassword(!showPassword)}
              color="#aaa"
            />
          }
          style={{ marginBottom: 12, backgroundColor: "#2c2c2e" }}
          outlineStyle={{ borderColor: "#3a3a3c" }}
          textColor="#fff"
          theme={{ colors: { primary: "#34D399" } }}
        />

        {/* Confirm Password */}
        <TextInput
          label="Confirm Password"
          mode="outlined"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirm}
          right={
            <TextInput.Icon
              icon={showConfirm ? "eye-off" : "eye"}
              onPress={() => setShowConfirm(!showConfirm)}
              color="#aaa"
            />
          }
          style={{ marginBottom: 20, backgroundColor: "#2c2c2e" }}
          outlineStyle={{ borderColor: "#3a3a3c" }}
          textColor="#fff"
          theme={{ colors: { primary: "#34D399" } }}
        />

        {/* Sign Up Button */}
        <TouchableOpacity
          onPress={handleSignUp}
          disabled={loading}
          className="bg-green-600 py-4 rounded-2xl mb-4"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-center text-base font-semibold">
              Create Rider Account
            </Text>
          )}
        </TouchableOpacity>

        {/* Login Redirect */}
        <TouchableOpacity onPress={() => router.push("/auth/login")}>
          <Text className="text-green-400 text-center text-base font-semibold">
            Already have an account? Sign In
          </Text>
        </TouchableOpacity>

        <Text className="text-gray-400 text-xs text-center mt-6">
          By signing up, you agree to our Terms & Privacy Policy.
        </Text>
      </View>
    </ScrollView>
  );
}
