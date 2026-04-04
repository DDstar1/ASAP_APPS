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
import { useSettingsStore } from "@/store/useUserSettingsStore";
import { UpdatePhoneModal } from "@/components/UpdatePhoneModal";
import { UpdatePasswordModal } from "@/components/UpdatePasswordModal";

export default function AccountScreen() {
  const router = useRouter();

  const { user, fetchUserSession, setUser } = useUserStore();
  const { settings, fetchSettings, updateSettings } = useSettingsStore();

  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);

  // Modals
  const [phoneModalVisible, setPhoneModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);

  // Sync profile image
  useEffect(() => {
    if (user?.profileImage) {
      setProfileImage(user.profileImage);
    }
    console.log("User session updated:", user);
  }, [user]);

  // Fetch settings on mount
  useEffect(() => {
    if (user?.id) {
      fetchSettings(user.id);
    }
  }, [user?.id]);

  // Pull to refresh
  const onRefresh = async () => {
    try {
      setRefreshing(true);
      await Promise.all([
        fetchUserSession(),
        user?.id ? fetchSettings(user.id) : Promise.resolve(),
      ]);
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

      setProfileImage(publicUrl);
      setUser({ ...user, profileImage: publicUrl });
    } catch (err) {
      console.error("Image upload failed:", err);
      alert("Failed to update profile image.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleToggle = (key: keyof typeof settings, value: boolean) => {
    if (!user?.id) return;
    updateSettings(user.id, { [key]: value });
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
        {/* HERO */}
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

          <View className="flex-row items-center mt-5 bg-[#ff923e] px-3 py-1 rounded-full">
            <Text className="text-black font-semibold text-sm">4.9 ★</Text>
          </View>

          <Text className="text-[#e0e5f9] text-2xl font-bold mt-3">
            {user?.username ?? "Marcus Vance"}{" "}
            <Text className="text-[#a5abbd] text-sm mt-1 tracking-widest">
              • LEVEL 4
            </Text>
          </Text>

          <Text className="text-[#a5abbd] text-sm mt-1">
            {user?.email ?? ""}
          </Text>
        </View>

        {/* ACCOUNT SETTINGS */}
        <Section title="ACCOUNT SETTINGS" icon="manage-accounts">
          <EditItem
            title="Phone Number"
            subtitle={user?.phone ?? "Not set"}
            icon="phone-android"
            onPress={() => setPhoneModalVisible(true)}
          />
          <View className="h-px bg-[#1e2a40] mx-1" />
          <EditItem
            title="Password"
            subtitle="Change password"
            icon="lock-outline"
            onPress={() => setPasswordModalVisible(true)}
          />
        </Section>

        {/* PREFERENCES */}
        <Section title="PREFERENCES" icon="tune">
          <ToggleItem
            title="Delivery Alerts"
            icon="notifications-active"
            value={settings?.delivery_alerts ?? true}
            onValueChange={(val) => handleToggle("delivery_alerts", val)}
          />
          <ToggleItem
            title="Promotions"
            icon="local-offer"
            value={settings?.promotions ?? false}
            onValueChange={(val) => handleToggle("promotions", val)}
          />
          <ToggleItem
            title="SMS Updates"
            icon="sms"
            value={settings?.sms_updates ?? true}
            onValueChange={(val) => handleToggle("sms_updates", val)}
          />
        </Section>

        {/* PAYMENTS */}
        <Section title="PAYMENT ECOSYSTEM" icon="account-balance-wallet">
          <PaymentCard title="Solana Wallet" value="12.45 SOL" />
          <PaymentCard title="Business Debit" value="•••• 8821" />
          <TouchableOpacity className="mt-4 py-4 rounded-2xl border border-[#ff923e]/30 items-center">
            <Text className="text-[#ff923e] font-semibold">
              + ADD NEW METHOD
            </Text>
          </TouchableOpacity>
        </Section>

        {/* SUPPORT */}
        <Section title="SUPPORT CENTER" icon="help-outline">
          <View className="flex-row gap-4">
            <SupportCard title="Browse FAQs" />
            <SupportCard title="Live Chat" />
          </View>
        </Section>

        {/* LOGOUT */}
        <TouchableOpacity
          onPress={onLogoutPress}
          disabled={loading}
          className="mx-4 mt-8 mb-6 py-5 rounded-full items-center justify-center flex-row gap-2"
          style={{ backgroundColor: "#ff923e" }}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <>
              <MaterialIcons name="logout" size={20} color="#000" />
              <Text className="text-black font-bold text-base">
                LOGOUT ACCOUNT
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      <UpdatePhoneModal
        visible={phoneModalVisible}
        onClose={() => setPhoneModalVisible(false)}
      />
      <UpdatePasswordModal
        visible={passwordModalVisible}
        onClose={() => setPasswordModalVisible(false)}
        onForgotPassword={() =>
          router.push("/auth/resetPassword/forgot-password")
        }
      />
    </SafeAreaView>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: string;
  children: React.ReactNode;
}) {
  return (
    <View className="mx-4 mt-8">
      <View className="flex-row items-center gap-2 mb-4">
        {icon && <MaterialIcons name={icon as any} size={14} color="#a5abbd" />}
        <Text className="text-[#a5abbd] text-xs tracking-widest">{title}</Text>
      </View>
      <View className="bg-[#121a2b] rounded-3xl p-4 space-y-3">{children}</View>
    </View>
  );
}

function EditItem({
  title,
  subtitle,
  icon,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row justify-between items-center py-3"
    >
      <View className="flex-row items-center gap-3">
        <View className="w-8 h-8 rounded-xl bg-[#0f1626] items-center justify-center">
          <MaterialIcons name={icon as any} size={16} color="#ff923e" />
        </View>
        <View>
          <Text className="text-[#e0e5f9] text-sm">{title}</Text>
          <Text className="text-[#a5abbd] text-xs mt-0.5">{subtitle}</Text>
        </View>
      </View>
      <MaterialIcons name="chevron-right" size={20} color="#a5abbd" />
    </TouchableOpacity>
  );
}

function ToggleItem({
  title,
  icon,
  value,
  onValueChange,
}: {
  title: string;
  icon: string;
  value: boolean;
  onValueChange: (val: boolean) => void;
}) {
  return (
    <View className="flex-row justify-between items-center py-3">
      <View className="flex-row items-center gap-3">
        <View className="w-8 h-8 rounded-xl bg-[#0f1626] items-center justify-center">
          <MaterialIcons name={icon as any} size={16} color="#ff923e" />
        </View>
        <Text className="text-[#e0e5f9]">{title}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#2a3245", true: "#ff923e" }}
        thumbColor={value ? "#fff" : "#a5abbd"}
      />
    </View>
  );
}

function PaymentCard({ title, value }: { title: string; value: string }) {
  return (
    <View className="bg-[#0f1626] p-4 rounded-2xl flex-row justify-between items-center">
      <Text className="text-[#e0e5f9]">{title}</Text>
      <Text className="text-[#ff923e] font-semibold">{value}</Text>
    </View>
  );
}

function SupportCard({ title }: { title: string }) {
  return (
    <View className="flex-1 bg-[#0f1626] p-4 rounded-2xl items-center">
      <Text className="text-[#e0e5f9] text-sm">{title}</Text>
    </View>
  );
}
