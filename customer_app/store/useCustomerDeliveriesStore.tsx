// store/deliveryStore.ts
import { supabaseEvents } from "@/lib/supabase";
import {
  deleteDeliveryByOrderCode,
  getAllClientDeliveries,
  getUnreadMessageCounts,
} from "@/lib/supabase-app-functions";
import { DeliveryOrder } from "@/utils/my_types";
import { create } from "zustand";

// Rows arrive with a numeric id; callers often have it as a route string
type OrderId = number | string;
const sameId = (a: OrderId, b: OrderId) => String(a) === String(b);

export interface CustomerDelivery {
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
  dropoff_time?: string | null;
  cancelled_at?: string | null;
  created_at?: string;
  package_type?: string | null;
  is_pickup_code_authenticated?: boolean | null;
  initial_waypoints?: { latitude: number; longitude: number }[];
  driver_id?: string;
  pickup_code?: string;
  dropoff_code?: string;
  payment_reference?: string | null; // Korapay; null on Telegram and older orders
}

interface CustomerDeliveryStore {
  AllDeliveries: CustomerDelivery[];
  loading: boolean;
  error: string | null;
  unreadCounts: Record<string, number>;

  fetchAllDeliveries: () => Promise<void>;
  fetchUnreadCounts: (orderIds: OrderId[]) => Promise<void>;
  setUnreadCount: (orderId: OrderId, count: number) => void;
  incrementUnreadCount: (orderId: OrderId) => void;
  addNewDelivery: (delivery: CustomerDelivery | DeliveryOrder) => void;
  updateDeliveryStatus: (orderId: OrderId, newStatus: string) => void;
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
            // Rows carry delivery_accepted_time as an ISO string (or null);
            // the store keeps it as epoch ms
            const deliveries = response.data.map((d: any) => ({
              ...d,
              delivery_accepted_time:
                typeof d.delivery_accepted_time === "string"
                  ? new Date(d.delivery_accepted_time).getTime()
                  : (d.delivery_accepted_time ?? 0),
            })) as CustomerDelivery[];
            set({ AllDeliveries: deliveries, loading: false });

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

      fetchUnreadCounts: async (orderIds: OrderId[]) => {
        try {
          // One query returns every unread count keyed by order id
          const counts = await getUnreadMessageCounts();

          const map: Record<string, number> = {};
          orderIds.forEach((id) => (map[String(id)] = counts[Number(id)] ?? 0));

          set({ unreadCounts: map });
        } catch (err) {
          console.error("Failed to fetch unread counts:", err);
        }
      },

      // Set a specific order's unread count (e.g. zero it out when chat opens)
      setUnreadCount: (orderId: OrderId, count: number) => {
        set((state) => ({
          unreadCounts: { ...state.unreadCounts, [String(orderId)]: count },
        }));
      },

      // Increment a specific order's unread count by 1 (called by realtime)
      incrementUnreadCount: (orderId: OrderId) => {
        const key = String(orderId);
        set((state) => ({
          unreadCounts: {
            ...state.unreadCounts,
            [key]: (state.unreadCounts[key] ?? 0) + 1,
          },
        }));
      },

      addNewDelivery: (delivery) =>
        set((state) => {
          const accepted = delivery.delivery_accepted_time;
          // DB rows carry nulls where CustomerDelivery has optionals
          const normalized = {
            ...delivery,
            id: Number(delivery.id),
            delivery_accepted_time:
              typeof accepted === "string"
                ? new Date(accepted).getTime()
                : (accepted ?? Date.now()),
          } as CustomerDelivery;

          return {
            AllDeliveries: state.AllDeliveries.some((d) =>
              sameId(d.id, normalized.id),
            )
              ? state.AllDeliveries.map((d) =>
                  sameId(d.id, normalized.id) ? { ...d, ...normalized } : d,
                )
              : [normalized, ...state.AllDeliveries],
          };
        }),

      updateDeliveryStatus: (orderId, newStatus) => {
        set((state) => ({
          AllDeliveries: state.AllDeliveries.map((delivery) =>
            sameId(delivery.id, orderId)
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

      supabaseEvents.on("unread_count_increment", ({ order_id }) => {
        console.log(`📩 Incrementing unread count for order ${order_id}`);
        get().incrementUnreadCount(order_id);
      });

      (state as any)._realtimeSubscribed = true;
    }

    return state;
  },
);
