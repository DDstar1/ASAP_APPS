import { useUserStore } from "@/store/useUserStore";
import { RiderOrder } from "@/utils/my_types";
import { makeRedirectUri } from "expo-auth-session";
import { router } from "expo-router";
import { supabase } from "./supabase";
import { formatMessageTime } from "@/utils/utils_for_me";

// Standalone function to get current user ID
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
  const { error: profileError } = await supabase.from("custom_users").insert([
    {
      id: user.id, // include the new auth user ID
      username,
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

export async function updateRiderLocation(latitude: number, longitude: number) {
  try {
    // Get the currently logged-in user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("❌ No logged-in user found", userError);
      return { success: false, error: userError || "No user session" };
    }

    const riderId = user.id;
    const riderEmail = user.email;

    // Upsert location
    const { data, error } = await supabase
      .from("riders_current_status")
      .upsert({
        id: riderId,
        email: riderEmail,
        active_mode: "rider",
        latitude,
        longitude,
      });

    if (error) {
      console.error("❌ Failed to update location:", error.message);
      return { success: false, error };
    }

    console.log("📍 Location update sent:", {
      riderId,
      latitude,
      longitude,
      time: new Date().toLocaleTimeString(),
      response: data,
    });

    return { success: true, data };
  } catch (err) {
    console.error("🚨 Unexpected error while updating location:", err);
    return { success: false, error: err };
  }
}

export async function updateRiderActiveMode(isOnline: boolean) {
  try {
    const { data, error: userError } = await supabase.auth.getUser();
    const user = data?.user; // <-- make sure we safely access user

    if (userError || !user) {
      console.error("❌ No logged-in user found", userError);
      return { success: false, error: userError || "No user session" };
    }

    const riderId = user.id;

    const { data: updatedData, error } = await supabase
      .from("riders_current_status")
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
}

/**
 * Fetch available delivery orders:
 * - not accepted by any driver
 * - still pending
 */
export async function fetchAvailableOrders(): Promise<{
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
}

export async function acceptDeliveryOrder(
  orderCode: string,
  driverLat: number,
  driverLong: number,
) {
  try {
    // 1️⃣ Get currently logged-in driver
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("❌ No logged-in driver found", userError);
      return { success: false, error: userError || "No user session" };
    }

    const driverId = user.id;
    const driverEmail = user.email;

    // 2️⃣ Update the delivery_orders table
    const { data, error } = await supabase
      .from("delivery_orders")
      .update({
        driver_id: driverId,
        status: "arriving_pickup",
        driver_initial_lat: driverLat,
        driver_initial_long: driverLong,
        modified_at: new Date().toISOString(),
      })
      .eq("order_code", orderCode)
      .eq("status", "pending")
      .select(); // Only allow accepting pending orders

    if (error) {
      console.error("❌ Failed to accept order:", error.message);
      return { success: false, error };
    }

    console.log("log of acceptDeliveryOrder", data);

    if (!data || data.length === 0) {
      console.warn("⚠️ Order not pending or does not exist");
      return { success: false, error: "Order not pending or does not exist" };
    }

    console.log("✅ Order accepted:", {
      orderCode,
      driverId,
      driverLat,
      driverLong,
      time: new Date().toLocaleTimeString(),
      response: data,
    });

    return { success: true, data };
  } catch (err) {
    console.error("🚨 Unexpected error while accepting order:", err);
    return { success: false, error: err };
  }
}

export async function getDeliveryOrderByCode(orderCode: string) {
  console.log("Fetching delivery order for code:", orderCode);
  try {
    if (!orderCode) {
      return {
        success: false,
        error: "orderCode is required",
      };
    }

    const { data, error } = await supabase
      .from("delivery_orders")
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
}

export async function getRiderCurrentDeliveries() {
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

    const { data, error } = await supabase
      .from("delivery_orders")
      .select("*")
      .eq("driver_id", driverId)
      .in("status", ["pending", "arriving_pickup", "in_transit"]); // active deliveries

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
    .from("delivery_orders")
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
          clientName: otherUser.username,
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

// Add this to your @/lib/supabase-functions file

/**
 * Unified function to verify pickup or dropoff codes
 * @param deliveryId - The delivery/order ID
 * @param code - The code to verify
 * @param type - Either "pickup" or "dropoff"
 * @returns Promise with success status and optional error message
 */
export const verifyDeliveryCode = async (
  deliveryId: string,
  code: string,
  type: "pickup" | "dropoff",
): Promise<{ success: boolean; error?: string }> => {
  try {
    // Determine which column to check based on type
    const codeColumn = type === "pickup" ? "pickup_code" : "dropoff_code";

    // Query the delivery and verify the code
    const { data, error } = await supabase
      .from("deliveries") // or whatever your table name is
      .select(codeColumn)
      .eq("id", deliveryId)
      .single();

    if (error) {
      console.error("Error fetching delivery:", error);
      return { success: false, error: "Failed to verify code" };
    }

    // Check if the code matches
    if (data[codeColumn] === code) {
      // Update the delivery status
      const newStatus = type === "pickup" ? "in_transit" : "completed";

      const { error: updateError } = await supabase
        .from("deliveries")
        .update({
          status: newStatus,
          ...(type === "pickup"
            ? { pickup_time: new Date().toISOString() }
            : { dropoff_time: new Date().toISOString() }),
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
