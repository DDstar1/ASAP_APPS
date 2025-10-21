// app/map/MapScreen.tsx
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
import MapView, { Marker, Polyline } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

export default function MapScreen() {
  const [pickup, setPickup] = useState<any>(null);
  const [destination, setDestination] = useState<any>(null);
  const [activeField, setActiveField] = useState<"from" | "to" | null>(null);
  const [loading, setLoading] = useState(false);
  const [price, setPrice] = useState<number | null>(null);
  const [riders, setRiders] = useState<any[]>([]);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [packageImage, setPackageImage] = useState<any>(null);

  const mapRef = useRef<MapView>(null);

  // Load package image from AsyncStorage
  useEffect(() => {
    loadPackageImage();
  }, []);

  const loadPackageImage = async () => {
    try {
      const uri = await AsyncStorage.getItem("packageImage");
      if (uri) {
        setPackageImage({ uri });
        console.log("✅ Package image loaded from AsyncStorage");
      } else {
        console.log("ℹ️ No package image found in AsyncStorage");
      }
    } catch (error) {
      console.error("Error loading package image:", error);
    }
  };

  // Clear package image from AsyncStorage
  const clearPackageImage = async () => {
    try {
      await AsyncStorage.removeItem("packageImage");
      setPackageImage(null);
      console.log("🗑️ Package image cleared from AsyncStorage");
    } catch (error) {
      console.error("Error clearing package image:", error);
    }
  };

  // Generate riders when pickup changes
  useEffect(() => {
    const baseLocation = pickup?.coordinates || {
      latitude: 6.5244,
      longitude: 3.3792,
    };
    const generated = generateRidersWithCoords(baseLocation);
    setRiders(generated);
  }, [pickup]);

  // Move riders smoothly every 3s
  useEffect(() => {
    const interval = setInterval(() => {
      setRiders((prev) => moveRiders(prev));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Auto zoom logic
  useEffect(() => {
    if (!mapRef.current) return;

    if (pickup && !destination) {
      mapRef.current.animateToRegion(
        { ...pickup.coordinates, latitudeDelta: 0.05, longitudeDelta: 0.05 },
        1000
      );
    } else if (destination && !pickup) {
      mapRef.current.animateToRegion(
        {
          ...destination.coordinates,
          latitudeDelta: 0.05,
          longitudeDelta: 0.05,
        },
        1000
      );
    } else if (pickup && destination) {
      mapRef.current.fitToCoordinates(
        [pickup.coordinates, destination.coordinates],
        {
          edgePadding: { top: 100, right: 100, bottom: 100, left: 100 },
          animated: true,
        }
      );
    }
  }, [pickup, destination]);

  // Calculate fare when both points are selected
  useEffect(() => {
    const fetchFare = async () => {
      if (!pickup || !destination) return;
      setLoading(true);
      setPrice(null);
      const fare = await calculateFare();
      setPrice(fare);
      setLoading(false);
    };
    if (pickup && destination) fetchFare();
  }, [pickup, destination]);

  return (
    <View className="flex-1 bg-gray-900">
      {/* Map */}
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
        {riders.map((rider) => (
          <Marker.Animated
            key={rider.id}
            coordinate={rider.coordinate}
            anchor={{ x: 0.5, y: 0.5 }}
            title={rider.name} // 👈 built-in tooltip
            description={`⭐ ${rider.rating} • ${rider.deliveries}`} // optional
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

        {pickup && (
          <Marker
            coordinate={pickup.coordinates}
            title="Pickup"
            description={pickup.name}
            pinColor="green"
          />
        )}
        {destination && (
          <Marker
            coordinate={destination.coordinates}
            title="Destination"
            description={destination.name}
            pinColor="red"
          />
        )}
        {pickup && destination && (
          <Polyline
            coordinates={[pickup.coordinates, destination.coordinates]}
            strokeColor="#2563EB"
            strokeWidth={4}
          />
        )}
      </MapView>

      {/* Bottom overlay */}
      <SafeAreaView className="absolute bottom-0 left-0 right-0 px-4">
        <View className="bg-[#3C3C43] rounded-t-2xl px-4 py-3">
          <Text className="text-lg font-semibold text-white text-center">
            Select Pickup & Destination
          </Text>
        </View>

        <View className="bg-[#3C3C43] p-4 rounded-b-2xl">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity
              className="flex-1 bg-white rounded-xl px-4 py-3 shadow-lg"
              onPress={() => setActiveField("from")}
            >
              <Text className="text-gray-700 font-medium">
                {pickup ? pickup.name : "Set Pickup"}
              </Text>
            </TouchableOpacity>

            <Ionicons name="arrow-forward" size={20} color="#9CA3AF" />

            <TouchableOpacity
              className="flex-1 bg-white rounded-xl px-4 py-3 shadow-lg"
              onPress={() => setActiveField("to")}
            >
              <Text className="text-gray-700 font-medium">
                {destination ? destination.name : "Set Destination"}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Confirm Delivery */}
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
        onClose={() => {
          setShowSearchModal(false);
          // Optional: Clear image after delivery is complete
          // clearPackageImage();
        }}
        price={price}
        packageImage={packageImage || IMAGES.riderWithPizza}
        pickup={pickup}
        destination={destination}
        riders={riders}
      />
    </View>
  );
}
