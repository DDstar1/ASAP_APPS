import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useUserStore } from "@/store/useUserStore";
import { acceptGuidelines } from "@/utils/riderGuidelines";

type IconName = React.ComponentProps<typeof MaterialIcons>["name"];

const GUIDELINES: { title: string; icon: IconName; points: string[] }[] = [
  {
    title: "Stay online and reachable",
    icon: "wifi-tethering",
    points: [
      "Keep location on while you're working. Your live location is shared with the sender during a delivery.",
      "Ride offers expire quickly. Respond to them as soon as they arrive.",
      "Keep your phone number up to date so senders and support can reach you.",
    ],
  },
  {
    title: "Accepting a ride",
    icon: "assignment-turned-in",
    points: [
      "Check the pickup, drop-off and fare before you accept.",
      "Only accept rides you can complete. Once you accept, head straight to pickup.",
    ],
  },
  {
    title: "At pickup",
    icon: "inventory-2",
    points: [
      "Your pickup code is shown on your active delivery. Give it to the sender only when you have the package in hand.",
      "The sender enters the code in their app. Your delivery updates automatically once they confirm.",
      "Check that the package matches the description. Don't accept items that are unsafe or illegal.",
    ],
  },
  {
    title: "At drop-off",
    icon: "where-to-vote",
    points: [
      "CONFIRM DROP-OFF unlocks once you're within 100m of the drop-off point.",
      "Ask the recipient for the 6-digit drop-off code and enter it to complete the delivery.",
      "Never leave a package without the drop-off code.",
    ],
  },
  {
    title: "Cancellations and returns",
    icon: "assignment-return",
    points: [
      "If a sender cancels after pickup, return the package to the pickup point.",
      "At the pickup point, open the cancelled order in Deliveries, tap AT RETURN POINT and enter the sender's return code to complete the return.",
      "Don't keep, open or hand over a package to anyone else.",
    ],
  },
  {
    title: "Earnings and payouts",
    icon: "account-balance",
    points: [
      "Earnings are paid to the bank account in Profile → Bank Details.",
      "Make sure your account details are correct to avoid failed payouts.",
    ],
  },
  {
    title: "Safety and conduct",
    icon: "health-and-safety",
    points: [
      "Follow traffic laws and wear your safety gear.",
      "Be respectful to senders and recipients. Use the in-app chat for delivery questions.",
      "If something goes wrong, contact support before taking action.",
    ],
  },
];

export default function GuidelinesScreen() {
  const router = useRouter();
  const { review } = useLocalSearchParams<{ review?: string }>();
  const isReview = review === "1";
  const { user } = useUserStore();

  const [agreed, setAgreed] = useState(false);
  const [saving, setSaving] = useState(false);

  const onContinue = async () => {
    if (isReview) {
      router.back();
      return;
    }
    if (!agreed || !user?.id) return;
    try {
      setSaving(true);
      await acceptGuidelines(user.id);
      router.replace("/(tabs)/home");
    } catch (err) {
      console.error("Failed to save guidelines acceptance:", err);
      Alert.alert("Something went wrong", "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const canContinue = isReview || agreed;

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-[#080e1c]">
      <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
        {/* HEADER */}
        <View className="mx-4 mt-8">
          <View className="w-12 h-12 rounded-2xl bg-[#ff923e]/15 items-center justify-center">
            <MaterialIcons name="menu-book" size={24} color="#ff923e" />
          </View>
          <Text className="text-[#e0e5f9] text-2xl font-bold mt-4">
            Rider Guidelines
          </Text>
          <Text className="text-[#a5abbd] text-sm mt-1">
            {isReview
              ? "How deliveries work on ASAP."
              : "Read these before your first delivery."}
          </Text>
        </View>

        {/* SECTIONS */}
        {GUIDELINES.map((section, i) => (
          <View key={section.title} className="mx-4 mt-6">
            <View className="flex-row items-center gap-2 mb-3">
              <Text className="text-[#ff923e] text-xs font-bold">
                {String(i + 1).padStart(2, "0")}
              </Text>
              <Text className="text-[#a5abbd] text-xs tracking-widest">
                {section.title.toUpperCase()}
              </Text>
            </View>
            <View className="bg-[#121a2b] rounded-3xl p-4 flex-row gap-3">
              <View className="w-8 h-8 rounded-xl bg-[#0f1626] items-center justify-center">
                <MaterialIcons name={section.icon} size={16} color="#ff923e" />
              </View>
              <View className="flex-1 gap-2">
                {section.points.map((point) => (
                  <View key={point} className="flex-row gap-2">
                    <Text className="text-[#ff923e] text-sm">•</Text>
                    <Text className="text-[#e0e5f9] text-sm flex-1 leading-5">
                      {point}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* FOOTER */}
      <View className="px-4 pt-3 pb-2 border-t border-[#1e2a40] bg-[#080e1c]">
        {!isReview && (
          <TouchableOpacity
            onPress={() => setAgreed((v) => !v)}
            className="flex-row items-center gap-3 mb-3"
            activeOpacity={0.7}
          >
            <MaterialIcons
              name={agreed ? "check-box" : "check-box-outline-blank"}
              size={22}
              color={agreed ? "#ff923e" : "#a5abbd"}
            />
            <Text className="text-[#e0e5f9] text-sm flex-1">
              I have read and agree to follow these guidelines
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={onContinue}
          disabled={!canContinue || saving}
          className="py-5 rounded-full items-center justify-center flex-row gap-2"
          style={{
            backgroundColor: canContinue ? "#ff923e" : "rgba(255,146,62,0.2)",
          }}
        >
          {saving ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text
              className="font-bold text-base"
              style={{ color: canContinue ? "#000" : "#555" }}
            >
              {isReview ? "DONE" : "START RIDING"}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
