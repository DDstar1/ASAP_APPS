import { getOrderClientInfo } from "@/lib/supabase-functions";
import * as Location from "expo-location";
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

const openGoogleMaps = async (dropoffLat: number, dropoffLng: number) => {
  console.log("Opening Google Maps for directions...");
  console.log(`Dropoff Coordinates: ${dropoffLat}, ${dropoffLng}`);
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

    // 2️⃣ Get current location
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    const { latitude, longitude } = location.coords;

    // 3️⃣ Construct Google Maps URL
    const url = `https://www.google.com/maps/dir/?api=1&origin=${latitude},${longitude}&destination=${dropoffLat},${dropoffLng}&travelmode=driving`;

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
  getOrderClientInfo(orderId);
};

export { cleanAddress, openGoogleMaps, openOrderChat, timeAgo };
