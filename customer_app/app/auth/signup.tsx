import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Input, Icon } from "@rneui/themed";
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
    setLoading(true);
    try {
      const user = await signUpUser(email, password, username);
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
        <Text className="text-white text-3xl font-bold mb-8 text-center">
          Create an Account
        </Text>

        <Input
          placeholder="Username"
          value={username}
          onChangeText={setUsername}
          leftIcon={<Icon name="person" type="material" color="#aaa" />}
          inputContainerStyle={{
            backgroundColor: "#2c2c2e",
            borderRadius: 12,
            borderBottomWidth: 0,
            paddingHorizontal: 10,
          }}
          inputStyle={{ color: "#fff" }}
        />

        <Input
          placeholder="Email"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          leftIcon={<Icon name="email" type="material" color="#aaa" />}
          inputContainerStyle={{
            backgroundColor: "#2c2c2e",
            borderRadius: 12,
            borderBottomWidth: 0,
            paddingHorizontal: 10,
          }}
          inputStyle={{ color: "#fff" }}
        />

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

        <Input
          placeholder="Confirm Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirm}
          leftIcon={<Icon name="lock" type="material" color="#aaa" />}
          rightIcon={
            <Icon
              name={showConfirm ? "visibility" : "visibility-off"}
              type="material"
              color="#aaa"
              onPress={() => setShowConfirm(!showConfirm)}
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

        <TouchableOpacity
          onPress={handleSignUp}
          disabled={loading}
          className="bg-green-600 py-4 rounded-2xl mb-4"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-center text-base font-semibold">
              Create Account
            </Text>
          )}
        </TouchableOpacity>

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
