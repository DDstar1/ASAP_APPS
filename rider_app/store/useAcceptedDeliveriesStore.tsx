// store/deliveryStore.ts
import { create } from "zustand";
import {
  fetchOpenReturnOrderIds,
  getRiderAcceptedDeliveries,
} from "@/lib/supabase-app-functions";
import { supabaseEvents } from "@/lib/supabase";
import { RiderOrder } from "@/utils/my_types";

export interface AcceptedDelivery {
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
  customer_phone?: string | null; // Rust copies the ride request's user_phone_number
  pickup_code?: string | null; // Rust generates it on accept; the sender enters it
  payment_reference?: string | null; // links to back_trips.reference for the fee
}

// The store also holds finished orders (delivered / cancelled)
export const isActiveStatus = (status: string) =>
  status === "pending" ||
  status === "arriving_pickup" ||
  status === "in_transit";

// Rows carry delivery_accepted_time as an ISO string (or null); the store
// keeps it as epoch ms
const normalizeDelivery = (delivery: any): AcceptedDelivery => {
  const accepted = delivery.delivery_accepted_time;
  return {
    ...delivery,
    delivery_accepted_time:
      typeof accepted === "string"
        ? new Date(accepted).getTime()
        : (accepted ?? 0),
  };
};

interface AcceptedDeliveryStore {
  AcceptedDeliveries: AcceptedDelivery[];
  loading: boolean;
  error: string | null;
  // Cancelled-after-pickup orders still to be returned (app_returned 'returning')
  openReturnIds: number[];

  fetchAcceptedDeliveries: () => Promise<void>;
  fetchOpenReturns: () => Promise<void>;
  // Customer cancelled: move the order to Completed and pick up any new return
  refreshAfterCancel: () => Promise<void>;
  addAcceptedDelivery: (delivery: AcceptedDelivery) => void;
  updateDeliveryStatus: (orderId: number, newStatus: string) => void;
  removeAcceptedDelivery: (orderId: number) => void; // ✅ added
  clearDeliveries: () => void;
}

export const useAcceptedDeliveryStore = create<AcceptedDeliveryStore>(
  (set, get) => {
    // Status changes made server-side (Rust, sweeps, admin) come in
    // over realtime. Apply the new status right away, then refetch so
    // dropoff_time / cancelled_at are filled in. Only the columns in
    // getRiderAcceptedDeliveries are kept, so pickup/dropoff codes in the
    // realtime row never land in the store.
    supabaseEvents.on("delivery_update", (row: RiderOrder) => {
      const known = get().AcceptedDeliveries.find((d) => d.id === row.id);
      if (!known || known.status === row.status) return;
      // Cancellations are handled on the home screen (alert + refreshAfterCancel)
      if (row.status === "cancelled") return;
      get().updateDeliveryStatus(row.id, row.status);
      get().fetchAcceptedDeliveries();
    });

    return {
      AcceptedDeliveries: [],
      loading: false,
      error: null,
      openReturnIds: [],

      fetchOpenReturns: async () => {
        set({ openReturnIds: await fetchOpenReturnOrderIds() });
      },

      // Rust opens the return in the same transaction as the cancel, so the
      // app_returned row is already there when the cancel event arrives
      refreshAfterCancel: async () => {
        await Promise.all([
          get().fetchAcceptedDeliveries(),
          get().fetchOpenReturns(),
        ]);
      },

      fetchAcceptedDeliveries: async () => {
        set({ loading: true, error: null });
        try {
          const response = await getRiderAcceptedDeliveries();
          if (response.success) {
            set({
              AcceptedDeliveries: (response.data ?? []).map(normalizeDelivery),
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
        set({ AcceptedDeliveries: [], openReturnIds: [], error: null });
      },
    };
  },
);
