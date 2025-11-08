import { router } from "expo-router";
import { supabase } from "./supabase";
import { makeRedirectUri } from "expo-auth-session";
import { useUserStore } from "@/store/useUserStore";
import * as FileSystem from "expo-file-system";
import { createUploadTask } from "expo-file-system/legacy";

import type { SavedLocationInput } from "@/utils/my_types";

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

export async function addPackageImage(url) {
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
