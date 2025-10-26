import React, { useEffect, useState, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Image,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import * as Location from "expo-location";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";
import { IMAGES } from "@/assets/assetsData";

const { width, height } = Dimensions.get("window");
const ASPECT_RATIO = width / height;
const LATITUDE_DELTA = 0.02;
const LONGITUDE_DELTA = LATITUDE_DELTA * ASPECT_RATIO;

const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.googleMapsApiKey ?? "";

export default function DeliveryTrackingScreen() {
  const pickup = { latitude: 6.7353, longitude: 6.132 }; // Ekpoma pickup
  const destination = { latitude: 6.7505, longitude: 6.1308 }; // Ekpoma destination

  const [rider, setRider] = useState(null);
  const [distance, setDistance] = useState(0);
  const [duration, setDuration] = useState(0);
  const mapRef = useRef<MapView>(null);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        console.warn("Permission to access location denied");
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

  if (!rider) {
    return (
      <View className="flex-1 justify-center items-center bg-gray-900">
        <ActivityIndicator size="large" color="#F97316" />
        <Text className="mt-2 text-gray-300">Fetching your location...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView edges={["bottom"]} className="flex-1 ">
      <MapView
        style={{ flex: 1, marginBottom: -40 }}
        ref={mapRef}
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

        {/* Directions */}
        <MapViewDirections
          strokeColor="#F97316"
          origin={rider}
          waypoints={[pickup]}
          destination={destination}
          apikey={GOOGLE_MAPS_API_KEY}
          strokeWidth={5}
          optimizeWaypoints={false}
          onReady={(result) => {
            setDistance(result.distance); // km
            setDuration(result.duration); // min

            // Fit map to route
            mapRef.current?.fitToCoordinates(result.coordinates, {
              edgePadding: { top: 50, right: 50, bottom: 250, left: 50 },
            });
          }}
          onError={(err) => console.warn("Directions error:", err)}
        />
      </MapView>

      {/* Bottom Sheet */}
      <View
        className="w-full p-4 rounded-t-2xl"
        style={{
          backgroundColor: "#3C3C43",
          shadowColor: "#000",
          shadowOpacity: 0.2,
          shadowRadius: 5,
          borderTopEndRadius: 40,
          borderTopStartRadius: 40,
        }}
      >
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-white text-lg font-bold mb-2">
              Order #A001
            </Text>

            <Text className="text-gray-400 mb-1">
              Distance: {distance.toFixed(1)} km
            </Text>
            <Text className="text-gray-400 mb-3">
              Estimated Time: {Math.ceil(duration)} min
            </Text>

            <TouchableOpacity
              className="py-2 px-4 rounded-lg items-center"
              style={{ backgroundColor: "#F97316" }}
            >
              <Text className="text-white font-bold">Back to Orders</Text>
            </TouchableOpacity>
          </View>

          <Image
            source={IMAGES.indomie_package}
            className="w-32 h-32 rounded-2xl bg-red-400 self-center mb-4"
            resizeMode="contain"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}
