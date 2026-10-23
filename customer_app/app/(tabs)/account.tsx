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
  Alert,
  Linking,
} from "react-native";
import { SUPPORT_EMAIL, SUPPORT_PHONE } from "@/constants/support";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  deleteOwnAccount,
  handleLogout,
  updateProfileImage,
} from "@/lib/supabase-app-functions";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { MaterialIcons } from "@expo/vector-icons";
import { useUserStore } from "@/store/useUserStore";
import { useSettingsStore } from "@/store/useUserSettingsStore";
import { UpdatePhoneModal } from "@/components/UpdatePhoneModal";
import { UpdatePasswordModal } from "@/components/UpdatePasswordModal";
import { openWebsite } from "@/utils/website";
import { SHOW_INVEST } from "@/constants/features";

const ORANGE = "#EE7F3A";

export default function AccountScreen() {
  const router = useRouter();

  const { user, fetchUserSession, setUser } = useUserStore();
  const { settings, fetchSettings, updateSettings } = useSettingsStore();

  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
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

  const onDeleteAccountPress = () => {
    Alert.alert(
      "Delete account?",
      "This permanently deletes your account, saved locations and delivery history. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeleting(true);
              await deleteOwnAccount();
            } catch (err: any) {
              console.error("Account deletion failed:", err);
              if (err?.message === "ACTIVE_DELIVERY") {
                Alert.alert(
                  "Delivery in progress",
                  "A rider is currently handling one of your deliveries. You can delete your account once it's delivered.",
                );
              } else {
                Alert.alert(
                  "Couldn't delete account",
                  "Please try again or contact support.",
                );
              }
            } finally {
              setDeleting(false);
            }
          },
        },
      ],
    );
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
      if (user) setUser({ ...user, profileImage: publicUrl });
    } catch (err) {
      console.error("Image upload failed:", err);
      alert("Failed to update profile image.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleToggle = (
    key: keyof NonNullable<typeof settings>,
    value: boolean,
  ) => {
    if (!user?.id) return;
    updateSettings(user.id, { [key]: value });
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-black">
      <ScrollView
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={ORANGE}
            colors={[ORANGE]}
          />
        }
      >
        {/* PROFILE */}
        <View className="items-center mt-8">
          <TouchableOpacity
            onPress={onEditProfileImage}
            disabled={uploadingImage}
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
          >
            <View className="w-28 h-28 rounded-full bg-white overflow-hidden justify-center items-center">
              <Image
                source={
                  profileImage ? { uri: profileImage } : IMAGES.helmet_avatar
                }
                className="w-28 h-28 rounded-full"
              />
            </View>
            <View className="absolute bottom-0 right-0 w-9 h-9 rounded-full bg-[#3C3C43] border-2 border-black justify-center items-center">
              {uploadingImage ? (
                <ActivityIndicator size="small" color="white" />
              ) : (
                <MaterialIcons name="photo-camera" size={16} color="white" />
              )}
            </View>
          </TouchableOpacity>

          <Text className="text-white text-2xl font-bold mt-4">
            {user?.username ?? "User"}
          </Text>
          {!!user?.email && (
            <Text className="text-gray-400 text-sm mt-1">{user.email}</Text>
          )}
        </View>

        {/* PERSONAL INFO / SECURITY / MESSAGES */}
        <Card>
          {/* Read-only until real SMS verification exists: UpdatePhoneModal only
              simulates the OTP, so it isn't opened (setPhoneModalVisible) */}
          <Row
            title="Personal info"
            subtitle={user?.phone ?? "No phone number added"}
            icon="person-outline"
          />
          <Text className="text-gray-400 text-xs -mt-2 pb-3 pl-14">
            Your rider and our support team use this number to reach you about
            your deliveries, so it needs to be accurate.
          </Text>
          <Divider />
          <Row
            title="Login & security"
            subtitle="Change password"
            icon="lock-outline"
            onPress={() => setPasswordModalVisible(true)}
          />
          <Divider />
          <Row
            title="Messages"
            subtitle="Chats with your riders"
            icon="chat-bubble-outline"
            onPress={() => router.push("/all_chats")}
          />
        </Card>

        {/* GROW WITH ASAP (website) */}
        <Card>
          <Row
            title="Become a vendor"
            subtitle="Sell and deliver with ASAP"
            icon="storefront"
            external
            onPress={() => openWebsite("/become-vendor")}
          />
          {SHOW_INVEST && (
            <>
              <Divider />
              <Row
                title="Invest"
                subtitle="Own a part of ASAP"
                icon="show-chart"
                external
                onPress={() => openWebsite("/invest")}
              />
            </>
          )}
        </Card>

        {/* SETTINGS */}
        <Text className="text-gray-400 text-xs font-semibold uppercase tracking-widest mx-6 mt-6">
          Settings
        </Text>
        <Card className="mt-2">
          <ToggleItem
            title="Delivery alerts"
            icon="notifications-none"
            value={settings?.delivery_alerts ?? true}
            onValueChange={(val) => handleToggle("delivery_alerts", val)}
          />
          <Divider />
          <ToggleItem
            title="Promotions"
            icon="local-offer"
            value={settings?.promotions ?? false}
            onValueChange={(val) => handleToggle("promotions", val)}
          />
          <Divider />
          <ToggleItem
            title="SMS updates"
            icon="sms"
            value={settings?.sms_updates ?? true}
            onValueChange={(val) => handleToggle("sms_updates", val)}
          />
        </Card>

        {/* HELP & LEGAL */}
        <Text className="text-gray-400 text-xs font-semibold uppercase tracking-widest mx-6 mt-6">
          Help &amp; legal
        </Text>
        <Card className="mt-2">
          <Row
            title="Contact support"
            subtitle={`${SUPPORT_EMAIL} · ${SUPPORT_PHONE}`}
            icon="support-agent"
            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => {})}
          />
          <Divider />
          <Row
            title="Privacy policy"
            subtitle="How we use your information"
            icon="privacy-tip"
            external
            onPress={() => openWebsite("/privacy/customer")}
          />
        </Card>

        {/* LOGOUT */}
        <TouchableOpacity
          onPress={onLogoutPress}
          disabled={loading}
          accessibilityRole="button"
          className="mx-4 mt-8 h-14 rounded-full items-center justify-center flex-row gap-2 bg-[#EE7F3A]"
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <>
              <MaterialIcons name="logout" size={20} color="white" />
              <Text className="text-white font-bold text-base">Log out</Text>
            </>
          )}
        </TouchableOpacity>

        {/* DELETE ACCOUNT */}
        <TouchableOpacity
          onPress={onDeleteAccountPress}
          disabled={deleting}
          accessibilityRole="button"
          className="mx-4 mt-3 h-12 rounded-full items-center justify-center flex-row gap-2"
        >
          {deleting ? (
            <ActivityIndicator color="#F87171" />
          ) : (
            <>
              <MaterialIcons name="delete-outline" size={20} color="#F87171" />
              <Text className="text-red-400 font-semibold text-base">
                Delete account
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

// ---------- COMPONENTS ----------

type IconName = React.ComponentProps<typeof MaterialIcons>["name"];

function Card({
  children,
  className = "mt-4",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <View className={`mx-4 bg-[#212126] rounded-3xl px-4 ${className}`}>
      {children}
    </View>
  );
}

const Divider = () => <View className="h-px bg-white/10 ml-14" />;

function Row({
  title,
  subtitle,
  icon,
  onPress,
  external,
}: {
  title: string;
  subtitle: string;
  icon: IconName;
  // Without it the row only displays its value
  onPress?: () => void;
  // Opens the website rather than a screen
  external?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={!onPress ? "text" : external ? "link" : "button"}
      accessibilityLabel={`${title}. ${subtitle}`}
      className="flex-row items-center gap-4 py-4"
    >
      <View className="w-10 h-10 rounded-full bg-[#3C3C43] items-center justify-center">
        <MaterialIcons name={icon} size={20} color="white" />
      </View>
      <View className="flex-1">
        <Text className="text-white text-base font-semibold">{title}</Text>
        <Text className="text-gray-400 text-xs mt-0.5" numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      {onPress && (
        <MaterialIcons
          name={external ? "open-in-new" : "chevron-right"}
          size={external ? 18 : 22}
          color="#9CA3AF"
        />
      )}
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
  icon: IconName;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View className="flex-row items-center gap-4 py-3">
      <View className="w-10 h-10 rounded-full bg-[#3C3C43] items-center justify-center">
        <MaterialIcons name={icon} size={20} color="white" />
      </View>
      <Text className="text-white text-base font-semibold flex-1">{title}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        accessibilityLabel={title}
        trackColor={{ false: "#3C3C43", true: ORANGE }}
        thumbColor="#fff"
      />
    </View>
  );
}
