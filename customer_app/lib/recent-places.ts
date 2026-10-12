// Places the customer picked in the location search, newest first. Kept on
// the device only; the landing screen and the search modal both show them.
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "recent_places_v1";
const MAX = 8;

export type RecentPlace = {
  name: string;
  address?: string | null;
  coordinates: { latitude: number; longitude: number };
};

export async function getRecentPlaces(): Promise<RecentPlace[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RecentPlace[]) : [];
  } catch {
    return [];
  }
}

export async function addRecentPlace(place: RecentPlace) {
  const { latitude, longitude } = place.coordinates ?? {};
  if (!place.name || !Number.isFinite(latitude) || !Number.isFinite(longitude))
    return;

  // "Current Location" changes every time, so it isn't worth keeping
  if (place.name === "Current Location") return;

  const samePlace = (p: RecentPlace) =>
    p.name === place.name &&
    Math.abs(p.coordinates.latitude - latitude) < 0.0005 &&
    Math.abs(p.coordinates.longitude - longitude) < 0.0005;

  const existing = await getRecentPlaces();
  const next = [place, ...existing.filter((p) => !samePlace(p))].slice(0, MAX);
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Recents are a convenience; losing one isn't worth surfacing
  }
}
