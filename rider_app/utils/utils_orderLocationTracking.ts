// background/driverLocationTracking.ts
import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";

export const BACKGROUND_LOCATION_TASK = "background-location-task";
const LOCAL_WAYPOINTS_KEY = "local_waypoints";
const LAST_SYNC_TIME_KEY = "last_sync_time";
const ACTIVE_ORDER_KEY = "active_order_id";

// Save location locally
const saveToPhone = async (location: any) => {
  const { latitude, longitude } = location.coords;
  const timestamp = new Date().toISOString();

  const existing = await AsyncStorage.getItem(LOCAL_WAYPOINTS_KEY);
  const waypoints = existing ? JSON.parse(existing) : [];

  waypoints.push({ lat: latitude, lng: longitude, timestamp, synced: false });
  await AsyncStorage.setItem(LOCAL_WAYPOINTS_KEY, JSON.stringify(waypoints));

  console.log(`📱 Saved to phone: ${waypoints.length} waypoints`);
};

// Sync to Supabase
const syncToDatabase = async () => {
  const existing = await AsyncStorage.getItem(LOCAL_WAYPOINTS_KEY);
  if (!existing) return;

  const waypoints = JSON.parse(existing);
  const unsynced = waypoints.filter((w: any) => !w.synced);
  if (!unsynced.length) return;

  const orderId = await AsyncStorage.getItem(ACTIVE_ORDER_KEY);
  if (!orderId) return;

  const last = unsynced[unsynced.length - 1];
  const { error } = await supabase.rpc("append_waypoints", {
    order_id: Number(orderId),
    new_waypoints: unsynced,
    current_lat: last.lat,
    current_lng: last.lng,
  });

  if (!error) {
    await AsyncStorage.setItem(
      LOCAL_WAYPOINTS_KEY,
      JSON.stringify(waypoints.map((w: any) => ({ ...w, synced: true }))),
    );
    await AsyncStorage.setItem(LAST_SYNC_TIME_KEY, Date.now().toString());
    console.log(`☁️ Synced ${unsynced.length} waypoints to DB`);
  }
};

// Check 3-min sync
const checkAndSync = async () => {
  const lastSync = await AsyncStorage.getItem(LAST_SYNC_TIME_KEY);
  if (!lastSync || Date.now() - Number(lastSync) >= 180000) {
    await syncToDatabase();
  }
};

// Define background task globally
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error || !data) return;

  if (data) {
  }
  const { locations } = data as any;
  if (!locations?.length) return;

  const location = locations[0];

  console.log("📍 Location update (every ~5s):", {
    lat: location.coords.latitude,
    lng: location.coords.longitude,
    time: new Date(location.timestamp).toISOString(),
  });

  await saveToPhone(locations[0]);
  await checkAndSync();
});

// Start tracking (call this from your entry point)
export const startTracking = async (orderId: number) => {
  const { status: fg } = await Location.requestForegroundPermissionsAsync();
  console.log("Started tracking, foreground permission:", fg);
  if (fg !== "granted") return;

  await Location.requestBackgroundPermissionsAsync();

  await AsyncStorage.setItem(ACTIVE_ORDER_KEY, String(orderId));
  await AsyncStorage.setItem(LAST_SYNC_TIME_KEY, Date.now().toString());

  const registered = await TaskManager.isTaskRegisteredAsync(
    BACKGROUND_LOCATION_TASK,
  );
  if (registered)
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);

  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 5000,
    distanceInterval: 0,
    foregroundService: {
      notificationTitle: "Delivery in Progress",
      notificationBody: "Tracking your route",
      notificationColor: "#FF6C00",
    },
  });

  console.log("✅ Started tracking location");
};

// Stop tracking
export const stopTracking = async () => {
  const registered = await TaskManager.isTaskRegisteredAsync(
    BACKGROUND_LOCATION_TASK,
  );
  if (registered)
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);

  await syncToDatabase(); // final sync
  await AsyncStorage.multiRemove([
    ACTIVE_ORDER_KEY,
    LOCAL_WAYPOINTS_KEY,
    LAST_SYNC_TIME_KEY,
  ]);

  console.log("🛑 Stopped tracking");
};
