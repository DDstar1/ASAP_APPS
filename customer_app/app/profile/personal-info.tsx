import { IMAGES } from "@/assets/assetsData";
import {
  requestEmailChange,
  updateProfileDetails,
  updateProfileImage,
} from "@/lib/supabase-app-functions";
import { normalizePhone } from "@/lib/phone";
import { useUserStore } from "@/store/useUserStore";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MyKeyboardAvoidingWrapper } from "@/components/MyKeyboardAvoidingWrapper";

const ORANGE = "#FF7518";

type Notice = { tone: "ok" | "error"; text: string } | null;

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

// Rust answers 404 until POST /riders/profile is deployed
const saveError = (e: unknown) =>
  message(e).includes("API 404")
    ? "Changing your name or phone isn't available yet. Please try again later."
    : message(e).replace(/^API \d+: /, "") || "Couldn't save your details. Please try again.";

export default function PersonalInfoScreen() {
  const { user, setUser, fetchUserSession } = useUserStore();
  const [username, setUsername] = useState(user?.username ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [photo, setPhoto] = useState<string | null>(user?.profileImage ?? null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const detailsChanged =
    username.trim() !== (user?.username ?? "") ||
    (normalizePhone(phone) ?? phone.trim()) !== (user?.phone ?? "");
  const emailChanged = email.trim().toLowerCase() !== (user?.email ?? "").toLowerCase();

  const changePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setNotice({ tone: "error", text: "Allow photo access to choose a profile picture." });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !user?.id) return;

    setUploading(true);
    setNotice(null);
    try {
      const asset = result.assets[0];
      const url = await updateProfileImage(user.id, asset.uri, asset.mimeType);
      setPhoto(url);
      setUser({ ...user, profileImage: url });
    } catch (e) {
      setNotice({ tone: "error", text: `Couldn't update your photo: ${message(e)}` });
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    const name = username.trim();
    const normalized = normalizePhone(phone);
    if (!name) return setNotice({ tone: "error", text: "Enter your name." });
    if (!normalized) return setNotice({ tone: "error", text: "Enter a valid phone number, e.g. 08012345678." });
    if (emailChanged && !/^\S+@\S+\.\S+$/.test(email.trim())) {
      return setNotice({ tone: "error", text: "Enter a valid email address." });
    }

    setSaving(true);
    setNotice(null);
    const done: string[] = [];
    try {
      if (detailsChanged) {
        await updateProfileDetails({ username: name, phone: normalized });
        setPhone(normalized);
        done.push("Your details are saved.");
      }
      if (emailChanged) {
        await requestEmailChange(email.trim());
        done.push(`We've sent a link to ${email.trim()}. Your email changes once you open it.`);
      }
      await fetchUserSession();
      setNotice({ tone: "ok", text: done.join(" ") });
    } catch (e) {
      setNotice({ tone: "error", text: [...done, saveError(e)].join(" ") });
    } finally {
      setSaving(false);
    }
  };

  const canSave = (detailsChanged || emailChanged) && !saving;

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-black">
      <MyKeyboardAvoidingWrapper style={{ justifyContent: "flex-start" }}>
        {/* Header */}
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
            Personal info
          </Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          {/* Photo */}
          <TouchableOpacity
            onPress={changePhoto}
            disabled={uploading}
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
            className="self-center mb-8"
          >
            <View className="w-28 h-28 rounded-full bg-white overflow-hidden">
              <Image source={photo ? { uri: photo } : IMAGES.helmet_avatar} className="w-28 h-28" />
            </View>
            <View className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-[#FF7518] border-2 border-black justify-center items-center">
              {uploading ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <MaterialIcons name="photo-camera" size={16} color="white" />
              )}
            </View>
          </TouchableOpacity>

          <Field label="Name" icon="person-outline" value={username} onChangeText={setUsername}
            placeholder="Your name" autoCapitalize="words" />
          <Field label="Email" icon="mail-outline" value={email} onChangeText={setEmail}
            placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none"
            hint={emailChanged ? "We'll send a confirmation link to the new address." : undefined} />
          <Field label="Phone number" icon="call-outline" value={phone} onChangeText={setPhone}
            placeholder="08012345678" keyboardType="phone-pad"
            hint="Your rider and our support team use this number to reach you about your deliveries, so it needs to be accurate." />

          {notice && (
            <View className={`flex-row items-start gap-2 rounded-2xl px-4 py-3 mt-2 ${
              notice.tone === "ok" ? "bg-green-500/10" : "bg-red-500/10"}`}>
              <MaterialIcons
                name={notice.tone === "ok" ? "check-circle" : "error-outline"}
                size={16}
                color={notice.tone === "ok" ? "#22c55e" : "#ef4444"}
              />
              <Text className={`flex-1 text-sm ${notice.tone === "ok" ? "text-green-400" : "text-red-400"}`}>
                {notice.text}
              </Text>
            </View>
          )}

          <TouchableOpacity
            onPress={save}
            disabled={!canSave}
            accessibilityRole="button"
            className="h-14 rounded-full justify-center items-center mt-8"
            style={{ backgroundColor: canSave ? ORANGE : "rgba(255,117,24,0.3)" }}
          >
            {saving ? <ActivityIndicator color="white" /> : (
              <Text className="text-white text-base font-bold">Save changes</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </MyKeyboardAvoidingWrapper>
    </SafeAreaView>
  );
}

function Field({ label, icon, hint, ...input }: {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>["name"];
  hint?: string;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View className="mb-5">
      <Text className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-2">{label}</Text>
      <View className="flex-row items-center gap-3 bg-[#1C1C21] rounded-2xl px-4 h-14">
        <Ionicons name={icon} size={18} color="#9CA3AF" />
        <TextInput {...input} placeholderTextColor="#6B7280" className="flex-1 text-white text-base" />
      </View>
      {hint && <Text className="text-gray-500 text-xs mt-2 leading-4">{hint}</Text>}
    </View>
  );
}
