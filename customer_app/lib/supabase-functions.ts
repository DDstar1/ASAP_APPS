import { router } from "expo-router";
import { supabase } from "./supabase";
import { makeRedirectUri } from "expo-auth-session";
import { useUserStore } from "@/store/useUserStore";
import * as FileSystem from "expo-file-system";
import { createUploadTask } from "expo-file-system/legacy";

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
