import { create } from "zustand";
import {
  getUserSettings,
  updateUserSetting,
} from "@/lib/supabase-app-functions";

type Settings = {
  delivery_alerts: boolean;
  promotions: boolean;
  sms_updates: boolean;
};

type SettingsState = {
  settings: Settings | null;
  loading: boolean;

  fetchSettings: (userId: string) => Promise<void>;
  updateSettings: (
    userId: string,
    newSettings: Partial<Settings>,
  ) => Promise<void>;
};

const DEFAULT_SETTINGS: Settings = {
  delivery_alerts: true,
  promotions: false,
  sms_updates: true,
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: null,
  loading: false,

  fetchSettings: async (userId: string) => {
    set({ loading: true });
    try {
      const { success, data } = await getUserSettings(userId);
      set({
        settings: success && data ? data : DEFAULT_SETTINGS,
        loading: false,
      });
    } catch (err: any) {
      console.error("❌ fetchSettings error:", err.message);
      set({ settings: DEFAULT_SETTINGS, loading: false });
    }
  },

  updateSettings: async (userId: string, newSettings: Partial<Settings>) => {
    const currentSettings = get().settings;
    if (!currentSettings) return;

    // Optimistic update
    const updatedSettings = { ...currentSettings, ...newSettings };
    set({ settings: updatedSettings });

    const { success, error } = await updateUserSetting(userId, newSettings);

    if (!success) {
      console.error("❌ updateSettings failed, rolling back:", error?.message);
      set({ settings: currentSettings }); // rollback
    }
  },
}));
