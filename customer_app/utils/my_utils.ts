import { getOrderRiderInfo } from "@/lib/supabase-app-functions";
import * as Location from "expo-location";
import { router } from "expo-router";
import { Alert, Linking } from "react-native";

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
function formatMessageTime(timestamp: string | Date): string {
  const messageDate = new Date(timestamp);
  const now = new Date();
  const diffInMs = now.getTime() - messageDate.getTime();
  const diffInHours = diffInMs / (1000 * 60 * 60);
  const diffInDays = diffInMs / (1000 * 60 * 60 * 24);

  // Today - show time (e.g., "2:45 PM")
  if (diffInHours < 24 && messageDate.getDate() === now.getDate()) {
    return messageDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  // Yesterday - show time (e.g., "8:20 PM")
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (messageDate.getDate() === yesterday.getDate()) {
    return messageDate.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  }

  // This week - show day name (e.g., "Mon", "Tue")
  if (diffInDays < 7) {
    return messageDate.toLocaleDateString("en-US", { weekday: "short" });
  }

  // Older - show date (e.g., "Jan 15")
  return messageDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
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

const openOrderTrackPage = async (orderId: number) => {
  console.log("Opening Google Maps for directions...");

  try {
    // 1️⃣ Request location permission
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission Denied",
        "Location permission is required to get directions.",
      );
      return;
    }

    // 4️⃣ Open Google Maps
    const supported = await Linking.canOpenURL(url);
    if (supported) {
      await Linking.openURL(url);
    } else {
      Alert.alert("Error", "Unable to open Google Maps");
    }
  } catch (err) {
    console.error("Error opening Google Maps:", err);
    Alert.alert("Error", "Failed to get directions. Try again.");
  }
};

const openOrderChat = async (orderId: number) => {
  try {
    const riderInfo = await getOrderRiderInfo(orderId);

    console.log("Rider Info for order", orderId, ":", riderInfo);

    if (!riderInfo) return;

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
  openOrderTrackPage,
  openOrderChat,
  timeAgo,
  formatMessageTime,
  generateOrderCode,
  generateConfirmationCodes,
};
