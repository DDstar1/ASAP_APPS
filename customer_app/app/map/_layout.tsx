import { Stack } from "expo-router";

// Booking flow: locations (index) → item type → specifications → photo →
// back to index to book
export default function MapLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
