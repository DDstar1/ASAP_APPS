import { useUserStore } from "@/store/useUserStore";
import { makeRedirectUri } from "expo-auth-session";
import { createUploadTask } from "expo-file-system/legacy";
import { router } from "expo-router";
import { supabase } from "./supabase";

import { getDistanceAndETAByRoad } from "@/utils/mapUtils";
import type {
  Coordinates,
  DeliveryOrder,
  RiderDistanceInfo,
  SavedLocationInput,
} from "@/utils/my_types";
import { formatMessageTime } from "@/utils/my_utils";
import {
  checkOrderExists,
  deleteOldPendingDeliveries,
  hasDriverAcceptedDelivery,
} from "./supabase-utils";

/* -------------------------------------------------
 * Auth Helpers
 * ------------------------------------------------- */

async function requireUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    throw new Error("User not authenticated");
  }
  return data.user;
}

export async function getCurrentUserId(): Promise<{
  success: boolean;
  userId: string | null;
  email?: string;
  error?: any;
}> {
  try {
    const user = await requireUser();
    return { success: true, userId: user.id, email: user.email };
  } catch (err) {
    console.error("🚨 Unexpected error while getting user:", err);
    return { success: false, error: err, userId: null };
  }
}

/* -------------------------------------------------
 * Auth Functions
 * ------------------------------------------------- */

export const handleLogout = async (): Promise<void> => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    useUserStore.getState().setUser(null);
    router.replace("/auth/login");
  } catch (err: any) {
    console.error("Logout error:", err.message);
  }
};

export async function signUpUser(
  email: string,
  password: string,
  username: string,
) {
  const redirectTo = makeRedirectUri({
    scheme: "com.asapCustomer",
    path: "auth-callback",
  });

  if (!email || !password || !username) {
    throw new Error("All fields are required");
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: redirectTo },
  });

  if (error) {
    if (error.message.includes("already registered")) {
      throw new Error("An account with this email already exists");
    }
    throw error;
  }

  const user = data?.user;
  if (!user) throw new Error("User creation failed");

  const { error: profileError } = await supabase
    .from("custom_users")
    .insert([{ id: user.id, username }]);

  if (profileError) {
    console.error("Creating custom_users entry failed:", profileError);
    throw profileError;
  }

  useUserStore.getState().setUser(user);
  return user;
}

export async function signInUser(email: string, password: string) {
  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw new Error(error.message);

  const user = data?.user;
  if (!user) throw new Error("Login failed — user not found");

  useUserStore.getState().setUser(user);
  console.log("✅ User signed in:", user);
  return user;
}

/* -------------------------------------------------
 * User
 * ------------------------------------------------- */

export async function getCusUserById(userId: string) {
  try {
    if (!userId) throw new Error("User ID is required");

    const { data, error } = await supabase
      .from("custom_users")
      .select("*")
      .eq("id", userId)
      .single();

    if (error) throw error;
    return data;
  } catch (err: any) {
    console.error("❌ Error fetching user:", err.message);
    return null;
  }
}

/* -------------------------------------------------
 * Profile Image
 * ------------------------------------------------- */

export const updateProfileImage = async (
  userId: string,
  imageUri: string,
  mimeType?: string,
): Promise<string> => {
  const fileExt = imageUri.split(".").pop() ?? "jpg";
  const fileName = `${userId}_${Date.now()}.${fileExt}`;

  // Use signed upload URL + upload task (consistent with uploadDeliveryImage)
  const { data: signedData, error: signedError } = await supabase.storage
    .from("profile_image_bucket")
    .createSignedUploadUrl(fileName);

  if (signedError) throw signedError;

  const uploadTask = createUploadTask(signedData.signedUrl, imageUri, {
    httpMethod: "PUT",
    headers: { "Content-Type": mimeType ?? "image/jpeg" },
  });

  const result = await uploadTask.uploadAsync();
  if (result.status !== 200) {
    throw new Error(`Profile image upload failed with status ${result.status}`);
  }

  const { data: urlData } = supabase.storage
    .from("profile_image_bucket")
    .getPublicUrl(fileName);

  const publicUrl = urlData.publicUrl;

  const { error: dbError } = await supabase
    .from("custom_users")
    .update({ profileImage: publicUrl })
    .eq("id", userId);

  if (dbError) throw dbError;

  return publicUrl;
};

/* -------------------------------------------------
 * Package / Delivery Images
 * ------------------------------------------------- */

export async function uploadDeliveryImage(
  fileUri: string,
  bucketName = "package_images",
  setUploadProgress: (progress: number | null) => void,
): Promise<string> {
  const fileName = `${Date.now()}.jpg`;

  const { data, error } = await supabase.storage
    .from(bucketName)
    .createSignedUploadUrl(fileName);

  if (error) {
    console.error("❌ Signed URL creation failed:", error);
    throw error;
  }

  const uploadTask = createUploadTask(
    data.signedUrl,
    fileUri,
    {
      httpMethod: "PUT",
      headers: { "Content-Type": "image/jpeg" },
    },
    ({ totalBytesSent, totalBytesExpectedToSend }) => {
      const progress = totalBytesExpectedToSend
        ? totalBytesSent / totalBytesExpectedToSend
        : 0;
      setUploadProgress(Number(progress.toFixed(2)));
    },
  );

  const result = await uploadTask.uploadAsync();
  if (result.status !== 200) {
    throw new Error(`Upload failed with status ${result.status}`);
  }

  const { data: publicData } = supabase.storage
    .from(bucketName)
    .getPublicUrl(fileName);

  console.log("🌐 Public URL:", publicData.publicUrl);
  return publicData.publicUrl;
}

export async function addPackageImage(
  url: string,
): Promise<{ data: any; error: any }> {
  try {
    const user = await requireUser();

    const { data, error } = await supabase
      .from("package_images")
      .insert([{ url, user_id: user.id }])
      .select("*")
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    console.error("Error adding package image:", error.message);
    return { data: null, error };
  }
}

/* -------------------------------------------------
 * Saved Locations
 * ------------------------------------------------- */

export async function addSavedLocation({
  name,
  latitude,
  longitude,
}: SavedLocationInput): Promise<{ data: any; error: any }> {
  try {
    await requireUser();

    const { data, error } = await supabase
      .from("saved_locations")
      .insert([{ name, latitude, longitude }])
      .select("*")
      .single();

    if (error) throw error;
    console.log("✅ Saved location added:", data);
    return { data, error: null };
  } catch (error: any) {
    console.error("Error saving location:", error.message);
    return { data: null, error };
  }
}

export async function getSavedLocations(): Promise<{
  data: any[] | null;
  error: any;
}> {
  try {
    const user = await requireUser();

    const { data, error } = await supabase
      .from("saved_locations")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error: any) {
    console.error("Error fetching saved locations:", error.message);
    return { data: null, error };
  }
}

export async function deleteSavedLocation(
  id: number | string,
): Promise<{ success: boolean; error: any }> {
  try {
    const user = await requireUser();

    const { error } = await supabase
      .from("saved_locations")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;
    console.log(`✅ Deleted location with ID: ${id}`);
    return { success: true, error: null };
  } catch (error: any) {
    console.error("Error deleting location:", error.message);
    return { success: false, error };
  }
}

/* -------------------------------------------------
 * Riders
 * ------------------------------------------------- */

export async function getActiveRiders(
  pickupCoords: Coordinates,
): Promise<RiderDistanceInfo[]> {
  const { data: riders, error: ridersError } = await supabase
    .from("riders_current_status")
    .select("id, latitude, longitude")
    .eq("active_mode", "rider");

  if (ridersError) {
    console.error("Supabase fetch error:", ridersError);
    return [];
  }
  if (!riders || riders.length === 0) return [];

  const { data: users, error: usersError } = await supabase
    .from("custom_users")
    .select("id, username");

  if (usersError) {
    console.error("Supabase fetch error (users):", usersError);
    return [];
  }

  // ✅ Parallel requests instead of sequential loop
  const results = await Promise.all(
    riders.map(async (rider) => {
      const user = users?.find((u) => u.id === rider.id);
      const username = user?.username || "Unknown";

      const result = await getDistanceAndETAByRoad(pickupCoords, {
        latitude: rider.latitude,
        longitude: rider.longitude,
      });

      if (!result) return null;

      return {
        id: rider.id,
        username,
        latitude: rider.latitude,
        longitude: rider.longitude,
        distanceKm: result.distanceKm,
        etaMin: result.durationMin,
      } as RiderDistanceInfo;
    }),
  );

  const ridersWithDistance = results.filter(Boolean) as RiderDistanceInfo[];
  ridersWithDistance.sort((a, b) => (a.distanceKm! < b.distanceKm! ? -1 : 1));

  console.log("Riders with distances:", ridersWithDistance);
  return ridersWithDistance;
}

/* -------------------------------------------------
 * Delivery Orders
 * ------------------------------------------------- */

export async function upsertDeliveryOrder(
  props: Partial<DeliveryOrder> & { order_code: string },
) {
  try {
    const user = await requireUser();
    const client_id = user.id;
    const { order_code, status } = props;

    if (status === "pending") {
      await deleteOldPendingDeliveries(client_id, order_code);

      const { accepted, driver_id } = await hasDriverAcceptedDelivery(
        client_id,
        order_code,
      );
      if (accepted) return { status: "arriving_pickup", driver_id };

      const payload = {
        ...props,
        client_id,
        modified_at: new Date().toISOString(),
      };

      const orderExists = await checkOrderExists(order_code);

      if (orderExists) {
        const { data: updatedData, error: updateError } = await supabase
          .from("delivery_orders")
          .update({ modified_at: new Date().toISOString() })
          .eq("order_code", order_code)
          .select()
          .maybeSingle();

        if (updateError) throw updateError;
        console.log("✅ Order exists, updated modified_at");
        return { status: "updated", data: updatedData };
      } else {
        const { data: insertedData, error: insertError } = await supabase
          .from("delivery_orders")
          .insert([payload])
          .select()
          .maybeSingle();

        if (insertError) throw insertError;
        console.log("✅ Order inserted:", insertedData);
        return { status: "inserted", data: insertedData };
      }
    }
  } catch (err) {
    console.error("❌ Error upserting delivery order:", err);
    return null;
  }
}

export async function getDeliveryOrderById(
  order_id: number,
): Promise<{ data: DeliveryOrder | null; error: any }> {
  try {
    const { data, error } = await supabase
      .from("delivery_orders")
      .select("*")
      .eq("id", order_id)
      .maybeSingle<DeliveryOrder>();

    if (error) throw error;
    return { data, error: null };
  } catch (err: any) {
    console.error("❌ Error fetching delivery order:", err.message);
    return { data: null, error: err };
  }
}

export async function getAllClientDeliveries(): Promise<{
  success: boolean;
  data: any[];
  error?: any;
}> {
  try {
    const user = await requireUser();

    const { data, error } = await supabase
      .from("delivery_orders")
      .select("*")
      .eq("client_id", user.id)
      .in("status", ["pending", "arriving_pickup", "in_transit", "delivered"]);

    if (error) {
      console.error("❌ Error fetching client deliveries:", error.message);
      return { success: false, data: [], error };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error(
      "❌ Unexpected error fetching client deliveries:",
      err.message,
    );
    return { success: false, data: [], error: err };
  }
}

export async function getAllDriverDeliveryWaypoints(
  order_id: number,
): Promise<{ success: boolean; data: any[]; error?: any }> {
  try {
    const { data, error } = await supabase
      .from("delivery_orders_waypoints")
      .select("lat,long,created_at")
      .eq("order_id", order_id)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("❌ Error fetching waypoints:", error.message);
      return { success: false, data: [], error };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error("❌ Unexpected error fetching waypoints:", err.message);
    return { success: false, data: [], error: err };
  }
}

export async function deleteDeliveryByOrderCode(
  order_code: string,
): Promise<{ success: boolean; error: any }> {
  try {
    const user = await requireUser();

    const { error } = await supabase
      .from("delivery_orders")
      .delete()
      .eq("order_code", order_code)
      .eq("client_id", user.id);

    if (error) throw error;
    console.log(`✅ Deleted delivery with order_code: ${order_code}`);
    return { success: true, error: null };
  } catch (error: any) {
    console.error("Error deleting delivery:", error.message);
    return { success: false, error };
  }
}

export async function getPendingOrdersWithRider() {
  const { data, error } = await supabase
    .from("delivery_orders")
    .select(
      `
      id,
      order_code,
      pickup_name,
      dropoff_name,
      status,
      driver_id,
      driver_package_current_lat,
      driver_package_current_long,
      image_url,
      rider:custom_users!delivery_orders_driver_id_fkey (
        username,
        phone
      )
    `,
    )
    .not("status", "eq", "delivered")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching pending orders:", error);
    return [];
  }

  return data.map((order) => ({
    id: order.order_code,
    location: order.dropoff_name || order.pickup_name,
    status: order.status,
    statusColor:
      order.status === "in_transit"
        ? "#22c55e"
        : order.status === "pending"
          ? "#facc15"
          : "#d1d5db",
    map: order.image_url || null,
    rider: {
      id: order.driver_id ?? null,
      name: (order.rider as any)?.username ?? "Unknown",
      phone: (order.rider as any)?.phone ?? null,
    },
    lat: order.driver_package_current_lat,
    long: order.driver_package_current_long,
  }));
}

export const getOrderRiderInfo = async (orderId: number) => {
  const { data, error } = await supabase
    .from("delivery_orders")
    .select(
      `
      driver_id,
      rider:custom_users!driver_id (
        username,
        phone
      )
    `,
    )
    .eq("id", orderId)
    .single();

  if (error) {
    console.error("Error fetching rider info:", error);
    return null;
  }

  return {
    name: (data?.rider as any)?.username ?? "Unknown",
    phone: (data?.rider as any)?.phone ?? null,
    id: data?.driver_id ?? null,
  };
};

/* -------------------------------------------------
 * Messages
 * ------------------------------------------------- */

export const getMessages = async (otherUserId: string) => {
  try {
    const user = await requireUser();

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`,
      )
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
      return [];
    }

    return data || [];
  } catch (err) {
    console.error("Unexpected error fetching messages:", err);
    return [];
  }
};

export const sendMessageToSupabase = async (messageData: {
  message: string;
  sender_id: string;
  receiver_id: string;
  delivery_order_id: number;
}) => {
  try {
    const { data, error } = await supabase
      .from("messages")
      .insert([
        {
          ...messageData,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) throw error;
    console.log("Message sent successfully:", data);
    return data;
  } catch (err) {
    console.error("Unexpected error sending message:", err);
    throw err;
  }
};

export const getUnreadMessageCounts = async (): Promise<
  Record<number, number>
> => {
  try {
    const user = await requireUser();

    const { data, error } = await supabase
      .from("messages")
      .select("delivery_order_id")
      .eq("receiver_id", user.id)
      .eq("is_read", false);

    if (error) throw error;

    const counts: Record<number, number> = {};
    for (const row of data ?? []) {
      const id = row.delivery_order_id;
      counts[id] = (counts[id] ?? 0) + 1;
    }

    return counts;
  } catch (err: any) {
    console.error(
      "Unexpected error fetching unread counts:",
      err.message || err,
    );
    return {};
  }
};

export const markMessagesAsRead = async (orderId: number): Promise<void> => {
  try {
    const user = await requireUser();

    await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("delivery_order_id", orderId)
      .eq("receiver_id", user.id)
      .eq("is_read", false);
  } catch (err) {
    console.error("Failed to mark messages as read:", err);
  }
};

export const getMessagesList = async () => {
  try {
    const user = await requireUser();

    const { data, error } = await supabase
      .from("messages")
      .select(
        `
        *,
        delivery_order:delivery_orders!delivery_order_id (
          id,
          order_code,
          status
        ),
        sender:custom_users!sender_id (
          id,
          username,
          phone
        ),
        receiver:custom_users!receiver_id (
          id,
          username,
          phone
        )
      `,
      )
      .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const getStatusDisplay = (status: string) => {
      const statusMap: Record<string, { text: string; color: string }> = {
        pending: { text: "Pending", color: "#9CA3AF" },
        accepted: { text: "Accepted", color: "#3B82F6" },
        picked_up: { text: "Picked Up", color: "#FB923C" },
        in_transit: { text: "In Transit", color: "#FB923C" },
        delivered: { text: "Delivered", color: "#34D399" },
        cancelled: { text: "Cancelled", color: "#EF4444" },
      };
      return statusMap[status] || { text: "Unknown", color: "#9CA3AF" };
    };

    const conversationsMap = new Map();

    data.forEach((message: any) => {
      const otherUser =
        message.sender_id === user.id ? message.receiver : message.sender;
      const conversationKey = otherUser.id;

      if (!conversationsMap.has(conversationKey)) {
        const deliveryStatus = getStatusDisplay(
          message.delivery_order?.status || "pending",
        );

        conversationsMap.set(conversationKey, {
          key: conversationKey,
          id: otherUser.id,
          riderName: otherUser.username,
          lastMessage: message.message,
          time: formatMessageTime(message.created_at),
          unreadCount: 0,
          deliveryOrderId: message.delivery_order_id,
          orderId: message.delivery_order?.order_code || "",
          status: deliveryStatus.text,
          statusColor: deliveryStatus.color,
          avatar: null,
          lastMessageTime: message.created_at,
          otherUserId: otherUser.id,
        });
      }
    });

    const conversations = Array.from(conversationsMap.values()).sort(
      (a, b) =>
        new Date(b.lastMessageTime).getTime() -
        new Date(a.lastMessageTime).getTime(),
    );

    console.log("Messages fetched successfully:", conversations);
    return { success: true, data: conversations };
  } catch (err) {
    console.error("Unexpected error fetching messages:", err);
    return { success: false, error: err, data: [] };
  }
};

/**
 * Get settings for a specific user
 * @param userId - the UUID of the user
 * @returns success flag, settings data, and optional error
 */

export async function getUserSettings(): Promise<{
  success: boolean;
  data?: {
    delivery_alerts: boolean;
    promotions: boolean;
    sms_updates: boolean;
  } | null;
  error?: any;
}> {
  const DEFAULT_SETTINGS = {
    delivery_alerts: true,
    promotions: false,
    sms_updates: true,
  };
  try {
    const user = await requireUser();
    const userId = user.id;

    const { data, error } = await supabase
      .from("settings")
      .select("delivery_alerts, promotions, sms_updates")
      .eq("id", userId)
      .single();

    // Row exists — return it
    if (!error) return { success: true, data };

    // Unexpected error (not "row not found")
    if (error.code !== "PGRST116") {
      console.error("❌ Error fetching user settings:", error.message);
      return { success: false, data: null, error };
    }

    // Row doesn't exist — create it with defaults
    const { data: newRow, error: insertError } = await supabase
      .from("settings")
      .insert({ id: userId, ...DEFAULT_SETTINGS })
      .select("delivery_alerts, promotions, sms_updates")
      .single();

    if (insertError) {
      console.error("❌ Error creating default settings:", insertError.message);
      return { success: false, data: null, error: insertError };
    }

    return { success: true, data: newRow };
  } catch (err: any) {
    console.error("❌ Unexpected error fetching user settings:", err.message);
    return { success: false, data: null, error: err };
  }
}

export async function updateUserSetting(
  userId: string,
  newSettings: Partial<{
    delivery_alerts: boolean;
    promotions: boolean;
    sms_updates: boolean;
  }>,
): Promise<{ success: boolean; data?: any; error?: any }> {
  try {
    const { data, error } = await supabase
      .from("settings")
      .update(newSettings)
      .eq("id", userId)
      .select()
      .single();

    if (error) throw error;

    return { success: true, data };
  } catch (err: any) {
    console.error("❌ updateUserSetting error:", err.message);
    return { success: false, error: err };
  }
}
