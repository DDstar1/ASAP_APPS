import { create } from "zustand";
import {
  getOfferDetails,
  isAwaitingRider,
  type OfferDetails,
} from "@/lib/ride-offers";

type RideOfferState = {
  // The offer whose card is on screen; the rest show as pins on the radar
  offer: OfferDetails | null;
  others: OfferDetails[];

  showOffer: (offerId: string) => Promise<void>;
  dismissOffer: (offerId?: string) => void;
  focusOffer: (offerId: string) => void;
};

const isOpen = (o: OfferDetails) =>
  isAwaitingRider(o) && new Date(o.expires_at).getTime() > Date.now();

// Push tap, realtime and the launch check can ask for the same offer at once
const loading = new Set<string>();

export const useRideOfferStore = create<RideOfferState>((set, get) => ({
  offer: null,
  others: [],

  showOffer: async (offerId) => {
    const { offer, others } = get();
    if (
      offer?.offer_id === offerId ||
      others.some((o) => o.offer_id === offerId) ||
      loading.has(offerId)
    )
      return;

    loading.add(offerId);
    const details = await getOfferDetails(offerId);
    loading.delete(offerId);
    if (!details || !isOpen(details)) return;

    if (get().offer) set({ others: [...get().others, details] });
    else set({ offer: details });
  },

  // Close the given offer (or the current one) and show the next open one
  dismissOffer: (offerId) => {
    const { offer, others } = get();
    if (offerId && offer?.offer_id !== offerId) {
      set({ others: others.filter((o) => o.offer_id !== offerId) });
      return;
    }
    const [next = null, ...rest] = others.filter(isOpen);
    set({ offer: next, others: rest });
  },

  focusOffer: (offerId) => {
    const { offer, others } = get();
    const target = others.find((o) => o.offer_id === offerId);
    if (!target) return;
    set({
      offer: target,
      others: [
        ...others.filter((o) => o.offer_id !== offerId),
        ...(offer ? [offer] : []),
      ],
    });
  },
}));
