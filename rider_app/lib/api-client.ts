import Constants from "expo-constants";
import { supabase } from "./supabase";

// Set RUST_API_URL in the root .env (or EAS env). Must be https:// for iOS
// release builds — App Transport Security blocks plain http.
const API_BASE_URL = Constants.expoConfig?.extra?.rustApiUrl as
  | string
  | undefined;

function apiUrl(path: string) {
  if (!API_BASE_URL) throw new Error("RUST_API_URL is not configured");
  return `${API_BASE_URL.replace(/\/$/, "")}${path}`;
}

async function getAccessToken(): Promise<string> {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error("Not authenticated");
  return data.session.access_token;
}

// A 2xx with an empty or non-JSON body (e.g. Rust's .finish() or
// .body("...")) still succeeded, so it resolves to null instead of throwing
async function readJsonBody<T>(res: Response, path: string): Promise<T | null> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as T;
  } catch {
    console.warn(`API ${path} replied with non-JSON:`, text);
    return null;
  }
}

export async function apiGet<T>(
  path: string,
  signal?: AbortSignal,
): Promise<T | null> {
  const token = await getAccessToken();
  const res = await fetch(apiUrl(path), {
    headers: { Authorization: `Bearer ${token}` },
    signal,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return readJsonBody<T>(res, path);
}

export async function apiPost<T>(path: string, body: unknown): Promise<T | null> {
  const token = await getAccessToken();
  const res = await fetch(apiUrl(path), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return readJsonBody<T>(res, path);
}

// For endpoints whose reply body the app doesn't use (it may not be JSON)
export async function apiPostIgnoringBody(
  path: string,
  body: unknown,
): Promise<void> {
  const token = await getAccessToken();
  const res = await fetch(apiUrl(path), {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
}
