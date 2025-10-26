import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import Constant from "expo-constants";

console.log(Constant);
const { SUPABASE_URL, SUPABASE_SERVICE_KEY } = Constant.expoConfig.extra;

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
