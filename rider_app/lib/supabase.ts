import { RiderOrder } from "@/utils/my_types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import Constant from "expo-constants";
import mitt from "mitt";

const { SUPABASE_URL, SUPABASE_ANON_KEY }: any = Constant.expoConfig?.extra ?? {};

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY must be set in the root .env");
}

export type SupabaseEventMap = {
  delivery_insert: RiderOrder;
  delivery_update: RiderOrder;
  delivery_delete: RiderOrder;
  message_insert: any; // replace with actual message type
  message_update: any; // replace with actual message type
  ride_offer_insert: RideOfferRow;
  ride_offer_update: RideOfferRow;
};

export type RideOfferRow = {
  id: string;
  order_id: number;
  driver_id: string;
  status: "pending" | "accepted" | "rejected" | "expired";
  created_at: string;
  expires_at: string;
  responded_at: string | null;
};

// Create typed emitter
export const supabaseEvents = mitt<SupabaseEventMap>();

const supabaseUrl = SUPABASE_URL;
const supabaseAnonKey = SUPABASE_ANON_KEY;
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
