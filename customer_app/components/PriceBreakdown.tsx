import React from "react";
import { Text, View } from "react-native";

const naira = (n: number) => `₦${n.toLocaleString()}`;

// Delivery fare + package insurance = total. Insurance is null when it wasn't
// recorded (orders from before insurance), so only the total is shown then.
export default function PriceBreakdown({
  total,
  insurance,
  saved,
}: {
  total: number;
  insurance: number | null;
  // Discount already taken off the total, in naira
  saved?: number;
}) {
  const discount = saved && saved > 0 ? saved : 0;
  return (
    <View className="gap-2.5">
      {insurance != null && (
        // Fare before the discount, so fare − discount + insurance = total
        <Row label="Delivery fare" value={naira(total - insurance + discount)} />
      )}
      {discount > 0 && (
        <Row label="Discount" value={`−${naira(discount)}`} tone="text-[#4ADE80]" />
      )}
      {insurance != null && (
        <Row label="Package insurance" value={insurance > 0 ? naira(insurance) : "Free"} />
      )}
      <View className="h-px bg-white/10 my-1" />
      <View className="flex-row justify-between items-baseline">
        <Text className="text-white text-base font-semibold">Total</Text>
        <Text className="text-white text-xl font-bold">{naira(total)}</Text>
      </View>
    </View>
  );
}

function Row({ label, value, tone = "text-white" }: { label: string; value: string; tone?: string }) {
  return (
    <View className="flex-row justify-between">
      <Text className="text-gray-400 text-base">{label}</Text>
      <Text className={`text-base ${tone}`}>{value}</Text>
    </View>
  );
}
