import { getOrderRiderInfo } from "@/lib/supabase-app-functions";
import { router } from "expo-router";
import { Alert } from "react-native";

function timeAgo(timestamp: string | Date) {
  const now = new Date();
  const posted = new Date(timestamp);
  const diff = Math.floor((now.getTime() - posted.getTime()) / 1000); // diff in seconds

  if (diff < 60) return `${diff}s ago`; // seconds
  if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`; // minutes
  if (diff < 86400) {
    const hours = Math.floor(diff / 3600);
    const mins = Math.floor((diff % 3600) / 60);
    return mins > 0 ? `${hours} hr ${mins} mins ago` : `${hours} hr ago`;
  }
  const days = Math.floor(diff / 86400);
  return days > 1 ? `${days} days ago` : `1 day ago`;
}

function cleanAddress(address: string) {
  if (!address) return "";

  // Step 1: remove plus code at the start (e.g., P5V4+JCM, )
  let cleaned = address.replace(/^[A-Z0-9+]+,\s*/, "");

  // Step 2: remove postal code (any 5-6 digit number)
  cleaned = cleaned.replace(/\b\d{5,6}\b,?\s*/g, "");

  // Step 3: remove country (Nigeria)
  cleaned = cleaned.replace(/,?\s*Nigeria$/i, "");

  // Step 4: trim spaces and extra commas
  cleaned = cleaned.replace(/\s*,\s*/g, ", ").trim();
  return cleaned;
}

const openOrderChat = async (orderId: number) => {
  try {
    const riderInfo = await getOrderRiderInfo(orderId);

    console.log("Rider Info for order", orderId, ":", riderInfo);

    if (!riderInfo?.id) {
      Alert.alert("Chat unavailable", "Couldn't reach your rider. Please try again.");
      return;
    }

    router.push({
      pathname: "/chat_details/[order_id]",
      params: {
        order_id: orderId, // must match the route param
        name: riderInfo.name,
        id: riderInfo.id,
      },
    });
  } catch (error) {
    console.error("Failed to open order chat:", error);
  }
};

const generateOrderCode = () => {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const randomSegment = (length: number) =>
    Array.from(
      { length },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join("");

  return `ASAP-${randomSegment(4)}-${randomSegment(4)}`;
};

const generateConfirmationCodes = (type: "pickup" | "delivery") => {
  const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const prefix = type === "pickup" ? "PC" : "DC";

  const segment = (length: number) =>
    Array.from(
      { length },
      () => chars[Math.floor(Math.random() * chars.length)],
    ).join("");

  return `${prefix}-${segment(4)}-${segment(4)}`;
};

export {
  cleanAddress,
  openOrderChat,
  timeAgo,
  generateOrderCode,
  generateConfirmationCodes,
};
