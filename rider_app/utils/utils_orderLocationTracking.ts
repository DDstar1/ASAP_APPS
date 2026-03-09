// background/driverLocationTracking.ts
import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "@/lib/supabase";
import { useAcceptedDeliveryStore } from "@/store/useAcceptedDeliveriesStore";

export const BACKGROUND_LOCATION_TASK = "background-location-task";
const LOCAL_WAYPOINTS_KEY = "local_waypoints";
const LAST_SYNC_TIME_KEY = "last_sync_time";
const ACTIVE_ORDER_KEY = "active_order_id";
export const TASK_DEBUG_KEY = "task_debug";
export const TASK_ERROR_KEY = "task_error";
export const TASK_LAST_LOCATION_KEY = "task_last_location";

// Save location locally
const saveToPhone = async (location: any) => {
  const { latitude, longitude } = location.coords;
  const timestamp = new Date().toISOString();

  const existing = await AsyncStorage.getItem(LOCAL_WAYPOINTS_KEY);
  const waypoints = existing ? JSON.parse(existing) : [];

  waypoints.push({ lat: latitude, lng: longitude, timestamp, synced: false });
  await AsyncStorage.setItem(LOCAL_WAYPOINTS_KEY, JSON.stringify(waypoints));

  // Store last location for debug page
  await AsyncStorage.setItem(
    TASK_LAST_LOCATION_KEY,
    JSON.stringify({ lat: latitude, lng: longitude, timestamp }),
  );

  await AsyncStorage.setItem(
    TASK_DEBUG_KEY,
    JSON.stringify({
      message: `Fired with location`,
      waypointCount: waypoints.length,
      lastTimestamp: timestamp,
    }),
  );
};

// Sync to Supabase
const syncToDatabase = async () => {
  console.log("🔄 Attempting to sync waypoints to database...");

  try {
    const existing = await AsyncStorage.getItem(LOCAL_WAYPOINTS_KEY);
    if (!existing) {
      console.log("⚠️ No local waypoints found");
      return;
    }

    const waypoints = JSON.parse(existing);
    const unsynced = waypoints.filter((w: any) => !w.synced);

    console.log(`📍 Total local waypoints: ${waypoints.length}`);
    console.log(`📤 Unsynced waypoints: ${unsynced.length}`);

    if (!unsynced.length) return;

    const orderId = useAcceptedDeliveryStore
      .getState()
      .AcceptedDeliveries.find((item) =>
        ["pending", "arriving_pickup", "in_transit"].includes(item.status),
      )?.id;

    if (!orderId) {
      console.log("⚠️ No active order ID found");
      return;
    }

    const last = unsynced[unsynced.length - 1];

    console.log("📦 Sending payload to Supabase:", {
      order_id: Number(orderId),
      waypoints_count: unsynced.length,
      last_lat: last.lat,
      last_lng: last.lng,
    });

    const { data, error } = await supabase.rpc("append_waypoints", {
      order_id: Number(orderId),
      new_waypoints: unsynced,
      current_lat: last.lat,
      current_lng: last.lng,
    });

    console.log("📡 Supabase RPC response:", data);
    console.log("⚠️ Supabase RPC error:", error);

    if (error) {
      await AsyncStorage.setItem(
        TASK_ERROR_KEY,
        JSON.stringify({
          message: error.message,
          time: new Date().toISOString(),
        }),
      );

      console.log("❌ Waypoint sync failed:", error.message);
      return;
    }

    const updated = waypoints.map((w: any) =>
      !w.synced ? { ...w, synced: true } : w,
    );

    await AsyncStorage.setItem(LOCAL_WAYPOINTS_KEY, JSON.stringify(updated));
    await AsyncStorage.setItem(LAST_SYNC_TIME_KEY, Date.now().toString());

    console.log(`☁️ Synced ${unsynced.length} waypoints to DB successfully`);
    console.log("🧾 Database confirmation:", data);
  } catch (err: any) {
    await AsyncStorage.setItem(
      TASK_ERROR_KEY,
      JSON.stringify({
        message: err?.message ?? String(err),
        time: new Date().toISOString(),
      }),
    );

    console.log("❌ Sync crash:", err);
  }
};

// Check 3-min sync
const checkAndSync = async () => {
  const lastSync = await AsyncStorage.getItem(LAST_SYNC_TIME_KEY);
  if (!lastSync || Date.now() - Number(lastSync) >= 60000) {
    await syncToDatabase();
  }
};

// Define background task globally (must be at module level, outside any component)
TaskManager.defineTask(BACKGROUND_LOCATION_TASK, async ({ data, error }) => {
  if (error) {
    await AsyncStorage.setItem(
      TASK_ERROR_KEY,
      JSON.stringify({
        message: error.message,
        time: new Date().toISOString(),
      }),
    );
    console.log("❌ Background task error:", error.message);
    return;
  }

  if (!data) {
    await AsyncStorage.setItem(
      TASK_DEBUG_KEY,
      JSON.stringify({
        message: "Task fired but no data received",
        time: new Date().toISOString(),
      }),
    );
    return;
  }

  const { locations } = data as any;

  if (!locations?.length) {
    await AsyncStorage.setItem(
      TASK_DEBUG_KEY,
      JSON.stringify({
        message: "Task fired but locations array is empty",
        time: new Date().toISOString(),
      }),
    );
    return;
  }

  const location = locations[0];

  console.log("📍 Background location update:", {
    lat: location.coords.latitude,
    lng: location.coords.longitude,
    time: new Date(location.timestamp).toISOString(),
  });

  await saveToPhone(location);
  await checkAndSync();
});

// Start tracking
export const startTracking = async (orderId: number) => {
  console.log(`🚀 Starting location tracking for order ${orderId}...`);

  const { status: fg } = await Location.requestForegroundPermissionsAsync();
  console.log("Foreground permission:", fg);
  if (fg !== "granted") {
    console.log("❌ Foreground location permission denied");
    return;
  }

  const { status: bg } = await Location.requestBackgroundPermissionsAsync();
  console.log("Background permission:", bg);
  if (bg !== "granted") {
    console.log(
      "❌ Background location permission denied — task will not fire in background",
    );
    // You may choose to return here if background is strictly required
    // return;
  }

  await AsyncStorage.setItem(ACTIVE_ORDER_KEY, String(orderId));
  await AsyncStorage.setItem(LAST_SYNC_TIME_KEY, Date.now().toString());

  // Clear previous debug state
  await AsyncStorage.removeItem(TASK_DEBUG_KEY);
  await AsyncStorage.removeItem(TASK_ERROR_KEY);
  await AsyncStorage.removeItem(TASK_LAST_LOCATION_KEY);

  const registered = await TaskManager.isTaskRegisteredAsync(
    BACKGROUND_LOCATION_TASK,
  );
  if (registered) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }

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

  console.log("✅ Location tracking started for order", orderId);
};

// Stop tracking
export const stopTracking = async () => {
  const registered = await TaskManager.isTaskRegisteredAsync(
    BACKGROUND_LOCATION_TASK,
  );
  if (registered) {
    await Location.stopLocationUpdatesAsync(BACKGROUND_LOCATION_TASK);
  }

  await syncToDatabase(); // final sync before clearing

  await AsyncStorage.multiRemove([
    ACTIVE_ORDER_KEY,
    LOCAL_WAYPOINTS_KEY,
    LAST_SYNC_TIME_KEY,
  ]);

  console.log("🛑 Stopped tracking");
};
