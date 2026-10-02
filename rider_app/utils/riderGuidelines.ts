import AsyncStorage from "@react-native-async-storage/async-storage";

// Bump the version when the guidelines change so every rider sees them again
const GUIDELINES_VERSION = "v1";
const keyFor = (userId: string) =>
  `rider_guidelines_${GUIDELINES_VERSION}:${userId}`;

export async function hasAcceptedGuidelines(userId: string): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(keyFor(userId))) !== null;
  } catch (err) {
    console.error("Failed to read guidelines acceptance:", err);
    // Don't lock the rider out of the app over a storage error
    return true;
  }
}

export async function acceptGuidelines(userId: string): Promise<void> {
  await AsyncStorage.setItem(keyFor(userId), new Date().toISOString());
}
