import { RefObject } from "react";
import MapView from "react-native-maps";

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

type DeliveryOrder = {
  id: number;
  created_at: string; // ISO timestamp
  client_id: string; // UUID
  driver_id: string | null; // UUID
  status: "pending" | "in_transit" | "completed" | "cancelled"; // depending on your delivery_status enum
  order_code: string;
  dropoff_code: string;
  pickup_code: string;
  image_url?: string | null;
  modified_at: string;

  pickup_lat?: number | null;
  pickup_long?: number | null;
  pickup_name?: string | null;
  dropoff_lat?: number | null;
  dropoff_long?: number | null;
  dropoff_name?: string | null;

  driver_initial_lat?: number | null;
  driver_initial_long?: number | null;
  driver_package_current_lat?: number | null;
  driver_package_current_long?: number | null;

  package_type: string;
  package_description?: string | null;
};

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
