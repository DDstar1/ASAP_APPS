import { create } from "zustand";
import { supabaseEvents } from "@/lib/supabase";
import { RiderOrder } from "@/utils/my_types";
import { fetchAvailableOrders } from "@/lib/supabase-functions";

interface RiderOrdersState {
  availableOrders: RiderOrder[];
  loading: boolean;
  error: string | null;

  fetchAvailableOrders: () => Promise<void>;
  addOrder: (order: RiderOrder) => void;
  updateOrder: (order: RiderOrder) => void;
  removeOrder: (orderId: number) => void;
}

export const useRiderOrdersStore = create<RiderOrdersState>((set, get) => {
  // 1️⃣ Core state + functions
  const state: RiderOrdersState = {
    availableOrders: [],
    loading: false,
    error: null,

    fetchAvailableOrders: async () => {
      set({ loading: true, error: null });
      const result = await fetchAvailableOrders();

      if (!result.success) {
        console.error("Fetch available rider orders error:", result.error);
        set({
          error: result.error?.toString() || "Unknown error",
          loading: false,
        });
        return;
      }

      set({ availableOrders: result.data ?? [], loading: false });
    },

    addOrder: (order: RiderOrder) =>
      set((s) => ({ availableOrders: [...s.availableOrders, order] })),

    updateOrder: (order: RiderOrder) =>
      set((s) => ({
        availableOrders: s.availableOrders.map((o) =>
          o.id === order.id ? order : o,
        ),
      })),

    removeOrder: (orderId: number) =>
      set((s) => ({
        availableOrders: s.availableOrders.filter((o) => o.id !== orderId),
      })),
  };

  // Auto-subscribe safely — **use the state object, not get()**
  if (!(state as any)._realtimeSubscribed) {
    supabaseEvents.on("delivery_insert", (order) => state.addOrder(order));
    supabaseEvents.on("delivery_update", (order: RiderOrder) => {
      if (order.status !== "pending") {
        get().removeOrder(order.id);
      } else {
        const currentOrders = get().availableOrders; // ✅ latest state
        const exists = currentOrders.some((o) => o.id === order.id);

        if (exists) {
          get().updateOrder(order); // update the existing order
        } else {
          get().addOrder(order); // add new order
        }

        console.log("Total available orders:", get().availableOrders.length);
      }
    });
    supabaseEvents.on("delivery_delete", (order) =>
      state.removeOrder(order.id),
    );

    (state as any)._realtimeSubscribed = true;
  }

  return state;
});
