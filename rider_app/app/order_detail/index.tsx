import { useAcceptedDeliveryStore } from "@/store/useAcceptedDeliveriesStore";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as Location from "expo-location";
import { router, useLocalSearchParams, useNavigation } from "expo-router";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.02;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

const ORANGE = "#FF7518";
const PICKUP_GREEN = "#34D399";
const RIDER_BLUE = "#2563EB";

const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.googleMapsApiKey ?? "";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-1 bg-[#1C1C21] rounded-2xl px-4 py-3">
      <Text className="text-gray-400 text-xs">{label}</Text>
      <Text className="text-white text-lg font-bold mt-0.5">{value}</Text>
    </View>
  );
}

export default function DeliveryTrackingScreen() {
  const navigation = useNavigation();
  const { orderCode } = useLocalSearchParams();

  const mapRef = useRef<MapView>(null);

  // The deliveries list already holds the order row with its coordinates
  const order = useAcceptedDeliveryStore((s) =>
    s.AcceptedDeliveries.find((d) => d.order_code === String(orderCode)),
  );
  const loading = useAcceptedDeliveryStore((s) => s.loading);
  const [rider, setRider] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);

  /* ---------------- HEADER TITLE ---------------- */
  useLayoutEffect(() => {
    if (!orderCode) return;

    navigation.setOptions({
      headerTitle: `Delivery ${orderCode}`,
    });
  }, [navigation, orderCode]);

  // Opened from a push before the list loaded
  useEffect(() => {
    if (!order) useAcceptedDeliveryStore.getState().fetchAcceptedDeliveries();
  }, []);

  /* ---------------- GET RIDER LOCATION ---------------- */
  // The map shows without it; the rider's marker and route join once it's in
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") return;

        const location =
          (await Location.getLastKnownPositionAsync({ maxAge: 60_000 })) ??
          (await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          }));

        setRider({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } catch (e) {
        console.warn("Couldn't get rider location:", e);
      }
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
  if (!order || !pickup || !destination) {
    return (
      <View className="flex-1 justify-center items-center bg-[#1C1C21] px-8">
        {loading ? (
          <>
            <ActivityIndicator size="large" color={ORANGE} />
            <Text className="mt-2 text-gray-300">Loading delivery details...</Text>
          </>
        ) : (
          <>
            <Text className="text-white text-lg font-semibold text-center">
              Couldn't find this delivery
            </Text>
            <TouchableOpacity
              onPress={() => router.back()}
              className="mt-5 h-12 px-6 rounded-full bg-[#FF7518] justify-center"
            >
              <Text className="text-white font-bold">Back to Orders</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    );
  }

  /* ---------------- RENDER ---------------- */
  return (
    <View className="flex-1 bg-[#1C1C21]">
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        showsUserLocation
        followsUserLocation
        initialRegion={{
          latitude: pickup.latitude,
          longitude: pickup.longitude,
          latitudeDelta: LATITUDE_DELTA,
          longitudeDelta: LONGITUDE_DELTA,
        }}
      >
        <Marker coordinate={pickup} title="Pickup Point" pinColor={PICKUP_GREEN} />
        <Marker coordinate={destination} title="Destination" pinColor={ORANGE} />
        {rider && <Marker coordinate={rider} title="You" pinColor={RIDER_BLUE} />}

        {rider && (
          <MapViewDirections
            origin={rider}
            waypoints={[pickup]}
            destination={destination}
            apikey={GOOGLE_MAPS_API_KEY}
            strokeWidth={5}
            strokeColor={ORANGE}
            onReady={(result) => {
              setDistance(result.distance);
              setDuration(result.duration);

              mapRef.current?.fitToCoordinates(result.coordinates, {
                edgePadding: { top: 50, right: 50, bottom: 420, left: 50 },
              });
            }}
            onError={(err) => console.warn("Directions error:", err)}
          />
        )}
      </MapView>

      <SafeAreaView
        edges={["bottom"]}
        className="mt-auto bg-black rounded-t-3xl border-t-2 border-[#FF7518] px-5 pt-3 pb-2"
        style={{ elevation: 12 }}
      >
        <View className="self-center w-10 h-1 rounded-full bg-[#3A3A3F] mb-4" />

        <View className="flex-row items-center gap-4">
          <View className="w-24 h-24 rounded-2xl border-2 border-[#FF7518] bg-black overflow-hidden">
            {order.image_url ? (
              <Image
                source={{ uri: order.image_url }}
                className="w-full h-full"
                resizeMode="cover"
              />
            ) : null}
          </View>
          <View className="flex-1">
            <Text className="text-white text-xl font-bold" numberOfLines={1}>
              #{order.order_code}
            </Text>
            <Text className="text-gray-400 text-sm mt-0.5" numberOfLines={2}>
              {order.package_type || "Package"}
            </Text>
          </View>
        </View>

        <View className="h-px bg-white/10 mt-5" />

        {/* Pick up / Drop off, joined by a dotted line */}
        <View className="mt-4">
          <View className="flex-row gap-3">
            <View className="items-center w-4 pt-1.5">
              <View className="w-3 h-3 rounded-full" style={{ backgroundColor: PICKUP_GREEN }} />
              <View className="flex-1 border-l border-dashed border-gray-500 my-1" />
            </View>
            <View className="flex-1 pb-4">
              <Text className="text-gray-400 text-xs">Pick up</Text>
              <Text className="text-white text-base" numberOfLines={2}>
                {order.pickup_name || "Not specified"}
              </Text>
            </View>
          </View>

          <View className="flex-row gap-3">
            <View className="items-center w-4 pt-1.5">
              <View className="w-3 h-3 rounded-full" style={{ backgroundColor: ORANGE }} />
            </View>
            <View className="flex-1">
              <Text className="text-gray-400 text-xs">Drop off</Text>
              <Text className="text-white text-base" numberOfLines={2}>
                {order.dropoff_name || "Not specified"}
              </Text>
            </View>
          </View>
        </View>

        <View className="flex-row gap-3 mt-5">
          <Stat label="Distance" value={distance ? `${distance.toFixed(1)} km` : "—"} />
          <Stat label="ETA" value={duration ? `${Math.ceil(duration)} min` : "—"} />
        </View>

        <View className="flex-row items-center gap-4 mt-4">
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="location" size={14} color={RIDER_BLUE} />
            <Text className="text-gray-400 text-xs">You</Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="location" size={14} color={PICKUP_GREEN} />
            <Text className="text-gray-400 text-xs">Pick up</Text>
          </View>
          <View className="flex-row items-center gap-1.5">
            <Ionicons name="location" size={14} color={ORANGE} />
            <Text className="text-gray-400 text-xs">Drop off</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-5 h-12 rounded-full bg-[#FF7518] justify-center items-center"
          accessibilityRole="button"
        >
          <Text className="text-white font-bold text-base">Back to Orders</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}
