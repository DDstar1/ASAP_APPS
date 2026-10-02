import { RefObject } from "react";
import MapView from "react-native-maps";
import type { Database } from "@/lib/supabase_types";

type SavedLocationInput = {
  name: string;
  latitude: number;
  longitude: number;
};

type RiderDistanceInfo = {
  id: string;
  username: string;
  latitude: number;
  longitude: number;
  distanceKm: number | null;
  etaMin: number | null;
};

type Coordinates = {
  latitude: number;
  longitude: number;
};

type FitAllParams = {
  mapRef: RefObject<MapView>;
  pickup?: Coordinates;
  destination?: Coordinates;
  selectedRider?: Coordinates;
};

// The app_delivery_orders row as the database returns it
type DeliveryOrder = Database["public"]["Tables"]["app_delivery_orders"]["Row"];

type MessageRow = {
  id: number;
  created_at: string;
  sender_id: string;
  receiver_id: string;
  delivery_order_id: number;
  message: string;
  is_read: boolean;
};

type UnreadCountIncrement = {
  order_id: string;
};

export type {
  Coordinates,
  DeliveryOrder,
  FitAllParams,
  MessageRow,
  RiderDistanceInfo,
  SavedLocationInput,
  UnreadCountIncrement,
};
