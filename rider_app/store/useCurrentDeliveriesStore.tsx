// store/deliveryStore.ts
import { create } from "zustand";
import { getRiderCurrentDeliveries } from "@/lib/supabase-functions";

interface CurrentDelivery {
  id: string;
  order_code: string;
  status: string;
  pickup_lat: number;
  pickup_long: number;
  pickup_name: string;
  dropoff_lat: number;
  dropoff_long: number;
  dropoff_name: string;
  image_url?: string;
  statusColor?: string;
  delivery_accepted_time: number;
}

interface CurrentDeliveryStore {
  currentDeliveries: CurrentDelivery[];
  loading: boolean;
  error: string | null;

  fetchCurrentDeliveries: () => Promise<void>;
  addCurrentDelivery: (delivery: CurrentDelivery) => void;
  updateDeliveryStatus: (orderId: string, newStatus: string) => void;
  clearDeliveries: () => void;
}

export const useCurrentDeliveryStore = create<CurrentDeliveryStore>((set) => ({
  currentDeliveries: [],
  loading: false,
  error: null,

  fetchCurrentDeliveries: async () => {
    set({ loading: true, error: null });
    try {
      const response = await getRiderCurrentDeliveries();
      if (response.success) {
        set({
          currentDeliveries: response.data,
          loading: false,
        });
        console.log("✅ Deliveries fetched:", response.data);
      } else {
        set({
          error: response.error || "Failed to fetch deliveries",
          loading: false,
        });
      }
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Unknown error",
        loading: false,
      });
    }
  },

  addCurrentDelivery: (delivery) =>
    set((state) => {
      const normalized = {
        ...delivery,
        delivery_accepted_time:
          typeof delivery.delivery_accepted_time === "string"
            ? new Date(delivery.delivery_accepted_time).getTime()
            : (delivery.delivery_accepted_time ?? Date.now()),
      };

      return {
        currentDeliveries: state.currentDeliveries.some(
          (d) => d.id === normalized.id,
        )
          ? state.currentDeliveries.map((d) =>
              d.id === normalized.id ? { ...d, ...normalized } : d,
            )
          : [normalized, ...state.currentDeliveries],
      };
    }),

  updateDeliveryStatus: (orderId, newStatus) => {
    set((state) => ({
      currentDeliveries: state.currentDeliveries.map((delivery) =>
        delivery.id === orderId ? { ...delivery, status: newStatus } : delivery,
      ),
    }));
  },

  clearDeliveries: () => {
    set({ currentDeliveries: [], error: null });
  },
}));
