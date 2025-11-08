import { IMAGES } from "@/assets/assetsData";
import DestinationSearchModal from "@/components/DestinationSearchModal";
import RiderSearchModal from "@/components/RiderSearchModal";
import {
  calculateFare,
  generateRidersWithCoords,
  moveRiders,
} from "@/utils/mapUtils";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { SafeAreaView } from "react-native-safe-area-context";
import Constants from "expo-constants";

const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.googleMapsApiKey ?? "";

export default function MapScreen() {
  const [pickup, setPickup] = useState<any>(null);
  const [destination, setDestination] = useState<any>(null);
  const [activeField, setActiveField] = useState<"from" | "to" | null>(null);
  const [loading, setLoading] = useState(false);
  const [price, setPrice] = useState<number | null>(null);
  const [riders, setRiders] = useState<any[]>([]);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [packageImage, setPackageImage] = useState<any>(null);

  const [distance, setDistance] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  const mapRef = useRef<MapView>(null);

  // Load package image from AsyncStorage
  useEffect(() => {
    (async () => {
      const uri = await AsyncStorage.getItem("packageImage");
      if (uri) setPackageImage({ uri });
    })();
  }, []);

  // Generate riders near pickup
  useEffect(() => {
    const base = pickup?.coordinates || { latitude: 6.5244, longitude: 3.3792 };
    setRiders(generateRidersWithCoords(base));
  }, [pickup]);

  // Animate riders movement
  useEffect(() => {
    const interval = setInterval(() => {
      setRiders((prev) => moveRiders(prev));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Auto-zoom to pickup & destination
  useEffect(() => {
    const coords = [];
    if (pickup?.coordinates) coords.push(pickup.coordinates);
    if (destination?.coordinates) coords.push(destination.coordinates);

    if (coords.length && mapRef.current) {
      mapRef.current.fitToCoordinates(coords, {
        edgePadding: { top: 100, right: 100, bottom: 100, left: 100 },
        animated: true,
      });
    }
  }, [pickup, destination]);

  // Fare calculation
  useEffect(() => {
    const fetchFare = async () => {
      if (!pickup || !destination) return;
      setLoading(true);
      setPrice(null);
      const fare = await calculateFare();
      setPrice(fare);
      setLoading(false);
    };
    fetchFare();
  }, [pickup, destination]);

  return (
    <View className="flex-1 bg-gray-900">
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={{
          latitude: 6.5244,
          longitude: 3.3792,
          latitudeDelta: 0.2,
          longitudeDelta: 0.2,
        }}
      >
        {/* Markers */}
        {pickup?.coordinates && (
          <Marker
            coordinate={pickup.coordinates}
            title="Pickup"
            pinColor="green"
          />
        )}
        {destination?.coordinates && (
          <Marker
            coordinate={destination.coordinates}
            title="Destination"
            pinColor="red"
          />
        )}

        {riders.map((rider) => (
          <Marker.Animated
            key={rider.id}
            coordinate={rider.coordinate}
            anchor={{ x: 0.5, y: 0.5 }}
            title={rider.name}
          >
            <Image
              source={IMAGES.map_rider}
              style={{
                width: 40,
                height: 40,
                transform: [{ rotate: `${rider.heading}deg` }],
              }}
              resizeMode="contain"
            />
          </Marker.Animated>
        ))}

        {/* 🚗 Directions line (only when both points are set) */}
        {pickup?.coordinates && destination?.coordinates && (
          <MapViewDirections
            origin={pickup.coordinates}
            destination={destination.coordinates}
            apikey={GOOGLE_MAPS_API_KEY}
            strokeWidth={5}
            strokeColor="#F97316"
            optimizeWaypoints={true}
            onReady={(result) => {
              setDistance(result.distance);
              setDuration(result.duration);
              mapRef.current?.fitToCoordinates(result.coordinates, {
                edgePadding: { top: 50, right: 50, bottom: 300, left: 50 },
                animated: true,
              });
            }}
            onError={(err) => console.warn("Directions error:", err)}
          />
        )}
      </MapView>

      {/* 🧭 Bottom Panel */}
      <SafeAreaView className="absolute bottom-0 left-0 right-0 px-4">
        <View className="bg-[#3C3C43] rounded-t-2xl px-4 py-3">
          <Text className="text-lg font-semibold text-white text-center">
            Select Pickup & Destination
          </Text>
        </View>

        <View className="bg-[#3C3C43] p-4 rounded-b-2xl">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              className="flex-1 bg-white rounded-xl px-4 py-3"
              onPress={() => setActiveField("from")}
            >
              <Text className="text-gray-700 font-medium">
                {pickup ? pickup.name : "Set Pickup"}
              </Text>
            </TouchableOpacity>

            <Ionicons name="arrow-forward" size={20} color="#9CA3AF" />

            <TouchableOpacity
              className="flex-1 bg-white rounded-xl px-4 py-3"
              onPress={() => setActiveField("to")}
            >
              <Text className="text-gray-700 font-medium">
                {destination ? destination.name : "Set Destination"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Book Ride */}
          <TouchableOpacity
            className={`mt-4 rounded-xl px-4 py-4 bg-orange-500 ${
              pickup && destination && !loading ? "" : "opacity-50"
            }`}
            disabled={!pickup || !destination || loading}
            onPress={() => setShowSearchModal(true)}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : price ? (
              <Text className="text-white text-center font-semibold text-lg">
                Confirm Delivery – ₦{price}
              </Text>
            ) : (
              <Text className="text-white text-center font-semibold text-lg">
                Book Ride
              </Text>
            )}
          </TouchableOpacity>

          {/* Distance info */}
          {pickup && destination && (
            <View className="mt-2 items-center">
              <Text className="text-gray-300 text-sm">
                Distance: {distance.toFixed(1)} km | ETA: {Math.ceil(duration)}{" "}
                min
              </Text>
            </View>
          )}
        </View>
      </SafeAreaView>

      {/* Modals */}
      <DestinationSearchModal
        visible={!!activeField}
        field={activeField || "from"}
        onClose={() => setActiveField(null)}
        onSelect={(location) => {
          if (activeField === "from") setPickup(location);
          if (activeField === "to") setDestination(location);
        }}
      />

      <RiderSearchModal
        visible={showSearchModal}
        onClose={() => setShowSearchModal(false)}
        price={price}
        packageImage={packageImage || IMAGES.riderWithPizza}
        pickup={pickup}
        destination={destination}
        riders={riders}
      />
    </View>
  );
}
