// Photos sent in chat. They live in the private chat_images bucket under
// "<order_id>/", which only the order's customer and driver can read or
// write; messages store the object path and the app signs it to display.
import { createUploadTask } from "expo-file-system/legacy";
import { supabase } from "./supabase";

const BUCKET = "chat_images";
const SIGNED_URL_TTL_S = 60 * 60;

/** Uploads a local photo for this order's chat and returns its object path. */
export async function uploadChatImage(
  orderId: number,
  fileUri: string,
  onProgress?: (progress: number) => void,
): Promise<string> {
  const path = `${orderId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(path);
  if (error) throw error;

  const task = createUploadTask(
    data.signedUrl,
    fileUri,
    { httpMethod: "PUT", headers: { "Content-Type": "image/jpeg" } },
    ({ totalBytesSent, totalBytesExpectedToSend }) => {
      if (totalBytesExpectedToSend)
        onProgress?.(totalBytesSent / totalBytesExpectedToSend);
    },
  );

  const result = await task.uploadAsync();
  if (!result || result.status !== 200) {
    throw new Error(`Upload failed with status ${result?.status}`);
  }
  return path;
}

/** Signed URLs for the given object paths, keyed by path. */
export async function getChatImageUrls(
  paths: string[],
): Promise<Record<string, string>> {
  if (!paths.length) return {};
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(paths, SIGNED_URL_TTL_S);
  if (error) {
    console.error("❌ Couldn't sign chat images:", error.message);
    return {};
  }
  const urls: Record<string, string> = {};
  for (const item of data) {
    if (item.path && item.signedUrl) urls[item.path] = item.signedUrl;
  }
  return urls;
}
