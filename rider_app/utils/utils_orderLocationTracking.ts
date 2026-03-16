// background/driverLocationTracking.ts

import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";

export const BACKGROUND_LOCATION_TASK = "background-location-task";

const LOCAL_WAYPOINTS_KEY = "local_waypoints";
const LAST_SYNC_TIME_KEY = "last_sync_time";
const ACTIVE_ORDER_KEY = "active_order_id";

export const TASK_DEBUG_KEY = "task_debug";
export const TASK_ERROR_KEY = "task_error";
export const TASK_LAST_LOCATION_KEY = "task_last_location";

// Save location locally
const saveToPhone = async (location: Location.LocationObject) => {
  try {
    const { latitude, longitude } = location.coords;
    const timestamp = new Date().toISOString();

    const existing = await AsyncStorage.getItem(LOCAL_WAYPOINTS_KEY);
    const waypoints = existing ? JSON.parse(existing) : [];

    waypoints.push({
      lat: latitude,
      lng: longitude,
      timestamp,
      synced: false,
    });

    await AsyncStorage.setItem(LOCAL_WAYPOINTS_KEY, JSON.stringify(waypoints));

    await AsyncStorage.setItem(
      TASK_LAST_LOCATION_KEY,
      JSON.stringify({ lat: latitude, lng: longitude, timestamp }),
    );

    await AsyncStorage.setItem(
      TASK_DEBUG_KEY,
      JSON.stringify({
        message: "Location stored locally",
        waypointCount: waypoints.length,
        lastTimestamp: timestamp,
      }),
    );
  } catch (err: any) {
    await AsyncStorage.setItem(
      TASK_ERROR_KEY,
      JSON.stringify({
        message: err?.message ?? String(err),
        time: new Date().toISOString(),
      }),
    );
  }
};

// Sync unsynced points to Supabase
const syncToDatabase = async () => {
  try {
    // Get local waypoints
    const stored = await AsyncStorage.getItem(LOCAL_WAYPOINTS_KEY);
    if (!stored) return;

    const waypoints: Array<any> = JSON.parse(stored);
    const unsynced = waypoints.filter((w) => !w.synced);

    if (unsynced.length === 0) return;

    // Get active order ID
    const orderIdStr = await AsyncStorage.getItem(ACTIVE_ORDER_KEY);
    if (!orderIdStr) {
      console.log("⚠️ No active order found");
      return;
    }
    const orderId = Number(orderIdStr);

    const last = unsynced[unsynced.length - 1];

    console.log(`📦 Syncing ${unsynced.length} waypoints for order ${orderId}`);

    // Call RPC
    const { data, error } = await supabase.rpc("append_waypoints", {
      p_order_id: Number(orderId),
      p_new_waypoints: unsynced, // array of {lat,lng,timestamp}
      p_current_lat: last.lat,
      p_current_lng: last.lng,
    });

    if (error) {
      console.log("❌ Sync failed:", error.message);
      await AsyncStorage.setItem(
        TASK_ERROR_KEY,
        JSON.stringify({
          message: error.message,
          time: new Date().toISOString(),
        }),
      );
      return;
    }

    // Mark synced points
    const updated = waypoints.map((w) =>
      unsynced.includes(w) ? { ...w, synced: true } : w,
    );

    // Keep only unsynced points to prevent storage growth
    const remaining = updated.filter((w) => !w.synced);

    await AsyncStorage.setItem(LOCAL_WAYPOINTS_KEY, JSON.stringify(remaining));
    await AsyncStorage.setItem(LAST_SYNC_TIME_KEY, Date.now().toString());

    console.log(`☁️ Successfully synced ${unsynced.length} points`);
  } catch (err: any) {
    console.log("❌ Sync crash:", err);
    await AsyncStorage.setItem(
      TASK_ERROR_KEY,
      JSON.stringify({
        message: err?.message ?? String(err),
        time: new Date().toISOString(),
      }),
    );
  }
};
// Check if sync interval passed
const checkAndSync = async () => {
  const lastSync = await AsyncStorage.getItem(LAST_SYNC_TIME_KEY);

  // 30 seconds sync interval
  if (!lastSync || Date.now() - Number(lastSync) >= 30000) {
    await syncToDatabase();
  }
};

// Background location task
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    await AsyncStorage.setItem(
      TASK_ERROR_KEY,
      JSON.stringify({
        message: error.message,
        time: new Date().toISOString(),
      }),
    );
    return;
  }

  if (!data) return;

  const { locations } = data as any;

  if (!locations?.length) return;

  const location = locations[0];

  console.log("📍 Background location:", {
    lat: location.coords.latitude,
    lng: location.coords.longitude,
  });

  await saveToPhone(location);

  await checkAndSync();
});

// Start tracking
export const startTracking = async (orderId: number) => {
  const { status: fg } = await Location.requestForegroundPermissionsAsync();

  if (fg !== "granted") {
    console.log("❌ Foreground permission denied");
    return;
  }

  const { status: bg } = await Location.requestBackgroundPermissionsAsync();

  if (bg !== "granted") {
    console.log("⚠️ Background permission denied");
  }

  await AsyncStorage.setItem(ACTIVE_ORDER_KEY, String(orderId));

  await AsyncStorage.setItem(LAST_SYNC_TIME_KEY, Date.now().toString());

  const registered = await TaskManager.isTaskRegisteredAsync(
    BACKGROUND_LOCATION_TASK,
  );

  if (registered) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }

  await Location.startLocationUpdatesAsync(BACKGROUND_LOCATION_TASK, {
    accuracy: Location.Accuracy.BestForNavigation,

    timeInterval: 3000,

    distanceInterval: 0,

    foregroundService: {
      notificationTitle: "Delivery in Progress",
      notificationBody: "Tracking route",
      notificationColor: "#FF6C00",
    },
  });

  console.log("✅ Tracking started");
};

// Stop tracking
export const stopTracking = async () => {
  const registered = await TaskManager.isTaskRegisteredAsync(
    BACKGROUND_LOCATION_TASK,
  );

  if (registered) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }

  // Final sync
  await syncToDatabase();

  await AsyncStorage.multiRemove([
    ACTIVE_ORDER_KEY,
    LOCAL_WAYPOINTS_KEY,
    LAST_SYNC_TIME_KEY,
  ]);

  console.log("🛑 Tracking stopped");
};
