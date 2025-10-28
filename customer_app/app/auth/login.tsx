import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Input, Icon } from "@rneui/themed";
import { useRouter } from "expo-router";
import * as Linking from "expo-linking";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import { makeRedirectUri } from "expo-auth-session";
import { supabase } from "@/lib/supabase";
import { signInUser } from "@/lib/supabase-functions";

const redirectTo = makeRedirectUri({
  scheme: "com.asapCustomer",
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

export default function AuthScreen() {
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

  // ✅ Login handler using our reusable function
  const handleSignIn = async () => {
    if (!email || !password)
      return Alert.alert("Error", "Email and password required");

    setLoading(true);
    try {
      await signInUser(email, password); // this also sets Zustand user
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
        <Text className="text-white text-3xl font-bold mb-8 text-center">
          Welcome Back
        </Text>

        {/* Email Input */}
        <Input
          placeholder="Email"
          placeholderTextColor="#aaa"
          leftIcon={<Icon name="mail-outline" type="ionicon" color="#aaa" />}
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
          inputStyle={{ color: "#fff" }}
          inputContainerStyle={{
            backgroundColor: "#2c2c2e",
            borderBottomWidth: 0,
            borderRadius: 12,
            paddingHorizontal: 10,
          }}
          containerStyle={{ paddingHorizontal: 0, marginBottom: 10 }}
        />

        {/* Password Input */}
        <Input
          placeholder="Password"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          leftIcon={<Icon name="lock" type="material" color="#aaa" />}
          rightIcon={
            <Icon
              name={showPassword ? "visibility" : "visibility-off"}
              type="material"
              color="#aaa"
              onPress={() => setShowPassword(!showPassword)}
            />
          }
          inputContainerStyle={{
            backgroundColor: "#2c2c2e",
            borderRadius: 12,
            borderBottomWidth: 0,
            paddingHorizontal: 10,
          }}
          inputStyle={{ color: "#fff" }}
        />

        {/* Sign In Button */}
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

        {/* Create Account Link */}
        <TouchableOpacity onPress={() => router.push("/auth/signup")}>
          <Text className="text-green-400 text-right text-base font-semibold">
            Create Account
          </Text>
        </TouchableOpacity>

        <Text className="text-gray-400 text-xs text-center mt-6">
          By continuing, you agree to our Terms & Privacy Policy.
        </Text>
      </View>
    </ScrollView>
  );
}
