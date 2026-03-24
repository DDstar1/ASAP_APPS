// store/deliveryStore.ts
import { supabaseEvents } from "@/lib/supabase";
import {
  deleteDeliveryByOrderCode,
  getAllClientDeliveries,
  getUnreadMessageCounts,
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
  driver_id?: string;
  pickup_code?: string;
  dropoff_code?: string;
}

interface CustomerDeliveryStore {
  AllDeliveries: CustomerDelivery[];
  loading: boolean;
  error: string | null;
  unreadCounts: Record<string, number>;

  fetchAllDeliveries: () => Promise<void>;
  fetchUnreadCounts: (orderIds: string[]) => Promise<void>;
  setUnreadCount: (orderId: string, count: number) => void;
  incrementUnreadCount: (orderId: string) => void;
  addNewDelivery: (delivery: CustomerDelivery) => void;
  updateDeliveryStatus: (orderId: string, newStatus: string) => void;
  removeDelivery: (orderId: string) => void;
  clearDeliveries: () => void;
}

export const useCustomerDeliveryStore = create<CustomerDeliveryStore>(
  (set, get) => {
    // 1️⃣ Core state + functions
    const state: CustomerDeliveryStore = {
      AllDeliveries: [],
      loading: false,
      error: null,
      unreadCounts: {},

      fetchAllDeliveries: async () => {
        set({ loading: true, error: null });
        try {
          const response = await getAllClientDeliveries();
          if (response.success) {
            set({ AllDeliveries: response.data, loading: false });

            // Auto-fetch unread counts after deliveries load
            const orderIds = response.data.map((d: CustomerDelivery) => d.id);
            get().fetchUnreadCounts(orderIds);
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

      fetchUnreadCounts: async (orderIds: string[]) => {
        try {
          const counts = await Promise.all(
            orderIds.map(async (id) => ({
              id,
              count: await getUnreadMessageCounts(),
            })),
          );

          const map: Record<string, number> = {};
          counts.forEach(({ id, count }) => (map[id] = count));

          set({ unreadCounts: map });
        } catch (err) {
          console.error("Failed to fetch unread counts:", err);
        }
      },

      // Set a specific order's unread count (e.g. zero it out when chat opens)
      setUnreadCount: (orderId: string, count: number) => {
        set((state) => ({
          unreadCounts: { ...state.unreadCounts, [orderId]: count },
        }));
      },

      // Increment a specific order's unread count by 1 (called by realtime)
      incrementUnreadCount: (orderId: string) => {
        set((state) => ({
          unreadCounts: {
            ...state.unreadCounts,
            [orderId]: (state.unreadCounts[orderId] ?? 0) + 1,
          },
        }));
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
            AllDeliveries: state.AllDeliveries.some(
              (d) => d.id === normalized.id,
            )
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

      removeDelivery: async (order_code: string) => {
        try {
          const result = await deleteDeliveryByOrderCode(order_code);

          if (result.success) {
            set((state) => {
              const removedOrder = state.AllDeliveries.find(
                (d) => d.order_code === order_code,
              );
              const newUnreadCounts = { ...state.unreadCounts };
              if (removedOrder) delete newUnreadCounts[removedOrder.id];

              return {
                AllDeliveries: state.AllDeliveries.filter(
                  (delivery) => delivery.order_code !== order_code,
                ),
                unreadCounts: newUnreadCounts,
              };
            });
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
        set({ AllDeliveries: [], error: null, unreadCounts: {} });
      },
    };

    // 2️⃣ Auto-subscribe to realtime events
    if (!(state as any)._realtimeSubscribed) {
      supabaseEvents.on("delivery_update", (order) => {
        get().updateDeliveryStatus(order.id, order.status);
      });

      supabaseEvents.on("delivery_insert", (order) => {
        get().addNewDelivery(order);
      });

      supabaseEvents.on(
        "unread_count_increment",
        ({ order_id }: { order_id: string }) => {
          console.log(`📩 Incrementing unread count for order ${order_id}`);
          get().incrementUnreadCount(order_id);
        },
      );

      (state as any)._realtimeSubscribed = true;
    }

    return state;
  },
);
