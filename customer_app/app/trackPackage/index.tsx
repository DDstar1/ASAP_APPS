import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState, useRef } from "react";
import {
  Image,
  View,
  ActivityIndicator,
  Text,
  ScrollView,
  TouchableOpacity,
} from "react-native";
import MapView, { Marker, Polyline, LatLng } from "react-native-maps";
import { getDeliveryOrderById } from "@/lib/supabase-app-functions";
import { DeliveryOrder } from "@/utils/my_types";
import { useLayoutEffect } from "react";
import { useNavigation } from "@react-navigation/native";

export default function RiderTrackingScreen() {
  const { order_id } = useLocalSearchParams();
  const mapRef = useRef<MapView>(null);
  const [order, setOrder] = useState<DeliveryOrder | null>(null);
  const [destination, setDestination] = useState<LatLng | null>(null);
  const [pickupLocation, setPickupLocation] = useState<LatLng | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDetails, setShowDetails] = useState(true);
  const navigation = useNavigation();

  console.log("📦 Tracking order_id:", order_id);

  // After order is fetched, update header
  useLayoutEffect(() => {
    if (order?.order_code) {
      navigation.setOptions({
        title: `Track ${order.order_code}`,
      });
    } else {
      navigation.setOptions({
        title: "Track Package",
      });
    }
  }, [navigation, order]);

  // 🟢 Fetch order and initialize coordinates safely
  const fetchOrderData = async () => {
    try {
      console.log("🔄 Fetching delivery order for id:", order_id);
      const { data, error } = await getDeliveryOrderById(Number(order_id));
      console.log("📥 Fetch result:", { data, error });

      if (error) {
        console.error("❌ Error fetching order:", error);
        return;
      }

      if (!data) {
        console.warn("⚠️ No order found for order_id:", order_id);
        setOrder(null);
        setDestination(null);
        setPickupLocation(null);
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

      // Set pickup location
      const pickup = {
        latitude: parseCoord(data.pickup_lat),
        longitude: parseCoord(data.pickup_long),
      };

      if (pickup.latitude != null && pickup.longitude != null) {
        setPickupLocation(pickup);
        console.log("📍 Pickup location set:", pickup);
      } else {
        console.warn("⚠️ Pickup location missing or invalid.");
        setPickupLocation(null);
      }

      // Set destination
      const dest = {
        latitude: parseCoord(data.dropoff_lat),
        longitude: parseCoord(data.dropoff_long),
      };

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
    if (!order_id) return;

    setLoading(true);
    fetchOrderData().finally(() => setLoading(false));
  }, [order_id]);

  // 🗺️ Fit map to show pickup and destination when data loads
  useEffect(() => {
    if (!mapRef.current || loading) return;

    const allCoordinates: LatLng[] = [];

    if (pickupLocation) allCoordinates.push(pickupLocation);
    if (destination) allCoordinates.push(destination);

    if (allCoordinates.length > 0) {
      // Add a small delay to ensure map is fully rendered
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(allCoordinates, {
          edgePadding: {
            top: 100,
            right: 50,
            bottom: 350, // Extra padding for bottom sheet
            left: 50,
          },
          animated: true,
        });
      }, 500);
    }
  }, [pickupLocation, destination, loading]);

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-500";
      case "assigned":
        return "bg-blue-500";
      case "picked_up":
        return "bg-purple-500";
      case "in_transit":
        return "bg-orange-500";
      case "delivered":
        return "bg-green-500";
      case "cancelled":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };

  // 🛡️ Safety check before rendering Map
  if (loading || !pickupLocation || !destination) {
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
        ref={mapRef}
        style={{ flex: 1 }}
        showsUserLocation={false}
        followsUserLocation={false}
        initialRegion={{
          latitude: (pickupLocation.latitude + destination.latitude) / 2,
          longitude: (pickupLocation.longitude + destination.longitude) / 2,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        }}
      >
        {/* Pickup Location Marker */}
        <Marker
          coordinate={pickupLocation}
          title="Pickup Location"
          description={order?.pickup_name || "Pickup Point"}
          pinColor="blue"
        />

        {/* Destination Marker */}
        <Marker
          coordinate={destination}
          title="Destination"
          description={order?.dropoff_name || "Drop-off Point"}
          pinColor="green"
        />

        {/* Route Polyline - Straight line from pickup to destination */}
        <Polyline
          coordinates={[pickupLocation, destination]}
          strokeColor="#FF6600"
          strokeWidth={4}
          lineDashPattern={[10, 5]}
        />
      </MapView>

      {/* Order Details Card */}
      <View className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-lg">
        <TouchableOpacity
          onPress={() => setShowDetails(!showDetails)}
          className="px-6 py-4 border-b border-gray-200"
        >
          <View className="flex-1 justify-between flex-row items-center">
            <View
              className={`px-3 py-2 rounded-full ${getStatusColor(
                order?.status || "pending",
              )}`}
            >
              <Text className="text-white text-xs font-semibold uppercase">
                {order?.status || "Unknown"}
              </Text>
            </View>
            <Text className="text-lg font-bold text-gray-800">
              Order #{order?.order_code}
            </Text>
            <Text className="text-gray-500 text-2xl">
              {showDetails ? "▼" : "▲"}
            </Text>
          </View>
        </TouchableOpacity>

        {showDetails && (
          <ScrollView className="px-6 py-4 max-h-64">
            {/* Pickup Details */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-500 mb-1">
                📍 Pickup Location
              </Text>
              <Text className="text-base text-gray-800">
                {order?.pickup_name || "Not specified"}
              </Text>
              <Text className="text-xs text-gray-500">
                {pickupLocation
                  ? `${pickupLocation.latitude.toFixed(6)}, ${pickupLocation.longitude.toFixed(6)}`
                  : "No coordinates"}
              </Text>
            </View>

            {/* Dropoff Details */}
            <View className="mb-4">
              <Text className="text-sm font-semibold text-gray-500 mb-1">
                🏁 Drop-off Location
              </Text>
              <Text className="text-base text-gray-800">
                {order?.dropoff_name || "Not specified"}
              </Text>
              <Text className="text-xs text-gray-500">
                {destination
                  ? `${destination.latitude.toFixed(6)}, ${destination.longitude.toFixed(6)}`
                  : "No coordinates"}
              </Text>
            </View>

            {/* Driver Info */}
            {order?.driver_id && (
              <View className="mb-4">
                <Text className="text-sm font-semibold text-gray-500 mb-1">
                  🚴 Driver Assigned
                </Text>
                <Text className="text-base text-gray-800">
                  Driver ID: {order.driver_id.substring(0, 8)}...
                </Text>
              </View>
            )}

            {/* Timestamps */}
            <View className="border-t border-gray-200 pt-4">
              <Text className="text-xs text-gray-500">
                Created: {new Date(order?.created_at || "").toLocaleString()}
              </Text>
              <Text className="text-xs text-gray-500 mt-1">
                Last Updated:{" "}
                {new Date(order?.modified_at || "").toLocaleString()}
              </Text>
            </View>
          </ScrollView>
        )}
      </View>
    </View>
  );
}
