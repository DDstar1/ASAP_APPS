import { useEffect, useState } from "react";
import { Linking, Text, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "@/lib/supabase";
import { SUPPORT_EMAIL, SUPPORT_PHONE } from "@/constants/support";

type Dispute = {
  reason: string;
  status: "pending" | "upheld" | "rejected";
  refund_amount: number | null;
  refund_status: "pending" | "sent" | "failed" | "none" | null;
};

const REASON_TEXT: Record<string, string> = {
  dimensions_exceeded: "the package was bigger than the order said",
  weight_exceeded: "the package was heavier than the order said",
  prohibited_contents: "the package contained items ASAP can't carry",
  package_not_found: "there was no package at the pickup",
  wrong_location: "the pickup location was wrong",
};

const naira = (kobo: number) => `₦${(kobo / 100).toLocaleString("en-NG")}`;

function nextStep(d: Dispute) {
  if (d.status === "pending")
    return "ASAP is reviewing the rider's report. We'll update you on your refund once the review is done.";
  if (d.refund_status === "none") return "The review is done. Your refund is handled by the store you ordered from.";
  const amount = d.refund_amount ? naira(d.refund_amount) : "Your refund";
  const verdict =
    d.status === "upheld"
      ? "The review found the package didn't match the order, so the rider was paid for the trip."
      : "The review found in your favour.";
  if (d.refund_status === "sent") return `${verdict} ${amount} has been refunded to your payment method.`;
  if (d.refund_status === "failed") return `${verdict} Your refund of ${amount} didn't go through. Please contact support.`;
  return `${verdict} ${amount} is being refunded to your payment method.`;
}

export default function CancellationNotice({ orderId }: { orderId: number }) {
  const [dispute, setDispute] = useState<Dispute | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from("back_package_disputes")
      .select("reason, status, refund_amount, refund_status")
      .eq("order_id", orderId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setDispute((data as Dispute | null) ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  return (
    <View className="mt-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/30">
      <Text className="text-white font-bold text-base">
        {dispute ? "Cancelled at pickup" : "Delivery cancelled"}
      </Text>
      <Text className="text-gray-300 text-sm leading-relaxed mt-1">
        {dispute
          ? `Your rider couldn't take the package: ${REASON_TEXT[dispute.reason] ?? "there was a problem with it"}. ${nextStep(dispute)}`
          : "This delivery was cancelled. If you weren't expecting this, contact support."}
      </Text>

      <View className="flex-row gap-3 mt-4">
        <TouchableOpacity
          onPress={() => Linking.openURL(`tel:${SUPPORT_PHONE}`).catch(() => {})}
          accessibilityRole="button"
          className="flex-1 h-11 rounded-full bg-[#FF7518] flex-row items-center justify-center gap-2"
        >
          <Ionicons name="call" size={16} color="white" />
          <Text className="text-white font-bold text-sm">Call support</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() =>
            Linking.openURL(
              `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Cancelled order #${orderId}`)}`,
            ).catch(() => {})
          }
          accessibilityRole="button"
          className="flex-1 h-11 rounded-full border border-[#FF7518] flex-row items-center justify-center gap-2"
        >
          <Ionicons name="mail" size={16} color="#FF7518" />
          <Text className="text-[#FF7518] font-bold text-sm">Email support</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
