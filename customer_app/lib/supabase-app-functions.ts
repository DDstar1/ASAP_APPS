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
import {
  checkOrderExists,
  deleteOldPendingDeliveries,
  hasDriverAcceptedDelivery,
} from "./supabase-utils";
import { formatMessageTime } from "@/utils/my_utils";

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
/**
 * Sign up a new user with email, password, and username.
 * Checks if the email already exists, creates the auth user, and inserts a row into cus_users table.
 */

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
    .from("custom_users")
    .insert([{ id: user.id, username }]);

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

export async function getCusUserById(userId: string) {
  try {
    if (!userId) throw new Error("User ID is required");

    const { data, error } = await supabase
      .from("custom_users")
      .select("*")
      .eq("id", userId)
      .single();

    console.log(data);

    if (error) throw error;
    return data;
  } catch (err) {
    console.error("❌ Error fetching user:", err.message);
    return null;
  }
}

export async function uploadDeliveryImage(
  fileUri: string,
  bucketName = "package_images", // ✅ Renamed for clarity
  setUploadProgress: (progress: number | null) => void,
) {
  try {
    // 1️⃣ Create signed upload URL from Supabase
    const fileName = `${Date.now()}.jpg`;
    const filePath = fileName; // ✅ Simplified

    const { data, error } = await supabase.storage
      .from(bucketName)
      .createSignedUploadUrl(filePath);

    if (error) {
      console.error("❌ Signed URL creation failed:", error);
      throw error;
    }

    const signedUrl = data.signedUrl;
    console.log("📝 Signed URL created:", signedUrl);

    // 2️⃣ Create upload task with progress tracking
    const uploadTask = createUploadTask(
      signedUrl,
      fileUri,
      {
        httpMethod: "PUT",
        headers: {
          "Content-Type": "image/jpeg",
        },
      },
      ({ totalBytesSent, totalBytesExpectedToSend }) => {
        const progress = totalBytesExpectedToSend
          ? totalBytesSent / totalBytesExpectedToSend
          : 0;
        setUploadProgress(Number(progress.toFixed(2)));
      },
    );

    // 3️⃣ Await task result
    const result = await uploadTask.uploadAsync();

    if (result.status !== 200) {
      throw new Error(`Upload failed with status ${result.status}`);
    }

    console.log("✅ Upload successful:", result);

    // 4️⃣ Get public URL
    const { data: publicData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    console.log("🌐 Public URL:", publicData.publicUrl);

    return publicData.publicUrl;
  } catch (err) {
    console.error("❌ Upload failed:", err);
    throw err;
  }
}

export async function addPackageImage(url: string) {
  try {
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error("User not logged in");

    const { data, error } = await supabase
      .from("package_images")
      .insert([
        {
          url,
          user_id: user.id, // optional if you have default auth.uid() in table
        },
      ])
      .select("*")
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error("Error adding package image:", error.message);
    return { data: null, error };
  }
}

export async function addSavedLocation({
  name,
  latitude,
  longitude,
}: SavedLocationInput) {
  try {
    // Ensure user is logged in
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error("User not logged in");

    // Insert record (no need to manually include user_id)
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

export async function getSavedLocations() {
  try {
    // Ensure user is logged in
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error("User not logged in");

    // Fetch all saved locations for this user
    const { data, error } = await supabase
      .from("saved_locations")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;

    console.log("✅ Retrieved saved locations:", data);
    return { data, error: null };
  } catch (error: any) {
    console.error("Error fetching saved locations:", error.message);
    return { data: null, error };
  }
}

export async function deleteSavedLocation(id: number | string) {
  try {
    // Ensure user is logged in
    const user = (await supabase.auth.getUser()).data.user;
    if (!user) throw new Error("User not logged in");

    // Delete the location that belongs to this user
    const { error } = await supabase
      .from("saved_locations")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id); // Ensure user owns it

    if (error) throw error;

    console.log(`✅ Deleted location with ID: ${id}`);
    return { success: true, error: null };
  } catch (error: any) {
    console.error("Error deleting location:", error.message);
    return { success: false, error };
  }
}

/**
 * Returns the closest active rider based on driving distance & ETA using getDistanceAndETAByRoad
 */
export async function getActiveRiders(pickupCoords: Coordinates) {
  // 1️⃣ Fetch active riders updated in last 50 minutes
  const { data: riders, error: ridersError } = await supabase
    .from("riders_current_status")
    .select("id, latitude, longitude")
    .eq("active_mode", "rider");

  console.log("Active riders fetched:", riders);

  if (ridersError) {
    console.error("Supabase fetch error:", ridersError);
    return [];
  }
  if (!riders || riders.length === 0) return [];

  // 2️⃣ Fetch usernames for these rider IDs
  const { data: users, error: usersError } = await supabase
    .from("custom_users")
    .select("id, username");

  console.log("Active usernames fetched:", users);

  if (usersError) {
    console.error("Supabase fetch error (users):", usersError);
    return [];
  }

  // 3️⃣ Compute distances & ETA for each rider
  const ridersWithDistance: RiderDistanceInfo[] = [];

  for (const rider of riders) {
    const user = users?.find((u) => u.id === rider.id);
    const username = user?.username || "Unknown";

    const result = await getDistanceAndETAByRoad(pickupCoords, {
      latitude: rider.latitude,
      longitude: rider.longitude,
    });

    if (result) {
      ridersWithDistance.push({
        id: rider.id,
        username,
        latitude: rider.latitude,
        longitude: rider.longitude,
        distanceKm: result.distanceKm,
        etaMin: result.durationMin,
      });
    }
  }

  console.log("Riders with distances:", ridersWithDistance);

  // 4️⃣ Sort by distance
  ridersWithDistance.sort((a, b) => (a.distanceKm! < b.distanceKm! ? -1 : 1));
  return ridersWithDistance;
}

export async function upsertDeliveryOrder(
  props: Partial<DeliveryOrder> & { order_code: string },
) {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!userData?.user) throw new Error("No user logged in");

    const client_id = userData.user.id;
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
        // Only update modified_at if order already exists
        const { data: updatedData, error: updateError } = await supabase
          .from("delivery_orders")
          .update({ modified_at: new Date().toISOString() })
          .eq("order_code", order_code)
          .select()
          .maybeSingle();

        if (updateError) throw updateError;
        console.log("✅ Order exists, updated modified_at:");
        return { status: "updated", data: updatedData };
      } else {
        // Insert new order
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

export async function getDeliveryOrderById(order_id: number) {
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

export const getMessages = async (otherUserId: string) => {
  console.log("Fetching messages for user ID:", otherUserId);
  try {
    // Get the currently logged-in user
    const { success, userId, error: userError } = await getCurrentUserId();

    if (!success || !userId) {
      console.error("❌ No logged-in user found", userError);
      return [];
    }

    const { data, error } = await supabase
      .from("messages")
      .select("*") // select all columns
      .or(
        `and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`,
      )
      .order("created_at", { ascending: true }); // oldest → newest

    if (error) {
      console.error("Error fetching messages:", error);
      return [];
    }

    console.log("Fetched messages:", data);

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
  console.log("Sending message:", messageData);

  try {
    const { data, error } = await supabase
      .from("messages")
      .insert([
        {
          message: messageData.message,
          sender_id: messageData.sender_id,
          receiver_id: messageData.receiver_id,
          delivery_order_id: messageData.delivery_order_id,
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
    // Get the currently logged-in user
    const { success, userId, error: userError } = await getCurrentUserId();

    if (!success || !userId) {
      console.error("❌ No logged-in user found", userError);
      throw new Error("User not authenticated");
    }

    console.log("Fetching messages for user:", userId);

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
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching messages:", error);
      throw error;
    }

    // Group messages by conversation (other user only, not by delivery order)
    const conversationsMap = new Map();

    data.forEach((message: any) => {
      const otherUser =
        message.sender_id === userId ? message.receiver : message.sender;
      const conversationKey = otherUser.id; // Group by other user only

      if (!conversationsMap.has(conversationKey)) {
        // Map delivery status to display status and color
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

        const deliveryStatus = getStatusDisplay(
          message.delivery_order?.status || "pending",
        );

        conversationsMap.set(conversationKey, {
          key: conversationKey,
          id: otherUser.id,
          riderName: otherUser.username,
          lastMessage: message.message,
          time: formatMessageTime(message.created_at),
          unreadCount: 0, // You can calculate this based on read status if you add that field
          deliveryOrderId: message.delivery_order_id, // Most recent delivery order
          orderId: message.delivery_order?.order_code || "",
          status: deliveryStatus.text,
          statusColor: deliveryStatus.color,
          avatar: null, // No avatar_url in custom_users table
          lastMessageTime: message.created_at,
          otherUserId: otherUser.id,
        });
      }
    });

    // Convert Map to array
    const conversations = Array.from(conversationsMap.values());

    // Sort by most recent message
    conversations.sort(
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

  console.log("log of getOrderRiderInfo", data);

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

export const getPendingOrdersWithRider = async () => {
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
};

export async function getClientCurrentDeliveries() {
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

    const clientId = user.id;

    const { data, error } = await supabase
      .from("delivery_orders")
      .select("*")
      .eq("client_id", clientId)
      .in("status", ["pending", "arriving_pickup", "in_transit"]); // active deliveries

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
