import { create } from "zustand";
import { getOfferDetails, type OfferDetails } from "@/lib/ride-offers";

type RideOfferState = {
  // The offer currently on screen; the rest wait in `queue`
  offer: OfferDetails | null;
  queue: string[];

  showOffer: (offerId: string) => Promise<void>;
  dismissOffer: (offerId?: string) => void;
};

const isOpen = (o: OfferDetails) =>
  o.status === "pending" && new Date(o.expires_at).getTime() > Date.now();

export const useRideOfferStore = create<RideOfferState>((set, get) => ({
  offer: null,
  queue: [],

  // Safe to call repeatedly with the same id (push tap + realtime + launch check)
  showOffer: async (offerId) => {
    const { offer, queue } = get();
    if (offer?.offer_id === offerId || queue.includes(offerId)) return;

    if (offer) {
      set({ queue: [...queue, offerId] });
      return;
    }

    const details = await getOfferDetails(offerId);
    if (!details || !isOpen(details)) return;
    if (get().offer) {
      set({ queue: [...get().queue, offerId] });
      return;
    }
    set({ offer: details });
  },

  // Close the given offer (or the current one) and show the next open one
  dismissOffer: (offerId) => {
    const { offer, queue } = get();
    if (offerId && offer?.offer_id !== offerId) {
      set({ queue: queue.filter((id) => id !== offerId) });
      return;
    }

    set({ offer: null });
    const [next, ...rest] = queue;
    set({ queue: rest });
    if (next) get().showOffer(next);
  },
}));
