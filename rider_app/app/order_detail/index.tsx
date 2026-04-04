import { IMAGES } from "@/assets/assetsData";
import { getDeliveryOrderByCode } from "@/lib/supabase-app-functions";
import Constants from "expo-constants";
import * as Location from "expo-location";
import { useLocalSearchParams, useNavigation } from "expo-router";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { SafeAreaView } from "react-native-safe-area-context";
import { MY_ICONS } from "@/assets/assetsData";

const { width, height } = Dimensions.get("window");
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.02;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.googleMapsApiKey ?? "";

export default function DeliveryTrackingScreen() {
  const navigation = useNavigation();
  const { orderCode } = useLocalSearchParams();

  const mapRef = useRef<MapView>(null);

  const [order, setOrder] = useState<any | null>(null);
  const [rider, setRider] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);

  /* ---------------- HEADER TITLE ---------------- */
  useLayoutEffect(() => {
    if (!orderCode) return;

    navigation.setOptions({
      headerTitle: `Delivery ${orderCode}`,
    });
  }, [navigation, orderCode]);

  /* ---------------- FETCH ORDER ---------------- */
  useEffect(() => {
    if (!orderCode) return;

    (async () => {
      setLoading(true);

      const res = await getDeliveryOrderByCode(String(orderCode));

      console.log("Fetched order details:", res);

      if (res.success) {
        setOrder(res.data);
      } else {
        console.error("Order fetch failed:", res.error);
      }

      setLoading(false);
    })();
  }, [orderCode]);

  /* ---------------- GET RIDER LOCATION ---------------- */
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.warn("Location permission denied");
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      setRider({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    })();
  }, []);

  /* ---------------- COORDINATES ---------------- */
  const pickup = order
    ? {
        latitude: Number(order.pickup_lat),
        longitude: Number(order.pickup_long),
      }
    : null;

  const destination = order
    ? {
        latitude: Number(order.dropoff_lat),
        longitude: Number(order.dropoff_long),
      }
    : null;

  /* ---------------- LOADING STATE ---------------- */
  if (loading || !order || !rider || !pickup || !destination) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-900">
        <ActivityIndicator size="large" color="#F97316" />
        <Text className="mt-2 text-gray-300">Loading delivery details...</Text>
      </View>
    );
  }

  /* ---------------- RENDER ---------------- */
  return (
    <SafeAreaView edges={["bottom"]} className="flex-1">
      <MapView
        ref={mapRef}
        style={{ flex: 1, marginBottom: -40 }}
        showsUserLocation
        followsUserLocation
        initialRegion={{
          latitude: pickup.latitude,
          longitude: pickup.longitude,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        }}
      >
        {/* Markers */}
        <Marker coordinate={pickup} title="Pickup Point" pinColor="#34D399" />
        <Marker
          coordinate={destination}
          title="Destination"
          pinColor="#FB923C"
        />
        <Marker coordinate={rider} title="You" pinColor="#2563EB" />

        {/* Route */}
        <MapViewDirections
          origin={rider}
          waypoints={[pickup]}
          destination={destination}
          apikey={GOOGLE_MAPS_API_KEY}
          strokeWidth={5}
          strokeColor="#F97316"
          onReady={(result) => {
            setDistance(result.distance);
            setDuration(result.duration);

            mapRef.current?.fitToCoordinates(result.coordinates, {
              edgePadding: { top: 50, right: 50, bottom: 250, left: 50 },
            });
          }}
          onError={(err) => console.warn("Directions error:", err)}
        />
      </MapView>

      {/* Bottom Sheet */}
      <View
        className="w-full p-4"
        style={{
          backgroundColor: "#3C3C43",
          borderTopLeftRadius: 40,
          borderTopRightRadius: 40,
          shadowColor: "#000",
          shadowOpacity: 0.2,
          shadowRadius: 5,
        }}
      >
        <View className="flex-row justify-between items-center">
          {/* Left Section - Order Details */}
          <View className="flex-1">
            <Text className="text-white text-lg font-bold mb-2">
              Order #{order.order_code}
            </Text>

            <Text className="text-gray-400 mb-1">
              Distance: {distance.toFixed(1)} km
            </Text>

            <Text className="text-gray-400 mb-3">
              ETA: {Math.ceil(duration)} min
            </Text>

            <TouchableOpacity
              className="py-2 px-4 rounded-lg self-start"
              style={{ backgroundColor: "#F97316" }}
            >
              <Text className="text-white font-bold">Back to Orders</Text>
            </TouchableOpacity>
          </View>

          {/* Right Section - Package Image */}
          <Image
            source={{ uri: order?.image_url || IMAGES.no_package_image }}
            className="w-32 h-32 rounded-2xl"
            resizeMode="contain"
          />

          {/* Center Section - Legend */}
          <View className="flex-col  gap-2 mr-4">
            {/* Pickup Location */}
            <View className="flex-row items-center gap-2">
              {MY_ICONS.map_marker("#34D399", 28)}
              <Text className="text-gray-300 text-xs">Pickup</Text>
            </View>
            {/* Your Location */}
            <View className="flex-row items-center gap-2">
              {MY_ICONS.map_marker("#2563EB", 28)}
              <Text className="text-gray-300 text-xs">You</Text>
            </View>

            {/* Dropoff Location */}
            <View className="flex-row items-center gap-2">
              {MY_ICONS.map_marker("#FB923C", 28)}

              <Text className="text-gray-300 text-xs">Dropoff</Text>
            </View>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}
