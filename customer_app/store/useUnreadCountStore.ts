import { create } from "zustand";
import { supabaseEvents } from "@/lib/supabase";
import { getUnreadMessageCounts } from "@/lib/supabase-app-functions";

type UnreadCounts = Record<number, number>;

type UnreadCountStore = {
  counts: UnreadCounts;
  isInitialized: boolean;

  fetchCounts: () => Promise<void>;
  clearCount: (orderId: number) => void;
};

export const useUnreadCountStore = create<UnreadCountStore>((set, get) => {
  const state: UnreadCountStore = {
    counts: {},
    isInitialized: false,

    fetchCounts: async () => {
      const counts = await getUnreadMessageCounts();
      set({ counts });
    },

    clearCount: (orderId: number) => {
      set((s) => ({ counts: { ...s.counts, [orderId]: 0 } }));
    },
  };

  // Auto-subscribe to message events
  if (!(state as any)._realtimeSubscribed) {
    supabaseEvents.on("message_insert", (_newMessage: any) => {
      get().fetchCounts();
    });

    supabaseEvents.on("message_update", (_updatedMessage: any) => {
      get().fetchCounts();
    });

    (state as any)._realtimeSubscribed = true;
  }

  // Fetch initial counts as soon as store is created
  state.fetchCounts();

  return state;
});
