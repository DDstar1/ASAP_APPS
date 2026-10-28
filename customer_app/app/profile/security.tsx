import { updateUserPassword } from "@/lib/supabase-app-functions";
import { MyKeyboardAvoidingWrapper } from "@/components/MyKeyboardAvoidingWrapper";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ORANGE = "#FF7518";

export default function SecurityScreen() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const mismatch = !!confirm && next !== confirm;
  const canSubmit = !loading && !!current && next.length >= 8 && next === confirm;

  const save = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError("");
    try {
      await updateUserPassword(current, next);
      setDone(true);
      setCurrent("");
      setNext("");
      setConfirm("");
    } catch (e) {
      setError((e instanceof Error && e.message) || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-black">
      <MyKeyboardAvoidingWrapper style={{ justifyContent: "flex-start" }}>
        <View className="flex-row items-center px-4 py-3">
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back"
            className="w-11 h-11 rounded-full bg-[#2C2C30] justify-center items-center"
          >
            <Ionicons name="chevron-back" size={22} color="white" />
          </TouchableOpacity>
          <Text className="flex-1 text-center text-white text-xl font-bold mr-11">
            Login &amp; security
          </Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View className="flex-row items-center gap-3 mb-8">
            <View className="w-11 h-11 rounded-2xl bg-[#FF7518]/15 items-center justify-center">
              <MaterialIcons name="lock-reset" size={22} color={ORANGE} />
            </View>
            <View className="flex-1">
              <Text className="text-white text-lg font-bold">Change password</Text>
              <Text className="text-gray-400 text-xs mt-0.5">At least 8 characters</Text>
            </View>
          </View>

          <PasswordField label="Current password" value={current}
            onChangeText={(v) => { setCurrent(v); setError(""); setDone(false); }} />
          <TouchableOpacity
            onPress={() => router.push("/auth/resetPassword/forgot-password")}
            className="self-end -mt-2 mb-5"
            hitSlop={{ top: 8, bottom: 8, left: 12, right: 4 }}
          >
            <Text className="text-[#FF7518] text-xs font-medium">Forgot password?</Text>
          </TouchableOpacity>

          <PasswordField label="New password" value={next}
            onChangeText={(v) => { setNext(v); setError(""); setDone(false); }} />
          <PasswordField label="Confirm new password" value={confirm} invalid={mismatch}
            onChangeText={(v) => { setConfirm(v); setError(""); setDone(false); }} />
          {mismatch && <Text className="text-red-400 text-xs -mt-3 mb-4">Passwords don&apos;t match</Text>}

          {!!error && (
            <View className="flex-row items-start gap-2 rounded-2xl px-4 py-3 bg-red-500/10">
              <MaterialIcons name="error-outline" size={16} color="#ef4444" />
              <Text className="flex-1 text-sm text-red-400">{error}</Text>
            </View>
          )}
          {done && (
            <View className="flex-row items-start gap-2 rounded-2xl px-4 py-3 bg-green-500/10">
              <MaterialIcons name="check-circle" size={16} color="#22c55e" />
              <Text className="flex-1 text-sm text-green-400">Your password has been changed.</Text>
            </View>
          )}

          <TouchableOpacity
            onPress={save}
            disabled={!canSubmit}
            accessibilityRole="button"
            className="h-14 rounded-full justify-center items-center mt-8"
            style={{ backgroundColor: canSubmit ? ORANGE : "rgba(255,117,24,0.3)" }}
          >
            {loading ? <ActivityIndicator color="white" /> : (
              <Text className="text-white text-base font-bold">Update password</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </MyKeyboardAvoidingWrapper>
    </SafeAreaView>
  );
}

function PasswordField({ label, value, onChangeText, invalid }: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  invalid?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <View className="mb-5">
      <Text className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-2">{label}</Text>
      <View
        className="flex-row items-center gap-3 bg-[#1C1C21] rounded-2xl px-4 h-14"
        style={{ borderWidth: invalid ? 1 : 0, borderColor: "#ef4444" }}
      >
        <MaterialIcons name="lock-outline" size={18} color="#9CA3AF" />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={!show}
          autoCapitalize="none"
          placeholderTextColor="#6B7280"
          className="flex-1 text-white text-base"
        />
        <TouchableOpacity onPress={() => setShow((s) => !s)} accessibilityLabel={show ? "Hide password" : "Show password"}>
          <MaterialIcons name={show ? "visibility-off" : "visibility"} size={18} color="#9CA3AF" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
