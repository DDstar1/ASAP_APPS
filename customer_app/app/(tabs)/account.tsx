import { IMAGES } from "@/assets/assetsData";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { handleLogout } from "@/lib/supabase-app-functions";
import { useState } from "react";
import { UpdatePhoneModal } from "@/components/UpdatePhoneModal";
import { UpdatePasswordModal } from "@/components/UpdatePasswordModal";

export default function AccountScreen() {
  const [loading, setLoading] = useState(false);
  const [deliveryAlerts, setDeliveryAlerts] = useState(true);
  const [promotions, setPromotions] = useState(false);
  const [smsUpdates, setSmsUpdates] = useState(true);
  const [phoneModalVisible, setPhoneModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);

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

  return (
    <SafeAreaView edges={["top"]} className="flex-1 pb-2 bg-[#080e1c]">
      <ScrollView>
        {/* HERO */}
        <View className="items-center mt-10">
          <View className="rounded-2xl p-1 bg-[#ff923e]/20">
            <Image
              source={IMAGES.profile_img}
              className="w-28 h-28 rounded-2xl"
            />
          </View>
          <Text className="text-[#e0e5f9] text-2xl font-bold mt-3">
            Marcus Vance
          </Text>
          <Text className="text-[#a5abbd] text-sm mt-1">
            abhuluimendestiny@gmail.com
          </Text>
          <Text className="text-[#a5abbd] text-sm mt-1">08151725194</Text>
        </View>

        {/* ACCOUNT SETTINGS */}
        <Section title="ACCOUNT SETTINGS" icon="manage-accounts">
          <EditItem
            title="Phone Number"
            subtitle="08151725194"
            icon="phone-android"
            onPress={() => setPhoneModalVisible(true)}
          />
          <View className="h-px bg-[#1e2a40] mx-1" />
          <EditItem
            title="Password"
            subtitle="Last changed 30 days ago"
            icon="lock-outline"
            onPress={() => setPasswordModalVisible(true)}
          />
        </Section>

        {/* PREFERENCES */}
        <Section title="PREFERENCES" icon="tune">
          <ToggleItem
            title="Delivery Alerts"
            icon="notifications-active"
            value={deliveryAlerts}
            onValueChange={setDeliveryAlerts}
          />
          <ToggleItem
            title="Promotions"
            icon="local-offer"
            value={promotions}
            onValueChange={setPromotions}
          />
          <ToggleItem
            title="SMS Updates"
            icon="sms"
            value={smsUpdates}
            onValueChange={setSmsUpdates}
          />
        </Section>

        {/* PAYMENTS */}
        <Section title="PAYMENT ECOSYSTEM" icon="account-balance-wallet">
          <PaymentCard
            title="Solana Wallet"
            value="12.45 SOL"
            icon="currency-bitcoin"
          />
          <PaymentCard
            title="Business Debit"
            value="•••• 8821"
            icon="credit-card"
          />
          <TouchableOpacity className="mt-4 py-4 rounded-2xl border border-[#ff923e]/30 items-center flex-row justify-center gap-2">
            <MaterialIcons
              name="add-circle-outline"
              size={18}
              color="#ff923e"
            />
            <Text className="text-[#ff923e] font-semibold">ADD NEW METHOD</Text>
          </TouchableOpacity>
        </Section>

        {/* SUPPORT */}
        <Section title="SUPPORT CENTER" icon="support-agent">
          <View className="flex-row gap-4">
            <SupportCard title="Browse FAQs" icon="help-outline" />
            <SupportCard title="Live Chat" icon="chat-bubble-outline" />
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
      />
    </SafeAreaView>
  );
}

function EditItem({ title, subtitle, icon, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row justify-between items-center py-3"
    >
      <View className="flex-row items-center gap-3">
        <View className="w-8 h-8 rounded-xl bg-[#0f1626] items-center justify-center">
          <MaterialIcons name={icon} size={16} color="#ff923e" />
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

function Section({ title, icon, children }) {
  return (
    <View className="mx-4 mt-8">
      <View className="flex-row items-center gap-2 mb-4">
        <MaterialIcons name={icon} size={14} color="#a5abbd" />
        <Text className="text-[#a5abbd] text-xs tracking-widest">{title}</Text>
      </View>
      <View className="bg-[#121a2b] rounded-3xl p-4 space-y-3">{children}</View>
    </View>
  );
}

function ToggleItem({ title, icon, value, onValueChange }) {
  return (
    <View className="flex-row justify-between items-center py-3">
      <View className="flex-row items-center gap-3">
        <View className="w-8 h-8 rounded-xl bg-[#0f1626] items-center justify-center">
          <MaterialIcons name={icon} size={16} color="#ff923e" />
        </View>
        <Text className="text-[#e0e5f9]">{title}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: "#2a3245", true: "#ff923e" }}
        thumbColor={value ? "#fff" : "#a5abbd"}
        ios_backgroundColor="#2a3245"
      />
    </View>
  );
}

function PaymentCard({ title, value, icon }) {
  return (
    <View className="bg-[#0f1626] p-4 rounded-2xl flex-row justify-between items-center">
      <View className="flex-row items-center gap-3">
        <View className="w-8 h-8 rounded-xl bg-[#121a2b] items-center justify-center">
          <MaterialIcons name={icon} size={16} color="#ff923e" />
        </View>
        <Text className="text-[#e0e5f9]">{title}</Text>
      </View>
      <Text className="text-[#ff923e] font-semibold">{value}</Text>
    </View>
  );
}

function SupportCard({ title, icon }) {
  return (
    <TouchableOpacity className="flex-1 bg-[#0f1626] p-4 rounded-2xl items-center gap-2">
      <View className="w-10 h-10 rounded-xl bg-[#121a2b] items-center justify-center">
        <MaterialIcons name={icon} size={20} color="#ff923e" />
      </View>
      <Text className="text-[#e0e5f9] text-sm">{title}</Text>
    </TouchableOpacity>
  );
}
