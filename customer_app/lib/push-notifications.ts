// OS push notifications. The server side lives in
// supabase/migrations/*_push_notifications_and_ride_offers.sql: order updates
// fire a trigger that sends to every token registered here for the user.
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import { supabase } from "./supabase";

const APP = "customer";

// Ids must match the `channelId` send_push() uses.
const ANDROID_CHANNELS = [
  {
    id: "default",
    name: "Delivery updates",
    importance: Notifications.AndroidImportance.HIGH,
  },
];

// Show pushes as banners even while the app is open.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let registeredToken: string | null = null;

/**
 * Ask for permission, get this device's Expo push token and store it against
 * the signed-in user. Safe to call on every login; returns null when pushes
 * aren't possible (simulator, permission denied, missing projectId).
 */
export async function registerForPushNotifications(): Promise<string | null> {
  try {
    if (!Device.isDevice) return null;

    if (Platform.OS === "android") {
      for (const { id, ...channel } of ANDROID_CHANNELS) {
        await Notifications.setNotificationChannelAsync(id, channel);
      }
    }

    let { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      ({ status } = await Notifications.requestPermissionsAsync());
    }
    if (status !== "granted") return null;

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;
    if (!projectId) {
      console.warn("Push: no EAS projectId configured");
      return null;
    }

    const { data: token } = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    const { error } = await supabase.rpc("register_push_token", {
      p_token: token,
      p_app: APP,
      p_platform: Platform.OS,
    });
    if (error) throw error;

    registeredToken = token;
    return token;
  } catch (err) {
    console.error("Push registration failed:", err);
    return null;
  }
}

/** Call BEFORE signOut so this device stops receiving the old user's pushes. */
export async function unregisterPushToken() {
  if (!registeredToken) return;
  try {
    await supabase.rpc("unregister_push_token", { p_token: registeredToken });
  } catch (err) {
    console.error("Push unregister failed:", err);
  } finally {
    registeredToken = null;
  }
}

// `type` values come from notify_order_status_change() in the migration.
// The two arrival types fire once arrived_pickup / arrived_dropoff statuses exist.
export type PushData = {
  type?:
    | "rider_found"
    | "rider_arrived_pickup"
    | "pickup_made"
    | "rider_arrived_dropoff"
    | "trip_complete";
  order_id?: number;
  [key: string]: unknown;
};

const handledResponses = new Set<string>();

/**
 * Runs `onTap` when the user taps a notification, including the one that
 * launched the app from a killed state. Waits until `enabled` (e.g. user
 * loaded and navigator mounted) before handling.
 */
export function useNotificationTaps(
  enabled: boolean,
  onTap: (data: PushData) => void,
) {
  const lastResponse = Notifications.useLastNotificationResponse();
  const onTapRef = useRef(onTap);
  onTapRef.current = onTap;

  useEffect(() => {
    if (!enabled || !lastResponse) return;
    if (
      lastResponse.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER
    )
      return;

    const id = lastResponse.notification.request.identifier;
    if (handledResponses.has(id)) return;
    handledResponses.add(id);

    onTapRef.current(
      (lastResponse.notification.request.content.data ?? {}) as PushData,
    );
  }, [enabled, lastResponse]);
}
