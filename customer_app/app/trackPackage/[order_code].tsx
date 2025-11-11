import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
import { Image, View, ActivityIndicator, Text } from "react-native";
import MapView, { Marker, Polyline, LatLng } from "react-native-maps";
import { getDeliveryOrderByCode } from "@/lib/supabase-app-functions";

export default function RiderTrackingScreen() {
  const { order_code } = useLocalSearchParams();
  const [order, setOrder] = useState<any>(null);
  const [riderLocation, setRiderLocation] = useState<LatLng | null>(null);
  const [destination, setDestination] = useState<LatLng | null>(null);
  const [loading, setLoading] = useState(true);

  console.log("📦 Tracking order_code:", order_code);

  // 🟢 Fetch order and initialize coordinates safely
  const fetchOrderData = async () => {
    try {
      console.log("🔄 Fetching delivery order for code:", order_code);
      const { data, error } = await getDeliveryOrderByCode(
        order_code as string
      );

      if (error) {
        console.error("❌ Error fetching order:", error);
        return;
      }

      if (!data) {
        console.warn("⚠️ No order found for order_code:", order_code);
        setOrder(null);
        setRiderLocation(null);
        setDestination(null);
        return;
      }

      console.log("✅ Order data fetched:", data);
      setOrder(data);

      // Convert all coordinates to numbers safely
      const parseCoord = (value: any) => {
        const num = Number(value);
        if (isNaN(num)) console.warn("⚠️ Invalid coordinate value:", value);
        return isNaN(num) ? null : num;
      };

      const currentPosition = {
        latitude:
          parseCoord(data.driver_package_current_lat) ??
          parseCoord(data.driver_initial_lat) ??
          parseCoord(data.pickup_lat),
        longitude:
          parseCoord(data.driver_package_current_long) ??
          parseCoord(data.driver_initial_long) ??
          parseCoord(data.pickup_long),
      };

      const dest = {
        latitude: parseCoord(data.dropoff_lat),
        longitude: parseCoord(data.dropoff_long),
      };

      // Only set if valid numbers
      if (
        currentPosition.latitude != null &&
        currentPosition.longitude != null
      ) {
        setRiderLocation(currentPosition);
        console.log("📍 Rider location set:", currentPosition);
      } else {
        console.warn("⚠️ Rider location missing or invalid.");
        setRiderLocation(null);
      }

      if (dest.latitude != null && dest.longitude != null) {
        setDestination(dest);
        console.log("🏁 Destination set:", dest);
      } else {
        console.warn("⚠️ Destination coordinates missing or invalid.");
        setDestination(null);
      }
    } catch (err: any) {
      console.error("❌ Unexpected error fetching order:", err.message);
    }
  };

  // 🚀 Initial fetch
  useEffect(() => {
    if (!order_code) return;

    setLoading(true);
    fetchOrderData().finally(() => setLoading(false));
  }, [order_code]);

  // 🔄 Poll for live updates
  useEffect(() => {
    if (!order_code) return;
    const interval = setInterval(fetchOrderData, 4000);
    return () => clearInterval(interval);
  }, [order_code]);

  // 🛡️ Safety check before rendering Map
  if (loading || !riderLocation || !destination) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#FF6600" />
        <Text className="mt-4 text-gray-600">Loading delivery...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <MapView
        style={{ flex: 1 }}
        initialRegion={{
          latitude: destination.latitude,
          longitude: destination.longitude,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {/* Rider Marker */}
        <Marker coordinate={riderLocation} title="Rider">
          <Image
            source={{
              uri:
                order.image_url ||
                "https://cdn-icons-png.flaticon.com/512/684/684908.png",
            }}
            style={{ width: 40, height: 40 }}
          />
        </Marker>

        {/* Destination Marker */}
        <Marker coordinate={destination} title="Destination" pinColor="green" />

        {/* Path between Rider and Destination */}
        <Polyline
          coordinates={[riderLocation, destination]}
          strokeColor="orange"
          strokeWidth={4}
        />
      </MapView>
    </View>
  );
}
