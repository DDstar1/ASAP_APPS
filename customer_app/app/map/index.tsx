import { IMAGES } from "@/assets/assetsData";
import DeliveryButton from "@/components/DeliveryButton";
import DestinationSearchModal from "@/components/DestinationSearchModal";
import RiderAwaitingModal from "@/components/RiderAwaitingModal";
import { getActiveRiders } from "@/lib/supabase-app-functions";
import { calculateFare, fitAll } from "@/utils/mapUtils";
import { Coordinates, RiderDistanceInfo } from "@/utils/my_types";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Alert, Image, Text, TouchableOpacity, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { SafeAreaView } from "react-native-safe-area-context";
import { MY_ICONS } from "@/assets/assetsData";

const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.googleMapsApiKey ?? "";

// ----------------- MAIN COMPONENT -----------------
export default function MapScreen() {
  const [pickup, setPickup] = useState<any>(null);
  const [destination, setDestination] = useState<any>(null);
  const [activeField, setActiveField] = useState<"from" | "to" | null>(null);
  const [loading, setLoading] = useState(false);
  const [price, setPrice] = useState<number | null>(null);
  const [activeRiders, setRiders] = useState<RiderDistanceInfo[]>([]);
  const [showAwaitingModal, setShowAwaitingModal] = useState(false);
  const [closestRider, setClosestRider] = useState<any>(null);
  const [selectedRider, setSelectedRider] = useState<RiderDistanceInfo | null>(
    null,
  );
  const [hasMultipleRiders, setHasMultipleRiders] = useState(false);

  const [currentRiderIndex, setCurrentRiderIndex] = useState(0);
  const [distance, setDistance] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [waypoints, setWaypoints] = useState<Coordinates[] | null>(null);

  const mapRef = useRef<MapView>(null);
  const { packageImage, packageType, packageDescription } =
    useLocalSearchParams();

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

  useEffect(() => {
    setHasMultipleRiders(activeRiders.length > 1);
    console.log(activeRiders.length > 1);
  }, [activeRiders]);

  // ----------------- BUTTON HANDLERS -----------------
  const handleConfirmLocations = () => {
    if (!pickup || !destination) {
      Alert.alert("Missing Info", "Please select both pickup and destination.");
      return;
    }
    Alert.alert(
      "Locations Confirmed",
      "Now searching for nearby activeRiders...",
    );
  };

  const handleSearchRider = async () => {
    if (!pickup || !destination) return;
    setLoading(true);
    setPrice(null);

    try {
      const allAvailableRiders = await getActiveRiders(pickup.coordinates);
      console.log("Found activeRiders:", allAvailableRiders);

      if (!allAvailableRiders || allAvailableRiders.length === 0) {
        Alert.alert("No active riders nearby", "Please try again later.");
        setLoading(false);
        return;
      }

      // ✅ Store all riders
      setRiders(allAvailableRiders);

      // ✅ Select and store the first (closest) rider
      const closest = allAvailableRiders[0];
      setClosestRider(closest);
      setSelectedRider(closest);
      setCurrentRiderIndex(0);

      // Calculate fare
      const fare = await calculateFare();
      setPrice(fare);

      // Zoom the map to rider → pickup → destination
      if (mapRef.current) {
        mapRef.current.fitToCoordinates(
          [
            { latitude: closest.latitude, longitude: closest.longitude },
            pickup.coordinates,
            destination.coordinates,
          ],
          {
            edgePadding: { top: 100, right: 100, bottom: 100, left: 100 },
            animated: true,
          },
        );
      }
    } catch (err) {
      console.error("Error searching rider:", err);
      Alert.alert("Error", "Failed to search for riders.");
    } finally {
      setLoading(false);
    }
  };

  const handleCycleRider = () => {
    if (activeRiders.length === 0) return;
    if (activeRiders.length <= 1) return;

    const nextIndex = (currentRiderIndex + 1) % activeRiders.length;
    const newRider = activeRiders[nextIndex];

    setCurrentRiderIndex(nextIndex);
    setClosestRider(newRider);
    setSelectedRider(newRider); // ✅ update selected rider
  };

  const handleConfirmDelivery = () => {
    if (!closestRider) {
      Alert.alert("No rider selected", "Please choose a rider first.");
      return;
    }

    setShowAwaitingModal(true);
  };

  // ----------------- RENDER -----------------
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
        {/* Pickup & Destination */}
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

        {/* Riders */}
        {selectedRider && (
          <Marker.Animated
            key={selectedRider.id}
            coordinate={{
              latitude: selectedRider.latitude,
              longitude: selectedRider.longitude,
            }}
            anchor={{ x: 0.5, y: 0.5 }}
            title={selectedRider.username}
          >
            <Image
              source={IMAGES.map_rider}
              style={{
                width: 40,
                height: 40,
                opacity: 1, // fully visible since it's the selected rider
              }}
              resizeMode="contain"
            />
          </Marker.Animated>
        )}

        {/* Directions line */}
        {pickup?.coordinates && destination?.coordinates && (
          <MapViewDirections
            origin={
              selectedRider
                ? {
                    latitude: selectedRider.latitude,
                    longitude: selectedRider.longitude,
                  } // 👈 rider → pickup → destination path
                : pickup.coordinates // 👈 normal pickup → destination path
            }
            destination={destination.coordinates}
            waypoints={selectedRider ? [pickup.coordinates] : []} // include pickup only if rider is selected
            apikey={GOOGLE_MAPS_API_KEY}
            strokeWidth={5}
            strokeColor="#F97316"
            //optimizeWaypoints
            onReady={(result) => {
              setDistance(result.distance);
              setDuration(result.duration);
              setWaypoints(result.coordinates);
              mapRef.current?.fitToCoordinates(result.coordinates, {
                edgePadding: { top: 50, right: 50, bottom: 300, left: 50 },
                animated: true,
              });
            }}
            onError={(err) => console.warn("Directions error:", err)}
          />
        )}
      </MapView>

      <TouchableOpacity
        className="absolute top-12 right-4 bg-gray-700 px-4 py-2 rounded-xl z-50"
        onPress={() =>
          fitAll({
            mapRef,
            pickup: pickup?.coordinates,
            destination: destination?.coordinates,
            selectedRider: selectedRider,
          })
        }
      >
        <Ionicons name="locate-outline" size={24} color="white" />
      </TouchableOpacity>

      {/* Bottom Panel */}
      <SafeAreaView className="absolute bottom-0 left-0 right-0 px-4">
        <View className="bg-[#3C3C43] rounded-t-2xl px-4 py-3">
          <Text className="text-lg font-semibold text-white text-center">
            Select Pickup & Destination
          </Text>
        </View>

        <View className="bg-[#3C3C43] p-4 rounded-b-2xl">
          {/* Location fields */}
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              className="flex-1 flex-row items-center bg-white rounded-xl px-2 gap-2 py-3"
              onPress={() => setActiveField("from")}
            >
              {MY_ICONS.marker("green", 20)}
              <Text className="text-gray-700 font-medium">
                {pickup ? pickup.name : "Set Pickup"}
              </Text>
            </TouchableOpacity>

            <Ionicons name="arrow-forward" size={20} color="#9CA3AF" />

            <TouchableOpacity
              className="flex-1 flex-row items-center gap-2 bg-white rounded-xl px-2 py-3"
              onPress={() => setActiveField("to")}
            >
              {MY_ICONS.marker("red", 20)}
              <Text className="text-gray-700 font-medium">
                {destination ? destination.name : "Set Destination"}
              </Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row items-center justify-center gap-4">
            {/* Distance info */}
            {pickup && destination && (
              <View className="mt-2 items-center">
                <Text className="text-gray-300 text-xs">
                  Distance: {distance.toFixed(1)} km
                </Text>
                <Text className="text-gray-300 text-xs">
                  ETA: {Math.ceil(duration)} min
                </Text>
              </View>
            )}
            {/* Delivery Button (main + cycle) */}
            <DeliveryButton
              pickup={pickup}
              destination={destination}
              price={price}
              loading={loading}
              hasMultipleRiders={hasMultipleRiders}
              onConfirmLocations={handleConfirmLocations}
              onSearchRider={handleSearchRider}
              onConfirmDelivery={handleConfirmDelivery}
              onCycleRider={handleCycleRider}
            />
          </View>
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
          console.log(location);
        }}
      />

      <RiderAwaitingModal
        visible={showAwaitingModal}
        onClose={() => {
          setShowAwaitingModal(false);
          router.replace("/(tabs)/deliveries");
        }}
        pickup_lat={pickup?.coordinates?.latitude ?? 0}
        pickup_long={pickup?.coordinates?.longitude ?? 0}
        pickup_name={`${pickup?.name ?? ""}, ${pickup?.address ?? ""}`}
        dropoff_lat={destination?.coordinates?.latitude ?? 0}
        dropoff_long={destination?.coordinates?.longitude ?? 0}
        dropoff_name={`${destination?.name ?? ""}, ${
          destination?.address ?? ""
        }`}
        image_url={packageImage || IMAGES.riderWithPizza}
        package_type={packageType || "Unknown Item"}
        package_description={packageDescription || ""}
        waypoints={waypoints}
      />
    </View>
  );
}
