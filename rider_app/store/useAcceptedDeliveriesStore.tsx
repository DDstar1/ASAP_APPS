// store/deliveryStore.ts
import { create } from "zustand";
import { getRiderAcceptedDeliveries } from "@/lib/supabase-app-functions";

interface AcceptedDelivery {
  id: number;
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

interface AcceptedDeliveryStore {
  AcceptedDeliveries: AcceptedDelivery[];
  loading: boolean;
  error: string | null;

  fetchAcceptedDeliveries: () => Promise<void>;
  addAcceptedDelivery: (delivery: AcceptedDelivery) => void;
  updateDeliveryStatus: (orderId: number, newStatus: string) => void;
  removeAcceptedDelivery: (orderId: number) => void; // ✅ added
  clearDeliveries: () => void;
}

export const useAcceptedDeliveryStore = create<AcceptedDeliveryStore>(
  (set) => ({
    AcceptedDeliveries: [],
    loading: false,
    error: null,

    fetchAcceptedDeliveries: async () => {
      set({ loading: true, error: null });
      try {
        const response = await getRiderAcceptedDeliveries();
        if (response.success) {
          set({
            AcceptedDeliveries: response.data,
            loading: false,
          });
          //console.log("✅ Deliveries fetched:", response.data);
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

    addAcceptedDelivery: (delivery) =>
      set((state) => {
        const normalized = {
          ...delivery,
          delivery_accepted_time:
            typeof delivery.delivery_accepted_time === "string"
              ? new Date(delivery.delivery_accepted_time).getTime()
              : (delivery.delivery_accepted_time ?? Date.now()),
        };

        return {
          AcceptedDeliveries: state.AcceptedDeliveries.some(
            (d) => d.id === normalized.id,
          )
            ? state.AcceptedDeliveries.map((d) =>
                d.id === normalized.id ? { ...d, ...normalized } : d,
              )
            : [normalized, ...state.AcceptedDeliveries],
        };
      }),

    updateDeliveryStatus: (orderId, newStatus) => {
      console.log(`Updating delivery ${orderId} to status: ${newStatus}`);
      set((state) => ({
        AcceptedDeliveries: state.AcceptedDeliveries.map((delivery) =>
          delivery.id === orderId
            ? { ...delivery, status: newStatus }
            : delivery,
        ),
      }));
    },

    // ✅ NEW METHOD
    removeAcceptedDelivery: (orderId) => {
      set((state) => ({
        AcceptedDeliveries: state.AcceptedDeliveries.filter(
          (delivery) => delivery.id !== orderId,
        ),
      }));
    },

    clearDeliveries: () => {
      set({ AcceptedDeliveries: [], error: null });
    },
  }),
);
