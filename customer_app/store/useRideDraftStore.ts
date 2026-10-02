import { create } from "zustand";
import type { ItemDetails, RideType } from "@/lib/ride-request";

// What the customer has chosen so far in the map booking flow
type RideDraftState = {
  itemType: string | null;
  items: ItemDetails[];
  rideType: RideType | null;
  setItemType: (itemType: string) => void;
  setItems: (items: ItemDetails[]) => void;
  setImageUrl: (imageUrl: string | null) => void;
  setRideType: (rideType: RideType) => void;
  reset: () => void;
};

export const useRideDraftStore = create<RideDraftState>((set) => ({
  itemType: null,
  items: [],
  rideType: null,
  setItemType: (itemType) => set({ itemType }),
  setItems: (items) => set({ items }),
  setImageUrl: (image_url) =>
    set((s) => ({ items: s.items.map((item) => ({ ...item, image_url })) })),
  setRideType: (rideType) => set({ rideType }),
  reset: () => set({ itemType: null, items: [], rideType: null }),
}));
