import { useUserStore } from "@/store/useUserStore";
import { RiderOrder } from "@/utils/my_types";
import { makeRedirectUri } from "expo-auth-session";
import { router } from "expo-router";
import { supabase } from "./supabase";
import { formatMessageTime } from "@/utils/utils_for_me";
import { createUploadTask } from "expo-file-system/legacy";
import { apiGet, apiPost, apiPostIgnoringBody } from "./api-client";
import { normalizePhone } from "./phone";
import { stopTracking } from "@/utils/utils_orderLocationTracking";
import { unregisterPushToken } from "./push-notifications";

export async function getCurrentUserId() {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("❌ No logged-in user found", userError);
      return {
        success: false,
        error: userError || "No user session",
        userId: null,
      };
    }

    return { success: true, userId: user.id, email: user.email };
  } catch (err) {
    console.error("🚨 Unexpected error while getting user:", err);
    return { success: false, error: err, userId: null };
  }
}

export const handleLogout = async () => {
  try {
    // Needs the session, so it has to run before signOut.
    await unregisterPushToken();

    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    // 🧹 Clear Zustand user state
    useUserStore.getState().setUser(null);

    // 🚪 Redirect to login or onboarding
    router.replace("/auth/login");
  } catch (err: any) {
    console.error("Logout error:", err.message);
  }
};

// Permanently deletes the signed-in rider and all their data
// (see supabase/migrations/*_delete_own_account.sql). The server refuses
// with "ACTIVE_DELIVERY" while the rider has an undelivered order.
export const deleteOwnAccount = async () => {
  const { error } = await supabase.rpc("delete_own_account");
  if (error) throw error;

  // Make sure no background location task outlives the account.
  await stopTracking();

  // The server session is gone with the user, so only clear it locally.
  await supabase.auth.signOut({ scope: "local" });
  useUserStore.getState().setUser(null);
  router.replace("/auth/login");
};
/**
 * Sign up a new user with email, password, and username.
 * Checks if the email already exists, creates the auth user, and inserts a row into cus_users table.
 */

export async function signUpUser(
  email: string,
  password: string,
  username: string,
  phone: string,
) {
  const redirectTo = makeRedirectUri({
    scheme: "asaprider",
    path: "auth/auth-callback",
  });

  if (!email || !password || !username || !phone) {
    throw new Error("All fields are required");
  }

  // Customers call riders on this number, so it's required and stored E.164
  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) {
    throw new Error("Enter a valid phone number, e.g. 08012345678");
  }

  // 1️⃣ Create auth user
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
  if (!user) {
    throw new Error("User creation failed");
  }

  // 2️⃣ Insert into custom_users
  const { error: profileError } = await supabase
    .from("app_custom_users")
    .insert([
      {
        id: user.id, // include the new auth user ID
        username,
        phone: normalizedPhone,
        custom_role: "rider",
      },
    ]);

  if (profileError) {
    console.error("Creating custom_users entry failed:", profileError);
    throw profileError;
  }

  // 3️⃣ ✅ Store the new user in Zustand
  useUserStore.getState().setUser(user);

  return user;
}

export async function signInUser(email: string, password: string) {
  if (!email || !password) {
    throw new Error("Email and password are required");
  }

  // 1️⃣ Attempt login
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw new Error(error.message);
  }

  const user = data?.user;
  if (!user) {
    throw new Error("Login failed — user not found");
  }

  // 2️⃣ ✅ Save logged-in user in Zustand
  useUserStore.getState().setUser(user);
  console.log("✅ User signed in:", user);

  return user;
}

async function requireUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    throw new Error("User not authenticated");
  }
  return data.user;
}

/* -------------------------------------------------
 * User
 * ------------------------------------------------- */

export async function getCusUserById(userId: string) {
  try {
    if (!userId) throw new Error("User ID is required");

    const { data, error } = await supabase
      .from("app_custom_users")
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

/* export async function updateRiderLocation(latitude: number, longitude: number) {
  try {
    const user = await requireUser();

    const { error } = await supabase.from("app_riders_current_status").upsert({
      id: user.id,
      email: user.email,
      active_mode: "rider",
      latitude,
      longitude,
    });

    if (error) return { success: false, error };

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
} */

export async function updateRiderLocation(latitude: number, longitude: number) {
  try {
    const user = await requireUser();
    // Body must match Rust's GeoPointRequest; kind is GeoPointKind in snake_case
    await apiPost(`/matching/process-geolocation/${user.id}`, {
      lat: latitude,
      lng: longitude,
      name: "Driver location",
      kind: "driver_location",
    });
    return { success: true };
  } catch (err: any) {
    console.error("Failed to send driver location:", err.message);
    return { success: false, error: err.message };
  }
}

/* export async function updateRiderActiveMode(isOnline: boolean) {
  try {
    const { data, error: userError } = await supabase.auth.getUser();
    const user = data?.user; // <-- make sure we safely access user

    if (userError || !user) {
      console.error("❌ No logged-in user found", userError);
      return { success: false, error: userError || "No user session" };
    }

    const riderId = user.id;

    const { data: updatedData, error } = await supabase
      .from("app_riders_current_status")
      .update({
        active_mode: isOnline ? "rider" : "client",
      })
      .eq("id", riderId); // make sure to specify which row to update

    if (error) {
      console.error("❌ Failed to update active mode:", error.message);
      return { success: false, error };
    }

    console.log("⚡ Rider active mode updated:", {
      riderId,
      active_mode: isOnline ? "online" : "offline",
      time: new Date().toLocaleTimeString(),
      response: updatedData,
    });

    return { success: true, data: updatedData };
  } catch (err) {
    console.error("🚨 Unexpected error while updating active mode:", err);
    return { success: false, error: err };
  }
} */

// back_drivers.status. Rust sets "busy" on assignment; the app only ever
// sends "available" or "offline".
export type DriverStatus = "available" | "busy" | "offline";

/** The signed-in driver's saved status, or null if it can't be read. */
export async function getDriverStatus(): Promise<DriverStatus | null> {
  try {
    const user = await requireUser();
    const { data, error } = await supabase
      .from("back_drivers")
      .select("status")
      .eq("driver_id", user.id)
      .maybeSingle();
    if (error) throw error;
    const status = data?.status;
    return status === "available" || status === "busy" || status === "offline"
      ? status
      : null;
  } catch (err: any) {
    console.error("Failed to load driver status:", err.message);
    return null;
  }
}

export async function updateRiderActiveMode(isOnline: boolean) {
  try {
    // Driver id comes from the auth token on the Rust side
    await apiPostIgnoringBody("/drivers/update-status", {
      status: isOnline ? "available" : "offline",
    });
    return { success: true };
  } catch (err: any) {
    console.error("Failed to update driver status:", err.message);
    return { success: false, error: err.message };
  }
}
/**
 * Fetch available delivery orders:
 * - not accepted by any driver
 * - still pending
 */
/* export async function fetchAvailableOrders(): Promise<{
  success: boolean;
  data?: RiderOrder[];
  error?: unknown;
}> {
  try {
    const { data, error } = await supabase
      .from<RiderOrder>("delivery_orders")
      .select("*")
      .is("driver_id", null)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("❌ Failed to fetch available orders:", error);
      return { success: false, error };
    }

    console.log("📦 Fetched available orders:", data);
    return { success: true, data: data ?? [] };
  } catch (err) {
    console.error("🚨 Unexpected error fetching orders:", err);
    return { success: false, error: err };
  }
} */
export async function fetchAvailableOrders(): Promise<{
  success: boolean;
  data?: RiderOrder[];
  error?: unknown;
}> {
  try {
    const data = await apiGet<RiderOrder[]>("/riders/assign-driver");
    return { success: true, data: data ?? [] };
  } catch (err) {
    console.error("🚨 Unexpected error fetching orders:", err);
    return { success: false, error: err };
  }
}
/* export async function acceptDeliveryOrder(
  orderCode: string,
  driverLat: number,
  driverLong: number,
) {
  try {
    const user = await requireUser();

    const { data, error } = await supabase
      .from("app_delivery_orders")
      .update({
        driver_id: user.id,
        status: "arriving_pickup",
        driver_initial_lat: driverLat,
        driver_initial_long: driverLong,
        modified_at: new Date().toISOString(),
        delivery_accepted_time: new Date().toISOString(),
      })
      .eq("order_code", orderCode)
      .eq("status", "pending")
      .select()
      .single();

    if (error || !data) return { success: false, error: error?.message };

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
} */
export async function acceptDeliveryOrder(
  orderCode: string,
  driverLat: number,
  driverLong: number,
) {
  try {
    const data = await apiPost("/drivers/driver-response", {
      order_code: orderCode,
      accepted: true,
      driver_lat: driverLat,
      driver_long: driverLong,
    });
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
/* export async function getDeliveryOrderByCode(orderCode: string) {
  console.log("Fetching delivery order for code:", orderCode);
  try {
    if (!orderCode) {
      return {
        success: false,
        error: "orderCode is required",
      };
    }

    const { data, error } = await supabase
      .from("app_delivery_orders")
      .select("*")
      .eq("order_code", orderCode)
      .single(); // order_code is UNIQUE

    if (error) {
      console.error("❌ Failed to fetch order:", error.message);
      return {
        success: false,
        error,
      };
    }

    return {
      success: true,
      data,
    };
  } catch (err) {
    console.error("🚨 Unexpected error fetching order:", err);
    return {
      success: false,
      error: err,
    };
  }
} */

export async function getDeliveryOrderByCode(orderCode: string) {
  try {
    if (!orderCode) return { success: false, error: "orderCode is required" };
    const data = await apiGet(`/trips/get-trip/${orderCode}`);
    if (!data) return { success: false, error: "Trip not found" };
    return { success: true, data };
  } catch (err) {
    console.error("🚨 Unexpected error fetching order:", err);
    return { success: false, error: err };
  }
}

export async function getRiderAcceptedDeliveries() {
  try {
    const { data: authData, error: userError } = await supabase.auth.getUser();
    const user = authData?.user;

    if (userError || !user) {
      console.error("❌ No logged-in user found", userError);
      return {
        success: false,
        data: [],
        error: userError || "No user session",
      };
    }

    const driverId = user.id;

    // The rider shows the pickup code (the sender enters it); the dropoff code
    // stays out — the rider enters it and Rust checks it
    const { data, error } = await supabase
      .from("app_delivery_orders")
      .select(
        "id,order_code,status,created_at,pickup_lat,pickup_long,pickup_name,dropoff_lat,dropoff_long,dropoff_name,image_url,package_type,delivery_accepted_time,dropoff_time,cancelled_at,payment_reference,customer_phone,pickup_code",
      )
      .eq("driver_id", driverId)
      .in("status", [
        "pending",
        "arriving_pickup",
        "in_transit",
        "delivered",
        "cancelled",
      ])
      .order("created_at", { ascending: false });

    if (error) {
      console.error("❌ Error fetching rider deliveries:", error.message);
      return { success: false, data: [], error };
    }

    return { success: true, data };
  } catch (err: any) {
    console.error(
      "❌ Unexpected error fetching rider deliveries:",
      err.message,
    );
    return { success: false, data: [], error: err };
  }
}

export const getOrderClientInfo = async (orderId: number) => {
  const { data, error } = await supabase
    .from("app_delivery_orders")
    .select(
      `
      client_id,
      client:custom_users!client_id (
        username,
        phone
      )
    `,
    )
    .eq("id", orderId)
    .single();

  console.log("log of getOrderClientInfo", data);

  if (error) {
    console.error("Error fetching client info:", error);
    return null;
  }

  return {
    name: (data?.client as any)?.username ?? "Unknown",
    phone: (data?.client as any)?.phone ?? null,
    id: data?.client_id ?? null,
  };
};

export const getMessages = async (otherUserId: string) => {
  try {
    // 🔹 Ensure a logged-in user
    const user = await requireUser();
    const userId = user.id;

    // 🔹 Fetch messages between the two users
    const { data, error } = await supabase
      .from("app_messages")
      .select("*")
      .or(
        `and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`,
      )
      .order("created_at", { ascending: true }); // oldest first

    if (error) throw error;

    return data || [];
  } catch (err: any) {
    console.error("Unexpected error fetching messages:", err.message || err);
    return [];
  }
};

export const getUnreadMessageCounts = async (): Promise<
  Record<number, number>
> => {
  try {
    const user = await requireUser();

    const { data, error } = await supabase
      .from("app_messages")
      .select("delivery_order_id")
      .eq("receiver_id", user.id)
      .eq("is_read", false);

    if (error) throw error;

    // Group and count by delivery_order_id
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
    const { success, userId } = await getCurrentUserId();
    if (!success || !userId) return;

    await supabase
      .from("app_messages")
      .update({ is_read: true })
      .eq("delivery_order_id", orderId)
      .eq("receiver_id", userId)
      .eq("is_read", false);
  } catch (err) {
    console.error("Failed to mark messages as read:", err);
  }
};

export const sendMessageToSupabase = async (messageData: {
  message: string;
  sender_id: string;
  receiver_id: string;
  delivery_order_id: number;
  image_url?: string | null; // chat_images object path
}) => {
  console.log("Sending message:", messageData);

  try {
    const { data, error } = await supabase
      .from("app_messages")
      .insert([
        {
          message: messageData.message,
          sender_id: messageData.sender_id,
          receiver_id: messageData.receiver_id,
          delivery_order_id: messageData.delivery_order_id,
          image_url: messageData.image_url ?? null,
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("Error sending message:", error);
      throw error;
    }

    console.log("Message sent successfully:", data);
    return data;
  } catch (err) {
    console.error("Unexpected error sending message:", err);
    throw err;
  }
};

export const getMessagesList = async () => {
  try {
    // 🔹 Get logged-in user
    const user = await requireUser();
    const userId = user.id;

    // 🔹 Fetch messages involving this user
    const { data, error } = await supabase
      .from("app_messages")
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
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: false });

    if (error) throw error;

    // 🔹 Status map
    const statusMap: Record<string, { text: string; color: string }> = {
      pending: { text: "Pending", color: "#9CA3AF" },
      accepted: { text: "Accepted", color: "#3B82F6" },
      picked_up: { text: "Picked Up", color: "#FB923C" },
      in_transit: { text: "In Transit", color: "#FB923C" },
      delivered: { text: "Delivered", color: "#34D399" },
      cancelled: { text: "Cancelled", color: "#EF4444" },
    };

    // 🔹 Group by other user
    const conversationsMap = new Map<string, any>();

    data.forEach((msg: any) => {
      const otherUser = msg.sender_id === userId ? msg.receiver : msg.sender;
      if (conversationsMap.has(otherUser.id)) return;

      const deliveryStatus = statusMap[
        msg.delivery_order?.status || "pending"
      ] || { text: "Unknown", color: "#9CA3AF" };

      conversationsMap.set(otherUser.id, {
        key: otherUser.id,
        id: otherUser.id,
        clientName: otherUser.username,
        lastMessage: msg.message || (msg.image_url ? "📷 Photo" : ""),
        time: formatMessageTime(msg.created_at),
        unreadCount: 0,
        deliveryOrderId: msg.delivery_order_id,
        orderId: msg.delivery_order?.order_code || "",
        status: deliveryStatus.text,
        statusColor: deliveryStatus.color,
        avatar: null,
        lastMessageTime: msg.created_at,
        otherUserId: otherUser.id,
      });
    });

    // 🔹 Convert to array and sort
    const conversations = Array.from(conversationsMap.values()).sort(
      (a, b) =>
        new Date(b.lastMessageTime).getTime() -
        new Date(a.lastMessageTime).getTime(),
    );

    return { success: true, data: conversations };
  } catch (err: any) {
    console.error("Unexpected error fetching messages:", err);
    return { success: false, error: err.message, data: [] };
  }
};

// Add this to your @/lib/supabase-functions file

/**
 * Unified function to verify pickup or dropoff codes
 * @param deliveryId - The delivery/order ID
 * @param code - The code to verify
 * @param type - Either "pickup" or "dropoff"
 * @returns Promise with success status and optional error message
 */
/* export const verifyDeliveryCode = async (
  deliveryId: number,
  code: string,
  type: "pickup" | "dropoff",
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Determine which column to check based on type
    const codeColumn = type === "pickup" ? "pickup_code" : "dropoff_code";

    // Query the delivery and verify the code
    const { data, error } = await supabase
      .from("app_delivery_orders") // or whatever your table name is
      .select(codeColumn)
      .eq("id", deliveryId)
      .single();

    console.log(data);

    if (error) {
      console.error("Error fetching delivery:", error);
      return { success: false, error: "Failed to verify code" };
    }

    // Check if the code matches
    if (data[codeColumn] === code) {
      // Update the delivery status
      const newStatus = type === "pickup" ? "in_transit" : "delivered";

      const { error: updateError } = await supabase
        .from("app_delivery_orders")
        .update({
          status: newStatus,
          ...(type === "pickup"
            ? {
                pickup_time: new Date().toISOString(),
                is_pickup_code_authenticated: true,
              }
            : {
                dropoff_time: new Date().toISOString(),
                is_dropoff_code_authenticated: true,
              }),
        })
        .eq("id", deliveryId);

      if (updateError) {
        console.error("Error updating delivery status:", updateError);
        return { success: false, error: "Failed to update delivery status" };
      }

      return { success: true };
    } else {
      return { success: false, error: "Invalid code" };
    }
  } catch (err) {
    console.error("Unexpected error in verifyDeliveryCode:", err);
    return { success: false, error: "An unexpected error occurred" };
  }
};
 */
export const verifyDeliveryCode = async (
  deliveryId: number,
  code: string,
  type: "pickup" | "dropoff",
): Promise<{ success: boolean; error?: string }> => {
  try {
    await apiPost("/trips/update-trip", {
      delivery_id: deliveryId,
      code,
      type,
    });
    return { success: true };
  } catch (err: any) {
    console.error("Unexpected error in verifyDeliveryCode:", err);
    return {
      success: false,
      error: err.message ?? "An unexpected error occurred",
    };
  }
};

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
      .from("app_settings")
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
      .from("app_settings")
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
      .from("app_settings")
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

export async function updateUserPassword(
  currentPassword: string,
  newPassword: string,
) {
  // Step 1: Get current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) throw new Error("No authenticated user found.");
  if (!user.email) throw new Error("This account has no email password.");

  // Step 2: Verify current password by re-signing in
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword,
  });

  if (signInError) throw new Error("Current password is incorrect.");

  // Step 3: Update to new password
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (updateError) throw updateError;
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
    .from("app_profile_image_bucket")
    .createSignedUploadUrl(fileName);

  if (signedError) throw signedError;

  const uploadTask = createUploadTask(signedData.signedUrl, imageUri, {
    httpMethod: "PUT",
    headers: { "Content-Type": mimeType ?? "image/jpeg" },
  });

  const result = await uploadTask.uploadAsync();
  if (!result || result.status !== 200) {
    throw new Error(
      `Profile image upload failed with status ${result?.status ?? "unknown"}`,
    );
  }

  const { data: urlData } = supabase.storage
    .from("app_profile_image_bucket")
    .getPublicUrl(fileName);

  const publicUrl = urlData.publicUrl;

  const { error: dbError } = await supabase
    .from("app_custom_users")
    .update({ profileImage: publicUrl })
    .eq("id", userId);

  if (dbError) throw dbError;

  return publicUrl;
};

export async function updateBankDetails(
  driverId: string,
  accountNumber: string,
  bankCode: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await apiPost("/drivers/update-bank-details", {
      driver_id: driverId,
      account_number: accountNumber,
      bank_code: bankCode,
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Failed to update bank details" };
  }
}

// Completes the delivery for app and Zazu orders (Rust checks the code by the
// order's source); for Zazu orders this also releases the payout
/**
 * Cancelled-after-pickup orders whose package the rider still has to take
 * back (app_returned.status = 'returning'). RLS limits rows to this rider.
 */
export async function fetchOpenReturnOrderIds(): Promise<number[]> {
  const { data, error } = await supabase
    .from("app_returned")
    .select("order_id")
    .eq("status", "returning");

  if (error) {
    console.error("❌ Failed to load open returns:", error.message);
    return [];
  }
  return (data ?? []).map((row: { order_id: number }) => Number(row.order_id));
}

/** The rider enters the customer's return code at the pickup point. */
export async function confirmReturn(
  orderRef: string,
  driverId: string,
  returnCode: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await apiPost("/drivers/confirm-return", {
      order_ref: orderRef,
      driver_id: driverId,
      return_code: returnCode,
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Confirmation failed" };
  }
}

export async function confirmRideDropoff(
  orderRef: string,
  driverId: string,
  dropoffCode: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    await apiPost("/drivers/confirm-dropoff", {
      order_ref: orderRef,
      driver_id: driverId,
      dropoff_code: dropoffCode,
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message ?? "Confirmation failed" };
  }
}
