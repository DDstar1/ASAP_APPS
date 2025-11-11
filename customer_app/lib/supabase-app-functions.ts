import { router } from "expo-router";
import { supabase } from "./supabase";
import { makeRedirectUri } from "expo-auth-session";
import { useUserStore } from "@/store/useUserStore";
import * as FileSystem from "expo-file-system";
import { createUploadTask } from "expo-file-system/legacy";

import type {
  Coordinates,
  DeliveryOrder,
  RiderDistanceInfo,
  SavedLocationInput,
} from "@/utils/my_types";
import { getDistanceAndETAByRoad } from "@/utils/mapUtils";
import {
  checkOrderExists,
  deleteOldPendingDeliveries,
  hasDriverAcceptedDelivery,
} from "./supabase-utils";

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
  fileUri,
  folder = "package_images",
  setUploadProgress
) {
  try {
    // 1️⃣ Create signed upload URL from Supabase
    const fileName = `${Date.now()}.jpg`;
    const filePath = `${fileName}`;

    const { data, error } = await supabase.storage
      .from(folder)
      .createSignedUploadUrl(filePath);

    if (error) throw error;

    const signedUrl = data.signedUrl;

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
      }
    );

    // 3️⃣ Await task result
    const result = await uploadTask.uploadAsync();

    if (result.status !== 200)
      throw new Error("Upload failed with status " + result.status);

    console.log("✅ Uploaded via signed URL:", result);

    // 4️⃣ Get public URL
    const { data: publicData } = supabase.storage
      .from("images")
      .getPublicUrl(filePath);

    return publicData.publicUrl;
  } catch (err) {
    console.error("❌ Upload failed:", err.message);
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
  props: Partial<DeliveryOrder> & { order_code: string }
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
        order_code
      );
      if (accepted) return { status: "accepted", driver_id };

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
export async function getDeliveryOrderByCode(order_code: string) {
  try {
    const { data, error } = await supabase
      .from("delivery_orders")
      .select(
        `
        order_code,
        driver_id,
        pickup_lat,
        pickup_long,
        dropoff_lat,
        dropoff_long,
        driver_package_current_lat,
        driver_package_current_long,
        driver_initial_lat,
        driver_initial_long,
        image_url,
        status
      `
      )
      .eq("order_code", order_code)
      .maybeSingle();

    if (error) throw error;
    return { data, error: null };
  } catch (err: any) {
    console.error("❌ Error fetching delivery order:", err.message);
    return { data: null, error: err };
  }
}
