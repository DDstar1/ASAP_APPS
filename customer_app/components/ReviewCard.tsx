import { MaterialIcons } from "@expo/vector-icons";
import { Text, View } from "react-native";

export type PackageReview = {
  id: number;
  order_id: number;
  reason: string;
  status: "pending" | "upheld" | "rejected";
  refund_amount: number | null;
  refund_status: "pending" | "sent" | "failed" | "none" | null;
  created_at: string;
};

const REASON_LABEL: Record<string, string> = {
  dimensions_exceeded: "Package too big",
  weight_exceeded: "Package too heavy",
  prohibited_contents: "Prohibited item",
  package_not_found: "No package at pickup",
  wrong_location: "Wrong pickup location",
};

const YELLOW = "#FACC15";
const GREEN = "#22C55E";
const RED = "#EF4444";

// pending: under review · rejected: customer refunded in full · upheld: rider was right
function stateOf(r: PackageReview) {
  if (r.status === "pending") return { color: YELLOW, label: "Under review" };
  if (r.refund_status === "failed") return { color: RED, label: "Refund failed" };
  if (r.status === "rejected") return { color: GREEN, label: "Full refund" };
  return { color: RED, label: "Rider upheld" };
}

const naira = (kobo: number) => `₦${(kobo / 100).toLocaleString("en-NG")}`;

export default function ReviewCard({ review, orderCode }: { review: PackageReview; orderCode: string }) {
  const { color, label } = stateOf(review);
  const refund =
    review.status === "pending"
      ? "Refund after review"
      : review.refund_status === "none"
        ? "Refund by the store"
        : review.refund_amount
          ? `${naira(review.refund_amount)} refund${review.refund_status === "sent" ? "ed" : ""}`
          : "No refund";

  return (
    <View
      className="rounded-3xl px-5 py-4 my-2 bg-[#3C3C43]"
      accessibilityLabel={`Order ${orderCode} review: ${label}`}
    >
      <View className="flex-row items-center">
        <View className="flex-1">
          <Text className="text-white text-lg font-extrabold tracking-wide" numberOfLines={1}>
            {orderCode}
          </Text>
          <Text className="text-gray-300 text-sm font-semibold mt-1" numberOfLines={1}>
            {REASON_LABEL[review.reason] ?? "Package issue"}
          </Text>
        </View>

        <View className="items-center px-2">
          <View className="flex-row">
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ marginHorizontal: -5 }}>
                <MaterialIcons name="keyboard-arrow-right" size={22} color={color} />
              </View>
            ))}
          </View>
          <Text style={{ color }} className="text-[11px] font-bold mt-0.5">
            {label}
          </Text>
        </View>

        <View className="flex-1 items-end">
          <Text className="text-gray-400 text-xs">
            {new Date(review.created_at).toLocaleDateString("en-GB")}
          </Text>
          <Text className="text-white text-sm font-semibold mt-1 text-right" numberOfLines={1}>
            {refund}
          </Text>
        </View>
      </View>
    </View>
  );
}
