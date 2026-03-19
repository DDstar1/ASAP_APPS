import { RiderOrder } from "@/utils/my_types";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import Constant from "expo-constants";
import mitt from "mitt";

console.log(Constant);
const { SUPABASE_URL, SUPABASE_SERVICE_KEY }: any = Constant.expoConfig.extra;

export type SupabaseEventMap = {
  delivery_insert: RiderOrder;
  delivery_update: RiderOrder;
  delivery_delete: RiderOrder;
  message_insert: any; // replace with actual message type
  message_update: any; // replace with actual message type
};

// Create typed emitter
export const supabaseEvents = mitt<SupabaseEventMap>();

const supabaseUrl = SUPABASE_URL;
const supabasePublishableKey = SUPABASE_SERVICE_KEY;
export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
