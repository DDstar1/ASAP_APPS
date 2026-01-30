type SavedLocationInput = {
  name: string;
  latitude: number;
  longitude: number;
};

type RiderOrder = {
  id: number;
  created_at: string;

  pickup_lat: number | null;
  pickup_long: number | null;
  pickup_name: string | null;

  dropoff_lat: number | null;
  dropoff_long: number | null;
  dropoff_name: string | null;

  status: "pending" | string;
  order_code: string;

  image_url: string | null;
  waypoints: any[] | null;
};

interface RiderOrdersState {
  availableOrders: RiderOrder[];
  loading: boolean;
  error: string | null;

  fetchAvailableOrders: () => Promise<void>;
}

export type { RiderOrder, RiderOrdersState, SavedLocationInput };
