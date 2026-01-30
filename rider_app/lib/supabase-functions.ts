import { useUserStore } from "@/store/useUserStore";
import { RiderOrder } from "@/utils/my_types";
import { makeRedirectUri } from "expo-auth-session";
import { router } from "expo-router";
import { supabase } from "./supabase";

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
      .select(
        `
        id,
        created_at,
        pickup_lat,
        pickup_long,
        pickup_name,
        dropoff_lat,
        dropoff_long,
        dropoff_name,
        status,
        order_code,
        image_url,
        waypoints
      `,
      )
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
        status: "accepted",
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
  try {
    if (!orderCode) {
      return {
        success: false,
        error: "orderCode is required",
      };
    }

    const { data, error } = await supabase
      .from("delivery_orders")
      .select(
        `
        id,
        created_at,
        client_id,
        image_url,
        pickup_lat,
        pickup_long,
        pickup_name,
        dropoff_lat,
        dropoff_long,
        dropoff_name,
        driver_initial_lat,
        driver_initial_long,
        driver_package_current_lat,
        driver_package_current_long,
        status,
        order_code,
        driver_id,
        modified_at,
        waypoints
      `,
      )
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
      .in("status", ["pending", "accepted", "in_transit"]); // active deliveries

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
    client:custom_users (
      username,
      phone
    )
  `,
    )
    .eq("id", orderId)
    .limit(1)
    .single();

  console.log("log of getOrderClientInfo", data);

  if (error) {
    console.error("Error fetching client info:", error);
    return null;
  }

  return {
    name: (data?.client as any)?.username ?? "Unknown",
    phone: (data?.client as any)?.phone ?? null,
  };
};

export const getMessages = async (orderId: number) => {
  console.log("Fetching messages for order ID:", orderId);
  try {
    const { data, error } = await supabase
      .from("messages")
      .select("*") // select all columns
      .eq("delivery_order_id", orderId)
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
