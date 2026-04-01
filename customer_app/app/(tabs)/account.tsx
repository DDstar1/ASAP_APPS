import { IMAGES } from "@/assets/assetsData";
import * as ImagePicker from "expo-image-picker";
import {
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Switch,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { handleLogout, updateProfileImage } from "@/lib/supabase-app-functions";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { useUserStore } from "@/store/useUserStore";

export default function AccountScreen() {
  const router = useRouter();

  const { user, fetchUserSession, setUser } = useUserStore();

  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // 🔄 Sync profile image from store
  useEffect(() => {
    if (user?.profileImage) {
      setProfileImage(user.profileImage);
    }
  }, [user]);

  // 🔄 Pull-to-refresh handler
  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await fetchUserSession();
    } catch (err) {
      console.error("Refresh failed:", err);
    } finally {
      setRefreshing(false);
    }
  };

  const onLogoutPress = async () => {
    try {
      setLoading(true);
      await handleLogout();
    } catch (err) {
      console.error("Logout failed:", err);
    } finally {
      setLoading(false);
    }
  };

  const onEditProfileImage = async () => {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permission.granted) {
        alert("Permission to access media library is required.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled) return;

      const asset = result.assets[0];
      setUploadingImage(true);

      const publicUrl = await updateProfileImage(
        user?.id ?? "",
        asset.uri,
        asset.mimeType,
      );

      // 🔥 update UI instantly
      setProfileImage(publicUrl);

      // 🔥 update global store
      setUser({
        ...user,
        profileImage: publicUrl,
      });
    } catch (err) {
      console.error("Image upload failed:", err);
      alert("Failed to update profile image.");
    } finally {
      setUploadingImage(false);
    }
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 pb-2 bg-[#080e1c]">
      <ScrollView
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ff923e"
            colors={["#ff923e"]}
          />
        }
      >
        {/* 🔥 HERO */}
        <View className="items-center mt-10">
          <View className="relative">
            <View className="rounded-2xl p-1 bg-[#ff923e]/20">
              <Image
                source={
                  profileImage ? { uri: profileImage } : IMAGES.profile_img
                }
                className="w-28 h-28 rounded-2xl"
              />
            </View>

            {/* Edit button */}
            <TouchableOpacity
              onPress={onEditProfileImage}
              disabled={uploadingImage}
              className="absolute -bottom-2 -right-2 bg-[#ff923e] rounded-full p-1.5"
            >
              {uploadingImage ? (
                <ActivityIndicator size={14} color="#000" />
              ) : (
                <MaterialIcons name="edit" size={14} color="#000" />
              )}
            </TouchableOpacity>
          </View>

          <Text className="text-[#e0e5f9] text-2xl font-bold mt-5">
            {user?.username ?? "User"}
          </Text>
        </View>

        {/* ⚙️ PREFERENCES */}
        <Section title="PREFERENCES">
          <ToggleItem title="Delivery Alerts" active />
          <ToggleItem title="Promotions" />
          <ToggleItem title="SMS Updates" active />
        </Section>

        {/* 💳 PAYMENTS */}
        <Section title="PAYMENT ECOSYSTEM">
          <PaymentCard title="Solana Wallet" value="12.45 SOL" />
          <PaymentCard title="Business Debit" value="•••• 8821" />

          <TouchableOpacity className="mt-4 py-4 rounded-2xl border border-[#ff923e]/30 items-center">
            <Text className="text-[#ff923e] font-semibold">
              + ADD NEW METHOD
            </Text>
          </TouchableOpacity>
        </Section>

        {/* 🧩 SUPPORT */}
        <Section title="SUPPORT CENTER">
          <View className="flex-row gap-4">
            <SupportCard title="Browse FAQs" />
            <SupportCard title="Live Chat" />
          </View>
        </Section>

        {/* 🚀 CTA */}
        <TouchableOpacity
          onPress={onLogoutPress}
          disabled={loading}
          className="mx-4 mt-8 mb-8 py-5 rounded-full items-center justify-center"
          style={{ backgroundColor: "#ff923e" }}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text className="text-black font-bold text-base">
              LOGOUT ACCOUNT
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// --- Sub-components ---

function Section({ title, children }) {
  return (
    <View className="mx-4 mt-8">
      <Text className="text-[#a5abbd] text-xs tracking-widest mb-4">
        {title}
      </Text>
      <View className="bg-[#121a2b] rounded-3xl p-4 space-y-3">{children}</View>
    </View>
  );
}

function ToggleItem({ title, active }) {
  const [isEnabled, setIsEnabled] = useState(active ?? false);

  return (
    <View className="flex-row justify-between items-center py-3">
      <Text className="text-[#e0e5f9]">{title}</Text>
      <Switch
        value={isEnabled}
        onValueChange={setIsEnabled}
        trackColor={{ false: "#2a3245", true: "#ff923e" }}
        thumbColor={isEnabled ? "#fff" : "#a5abbd"}
      />
    </View>
  );
}

function PaymentCard({ title, value }) {
  return (
    <View className="bg-[#0f1626] p-4 rounded-2xl flex-row justify-between items-center">
      <Text className="text-[#e0e5f9]">{title}</Text>
      <Text className="text-[#ff923e] font-semibold">{value}</Text>
    </View>
  );
}

function SupportCard({ title }) {
  return (
    <View className="flex-1 bg-[#0f1626] p-4 rounded-2xl items-center">
      <Text className="text-[#e0e5f9] text-sm">{title}</Text>
    </View>
  );
}
