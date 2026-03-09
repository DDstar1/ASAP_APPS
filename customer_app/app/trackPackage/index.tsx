import { useLocalSearchParams } from "expo-router";
import React, { useEffect, useState, useRef, useMemo } from "react";
import {
  View,
  ActivityIndicator,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
} from "react-native";
import MapView, { Marker, Polyline, LatLng } from "react-native-maps";
import { useLayoutEffect } from "react";
import { useNavigation } from "@react-navigation/native";
import { useCustomerDeliveryStore } from "@/store/useCustomerDeliveriesStore";
import { IMAGES, MY_ICONS } from "@/assets/assetsData";
import { SafeAreaView } from "react-native-safe-area-context";
import { openOrderChat } from "@/utils/my_utils";

export default function RiderTrackingScreen() {
  const { order_id } = useLocalSearchParams();
  const mapRef = useRef<MapView>(null);

  const [destination, setDestination] = useState<LatLng | null>(null);
  const [pickupLocation, setPickupLocation] = useState<LatLng | null>(null);
  const [showDetails, setShowDetails] = useState(true);

  const navigation = useNavigation();

  const {
    AllDeliveries,
    loading: StoreLoading,
    fetchAllDeliveries,
  } = useCustomerDeliveryStore();

  const order =
    AllDeliveries.find((d) => String(d.id) === String(order_id)) ?? null;

  console.log(order);

  useEffect(() => {
    if (AllDeliveries.length === 0) {
      fetchAllDeliveries();
    }
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: order?.order_code ? `Track ${order.order_code}` : "Track Package",
    });
  }, [navigation, order?.order_code]);

  useEffect(() => {
    if (!order) {
      setPickupLocation(null);
      setDestination(null);
      return;
    }

    const parseCoord = (value: any) => {
      const num = Number(value);
      return isNaN(num) ? null : num;
    };

    const pickupLat = parseCoord(order.pickup_lat);
    const pickupLong = parseCoord(order.pickup_long);
    const dropoffLat = parseCoord(order.dropoff_lat);
    const dropoffLong = parseCoord(order.dropoff_long);

    if (pickupLat != null && pickupLong != null) {
      setPickupLocation({ latitude: pickupLat, longitude: pickupLong });
    }

    if (dropoffLat != null && dropoffLong != null) {
      setDestination({ latitude: dropoffLat, longitude: dropoffLong });
    }
  }, [order]);

  /*
  CLEAN DRIVER WAYPOINTS
  */

  const driverRoute: LatLng[] = useMemo(() => {
    if (!order?.drivers_waypoints) return [];

    try {
      let waypoints = order.drivers_waypoints;

      if (typeof waypoints === "string") {
        waypoints = JSON.parse(waypoints);
      }

      const sorted = [...waypoints].sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
      );

      const cleaned: LatLng[] = [];
      let last: LatLng | null = null;

      for (const wp of sorted) {
        const lat = Number(wp.lat);
        const lng = Number(wp.lng);

        if (isNaN(lat) || isNaN(lng)) continue;

        const point = {
          latitude: lat,
          longitude: lng,
        };

        if (
          !last ||
          Math.abs(last.latitude - point.latitude) > 0.00001 ||
          Math.abs(last.longitude - point.longitude) > 0.00001
        ) {
          cleaned.push(point);
          last = point;
        }
      }

      const MAX_POINTS = 500;

      console.log(cleaned.slice(-MAX_POINTS));

      return cleaned.slice(-MAX_POINTS);
    } catch (err) {
      console.log("Waypoint parse error", err);
      return [];
    }
  }, [order]);

  /*
  FIT MAP
  */

  useEffect(() => {
    if (!mapRef.current || StoreLoading) return;

    const coordinates: LatLng[] = [];

    if (pickupLocation) coordinates.push(pickupLocation);
    if (destination) coordinates.push(destination);

    if (driverRoute.length > 0) {
      coordinates.push(...driverRoute);
    }

    if (coordinates.length > 0) {
      setTimeout(() => {
        mapRef.current?.fitToCoordinates(coordinates, {
          edgePadding: { top: 100, right: 50, bottom: 350, left: 50 },
          animated: true,
        });
      }, 500);
    }
  }, [pickupLocation, destination, driverRoute, StoreLoading]);

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

  if (StoreLoading || !pickupLocation || !destination) {
    return (
      <View className="flex-1 justify-center items-center bg-white">
        <ActivityIndicator size="large" color="#FF6600" />
        <Text className="mt-4 text-gray-600">
          {StoreLoading ? "Loading delivery..." : "Coordinates unavailable"}
        </Text>
      </View>
    );
  }

  const driverLocation =
    driverRoute.length > 0 ? driverRoute[driverRoute.length - 1] : null;

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
        {/* Pickup */}
        <Marker
          coordinate={pickupLocation}
          title="Pickup Location"
          description={order?.pickup_name || "Pickup Point"}
          pinColor="green"
        />

        {/* Dropoff */}
        <Marker
          coordinate={destination}
          title="Destination"
          description={order?.dropoff_name || "Drop-off Point"}
          pinColor="red"
        />

        {/* Driver Route */}
        {driverRoute.length > 1 && (
          <Polyline
            coordinates={driverRoute}
            strokeColor="#0066FF"
            strokeWidth={4}
          />
        )}

        {/* Driver Current Location */}
        {driverLocation && (
          <Marker coordinate={driverLocation} anchor={{ x: 0.5, y: 0.5 }}>
            <Image
              source={IMAGES.map_rider}
              style={{ width: 40, height: 40 }}
              resizeMode="contain"
            />
          </Marker>
        )}
      </MapView>

      {/* Bottom Card */}

      <SafeAreaView
        edges={["bottom"]}
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl shadow-lg"
      >
        <TouchableOpacity
          onPress={() => setShowDetails(!showDetails)}
          className="px-6 py-4 border-b border-gray-200"
        >
          <View className="flex-row items-center justify-between">
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
          <ScrollView className="px-6 py-4">
            <View className="flex flex-col gap-6">
              {/* Pickup */}
              <View>
                <View className="flex-row items-center mb-1">
                  {MY_ICONS.marker("green", 25)}
                  <Text className="text-sm font-semibold text-gray-500 ml-1">
                    Pickup Location
                  </Text>
                </View>

                <Text className="text-base text-gray-800">
                  {order?.pickup_name || "Not specified"}
                </Text>
              </View>

              {/* Dropoff */}
              <View>
                <View className="flex-row items-center mb-1">
                  {MY_ICONS.marker("red", 25)}
                  <Text className="text-sm font-semibold text-gray-500 ml-1">
                    Drop-off Location
                  </Text>
                </View>

                <Text className="text-base text-gray-800">
                  {order?.dropoff_name || "Not specified"}
                </Text>
              </View>

              {/* Driver */}
              {order?.driver_id && (
                <View className="flex-row items-center justify-around">
                  {/* Left side: driver info */}
                  <View className="flex-row items-center">
                    <Image
                      source={{ uri: "https://i.pravatar.cc/100" }} // dummy avatar
                      className="w-10 h-10 rounded-full mr-3"
                    />

                    <View>
                      <Text className="text-sm font-semibold text-gray-500">
                        Driver Assigned
                      </Text>

                      <Text className="text-base text-gray-800">
                        Driver ID: {order.driver_id.substring(0, 8)}...
                      </Text>
                    </View>
                  </View>

                  {/* Right side: actions */}
                  <View className="flex-row items-center gap-5">
                    <TouchableOpacity className="bg-green-500 p-2 rounded-full">
                      {MY_ICONS.phone("white", 25)}
                    </TouchableOpacity>

                    <TouchableOpacity
                      onPress={() => openOrderChat(order.id)}
                      className="bg-blue-500 p-2 rounded-full"
                    >
                      {MY_ICONS.message("white", 25)}
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Accepted */}
              <View className="border-t border-gray-200 pt-4">
                <Text className="text-xs text-gray-500">
                  Accepted:{" "}
                  {order?.delivery_accepted_time
                    ? new Date(order.delivery_accepted_time).toLocaleString()
                    : "Not yet accepted"}
                </Text>
              </View>
            </View>
          </ScrollView>
        )}
      </SafeAreaView>
    </View>
  );
}
