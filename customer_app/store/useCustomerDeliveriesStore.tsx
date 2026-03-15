// store/deliveryStore.ts
import {
  deleteDeliveryByOrderCode,
  getAllClientDeliveries,
} from "@/lib/supabase-app-functions";
import { create } from "zustand";

interface CustomerDelivery {
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
  initial_waypoints?: { latitude: number; longitude: number }[];
}

interface CustomerDeliveryStore {
  AllDeliveries: CustomerDelivery[];
  loading: boolean;
  error: string | null;

  fetchAllDeliveries: () => Promise<void>;
  addNewDelivery: (delivery: CustomerDelivery) => void;
  updateDeliveryStatus: (orderId: string, newStatus: string) => void;
  removeDelivery: (orderId: string) => void; // ✅ added
  clearDeliveries: () => void;
}

export const useCustomerDeliveryStore = create<CustomerDeliveryStore>(
  (set) => ({
    AllDeliveries: [],
    loading: false,
    error: null,

    fetchAllDeliveries: async () => {
      set({ loading: true, error: null });
      try {
        const response = await getAllClientDeliveries();
        if (response.success) {
          set({
            AllDeliveries: response.data,
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

    addNewDelivery: (delivery) =>
      set((state) => {
        const normalized = {
          ...delivery,
          delivery_accepted_time:
            typeof delivery.delivery_accepted_time === "string"
              ? new Date(delivery.delivery_accepted_time).getTime()
              : (delivery.delivery_accepted_time ?? Date.now()),
        };

        return {
          AllDeliveries: state.AllDeliveries.some((d) => d.id === normalized.id)
            ? state.AllDeliveries.map((d) =>
                d.id === normalized.id ? { ...d, ...normalized } : d,
              )
            : [normalized, ...state.AllDeliveries],
        };
      }),

    updateDeliveryStatus: (orderId, newStatus) => {
      set((state) => ({
        AllDeliveries: state.AllDeliveries.map((delivery) =>
          delivery.id === orderId
            ? { ...delivery, status: newStatus }
            : delivery,
        ),
      }));
    },

    // ✅ NEW METHOD — remove delivery by order_code from backend first
    removeDelivery: async (order_code: string) => {
      try {
        const result = await deleteDeliveryByOrderCode(order_code);

        if (result.success) {
          // Only remove from store if backend deletion succeeded
          set((state) => ({
            AllDeliveries: state.AllDeliveries.filter(
              (delivery) => delivery.order_code !== order_code,
            ),
          }));
          console.log(`✅ Delivery removed from store: ${order_code}`);
        } else {
          console.error(
            `❌ Failed to delete delivery: ${order_code}`,
            result.error,
          );
        }
      } catch (err: any) {
        console.error(
          `❌ Error deleting delivery: ${order_code}`,
          err.message || err,
        );
      }
    },

    clearDeliveries: () => {
      set({ AllDeliveries: [], error: null });
    },
  }),
);
