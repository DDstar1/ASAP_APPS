import { router } from "expo-router";
import React, { useState } from "react";
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
import { SafeAreaView } from "react-native-safe-area-context";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { supabase } from "@/lib/supabase";
import ForgotPasswordIllustration from "@/components/illustrations/ForgotPasswordIllustration";
import { MyKeyboardAvoidingWrapper } from "@/components/MyKeyboardAvoidingWrapper";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [focused, setFocused] = useState(false);

  const isValid = email.includes("@") && email.includes(".");
  const canSubmit = isValid && !loading;

  const handleSend = async () => {
    if (!email) return Alert.alert("Error", "Please enter your email");

    try {
      setLoading(true);
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: "asapcustomer://auth/resetPassword/set-new-password",
      });

      if (error) {
        Alert.alert("Error", error.message);
      } else {
        setSent(true);
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-[#080e1c]">
      <MyKeyboardAvoidingWrapper>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Top section ── */}
          <View className="px-6 pt-4">
            {/* Back button */}
            <TouchableOpacity
              onPress={() => router.back()}
              className="w-10 h-10 rounded-xl bg-[#121a2b] items-center justify-center mb-9"
            >
              <MaterialIcons name="arrow-back" size={20} color="#a5abbd" />
            </TouchableOpacity>

            {/* Headline */}
            <Text className="text-[#e0e5f9] text-[30px] font-extrabold leading-9 mb-2">
              Forgot your password?
            </Text>

            <Text className="text-[#a5abbd] text-sm leading-6 mb-16">
              No worries. Enter the email tied to your account and we'll send a
              secure reset link.
            </Text>

            {/* ── Input card ── */}
            <View className="bg-[#0f1626] rounded-2xl p-5 mb-4">
              <Text className="text-[#a5abbd] text-[11px] tracking-[2.5px] font-semibold mb-3 uppercase">
                Email Address
              </Text>

              <View
                className={`flex-row items-center bg-[#121a2b] rounded-xl px-4 py-3.5 gap-3 border ${
                  focused ? "border-orange-400/40" : "border-transparent"
                }`}
              >
                <MaterialIcons
                  name="alternate-email"
                  size={18}
                  color={focused ? "#ff923e" : "#a5abbd"}
                />

                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="you@example.com"
                  placeholderTextColor="#4a5568"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => setFocused(true)}
                  onBlur={() => setFocused(false)}
                  className="flex-1 text-[#e0e5f9] text-[15px]"
                />

                {isValid && (
                  <MaterialIcons
                    name="check-circle"
                    size={18}
                    color="#ff923e"
                  />
                )}
              </View>
            </View>

            {/* ── Success state ── */}
            {sent && (
              <View className="flex-row items-center bg-orange-400/10 rounded-xl p-3.5 gap-2.5 mb-4 border border-orange-400/20">
                <MaterialIcons
                  name="mark-email-read"
                  size={20}
                  color="#ff923e"
                />
                <Text className="text-[#e0e5f9] text-[13px] flex-1 leading-5">
                  Reset link sent! Check your inbox and tap the link to set a
                  new password.
                </Text>
              </View>
            )}

            {/* ── CTA button ── */}
            <TouchableOpacity
              onPress={handleSend}
              disabled={!canSubmit}
              className={`rounded-full py-4 items-center justify-center flex-row gap-2 mb-5 ${
                canSubmit ? "bg-[#ff923e]" : "bg-orange-400/20"
              }`}
            >
              <MaterialIcons
                name={loading ? "hourglass-top" : "send"}
                size={18}
                color={canSubmit ? "#000" : "#ff923e"}
              />
              <Text
                numberOfLines={1}
                className={`font-extrabold text-sm uppercase ${
                  canSubmit ? "text-black" : "text-orange-400/50"
                }`}
              >
                {loading
                  ? "Sending…"
                  : sent
                    ? "Resend Link"
                    : "Send Reset Link"}
              </Text>
            </TouchableOpacity>

            {/* Back to login */}
            <TouchableOpacity
              onPress={() => router.replace("/auth/login")}
              className="items-center py-1"
            >
              <Text className="text-[#a5abbd] text-[13px]">
                Remember it?{" "}
                <Text className="text-[#ff923e] font-bold">Back to login</Text>
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Illustration ── */}
          <View className="flex-1 items-center justify-end pb-4 pt-6">
            <View className="w-12 h-[1px] bg-[#1e2d4a] mb-7" />

            <ForgotPasswordIllustration className="mt-2" />

            <Text className="text-[#2a3245] text-[10px] tracking-[2px] mt-3 uppercase">
              Secured with Supabase Auth
            </Text>
          </View>
        </ScrollView>
      </MyKeyboardAvoidingWrapper>
    </SafeAreaView>
  );
}
