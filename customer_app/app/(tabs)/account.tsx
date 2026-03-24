import { IMAGES } from "@/assets/assetsData";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { handleLogout } from "@/lib/supabase-app-functions";
import { useRouter } from "expo-router";
import { useState } from "react";

export default function AccountScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

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
        {/* 🔥 HERO */}
        <View className="items-center mt-10">
          <View className="rounded-2xl p-1 bg-[#ff923e]/20">
            <Image
              source={IMAGES.profile_img}
              className="w-28 h-28 rounded-2xl"
            />
          </View>

          <View className="flex-row items-center mt-3 bg-[#ff923e] px-3 py-1 rounded-full">
            <Text className="text-black font-semibold text-sm">4.9 ★</Text>
          </View>

          <Text className="text-[#e0e5f9] text-2xl font-bold mt-3">
            Marcus Vance
          </Text>

          <Text className="text-[#a5abbd] text-sm mt-1 tracking-widest">
            ELITE COURIER • LEVEL 4
          </Text>
        </View>

        {/* 📊 STATS CARD */}
        <View className="mx-4 mt-8 p-5 rounded-3xl bg-[#121a2b]">
          <Text className="text-[#a5abbd] text-xs tracking-widest mb-2">
            WEEKLY PERFORMANCE
          </Text>

          <Text className="text-[#e0e5f9] text-xl font-bold mb-4">
            Driver Stats
          </Text>

          <View className="flex-row justify-between">
            <Stat label="Orders" value="142" />
            <Stat label="Earned" value="$2.4k" highlight />
            <Stat label="Online" value="38h" />
          </View>
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
          className="mx-4 mt-8 py-5 rounded-full items-center justify-center"
          style={{
            backgroundColor: "#ff923e",
          }}
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

function Stat({ label, value, highlight }) {
  return (
    <View
      className={`flex-1 p-3 rounded-2xl ${
        highlight ? "bg-[#ff923e]" : "bg-[#0f1626]"
      }`}
    >
      <Text
        className={`text-xs ${highlight ? "text-black" : "text-[#a5abbd]"}`}
      >
        {label}
      </Text>
      <Text
        className={`text-lg font-bold ${
          highlight ? "text-black" : "text-[#e0e5f9]"
        }`}
      >
        {value}
      </Text>
    </View>
  );
}

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
  return (
    <View className="flex-row justify-between items-center py-3">
      <Text className="text-[#e0e5f9]">{title}</Text>

      <View
        className={`w-12 h-6 rounded-full ${
          active ? "bg-[#ff923e]" : "bg-[#2a3245]"
        }`}
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
