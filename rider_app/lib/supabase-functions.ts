import { router } from "expo-router";
import { supabase } from "./supabase";
import { makeRedirectUri } from "expo-auth-session";
import { useUserStore } from "@/store/useUserStore";

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
  username: string
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
