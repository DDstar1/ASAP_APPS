import {
  DeliveryOrder,
  MessageRow,
  UnreadCountIncrement,
} from "@/utils/my_types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import Constant from "expo-constants";
import mitt from "mitt";
import { Database } from "./supabase_types";

const { SUPABASE_URL, SUPABASE_ANON_KEY }: any = Constant.expoConfig?.extra ?? {};

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY must be set in the root .env");
}

export type SupabaseEventMap = {
  delivery_insert: DeliveryOrder;
  delivery_update: DeliveryOrder;
  delivery_delete: DeliveryOrder;
  waypoint_insert: any;
  message_insert: any; // replace with actual message type
  message_update: any; // replace with actual message type
  unread_count_increment: UnreadCountIncrement;
};

// Create typed emitter
export const supabaseEvents = mitt<SupabaseEventMap>();

const supabaseUrl = SUPABASE_URL;
const supabaseAnonKey = SUPABASE_ANON_KEY;
export const supabase = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);
