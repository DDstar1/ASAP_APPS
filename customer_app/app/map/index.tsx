import BookingSheet from "@/components/BookingSheet";
import DestinationSearchModal from "@/components/DestinationSearchModal";
import RiderAwaitingModal from "@/components/RiderAwaitingModal";
import { payWithKorapay } from "@/lib/payments";
import { getRideQuotes, RideQuote } from "@/lib/ride-request";
import { useRideDraftStore } from "@/store/useRideDraftStore";
import { useUserStore } from "@/store/useUserStore";
import { fitAll, reverseGeocode } from "@/utils/mapUtils";
import { Coordinates } from "@/utils/my_types";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { router } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Alert, Text, TouchableOpacity, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { SafeAreaView } from "react-native-safe-area-context";
import { MY_ICONS } from "@/assets/assetsData";

const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.googleMapsApiKey ?? "";

// "Current location" / saved entries have no usable address; look one up
async function resolvePlaceName(place: any) {
  const name = `${place?.name ?? ""}, ${place?.address ?? ""}`;
  const check = name.toLowerCase();
  if (!place?.name || check.includes("current location") || check.includes("(saved)")) {
    return reverseGeocode(place.coordinates.latitude, place.coordinates.longitude);
  }
  return name;
}

export default function MapScreen() {
  const [pickup, setPickup] = useState<any>(null);
  const [destination, setDestination] = useState<any>(null);
  const [activeField, setActiveField] = useState<"from" | "to" | null>(null);
  const [waypoints, setWaypoints] = useState<Coordinates[] | null>(null);

  const [quotes, setQuotes] = useState<RideQuote[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(false);
  const [booking, setBooking] = useState(false);
  const [paymentReference, setPaymentReference] = useState<string | null>(null);
  const [placeNames, setPlaceNames] = useState<{
    pickup: string | null;
    dropoff: string | null;
  }>({ pickup: null, dropoff: null });

  const mapRef = useRef<MapView>(null);
  const { itemType, items, rideType, setRideType, reset } = useRideDraftStore();
  const hasItem = items.length > 0;

  // Each visit to the map starts a fresh booking
  useEffect(() => {
    reset();
  }, []);

  // Auto-zoom when pickup/destination change
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

  // Rust prices both ride types once the locations are set
  useEffect(() => {
    if (!pickup?.coordinates || !destination?.coordinates) {
      setQuotes([]);
      return;
    }
    let cancelled = false;
    setQuotesLoading(true);
    getRideQuotes(pickup.coordinates, destination.coordinates).then((q) => {
      if (cancelled) return;
      setQuotes(q);
      setQuotesLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [pickup?.coordinates, destination?.coordinates]);

  const handleContinue = () => {
    if (!pickup || !destination) {
      Alert.alert("Missing Info", "Please select both pickup and destination.");
      return;
    }
    router.push("/map/item-type");
  };

  // Book → Korapay → awaiting rider
  const handleBook = async () => {
    const user = useUserStore.getState().user;
    if (!user || !rideType || !hasItem) return;
    setBooking(true);

    const [pickupName, dropoffName] = await Promise.all([
      resolvePlaceName(pickup),
      resolvePlaceName(destination),
    ]);
    setPlaceNames({ pickup: pickupName, dropoff: dropoffName });

    const payment = await payWithKorapay({
      source: "app",
      rider_id: user.id,
      pick_up: pickup.coordinates,
      drop_off: destination.coordinates,
      ride_type: rideType,
      payment_method: "korapay",
      items,
      order_ref: null,
      user_id: null,
      user_phone_number: user.phone ?? null,
      vendor_phone_number: null,
      pickup_name: pickupName,
      dropoff_name: dropoffName,
    });
    setBooking(false);

    if (payment.status === "paid") setPaymentReference(payment.reference);
    else if (payment.status === "error") Alert.alert("Payment failed", payment.error);
  };

  // ----------------- RENDER -----------------
  return (
    <View className="flex-1 bg-gray-900">
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        initialRegion={{
          latitude: 6.5244,
          longitude: 3.3792,
          latitudeDelta: 0.2,
          longitudeDelta: 0.2,
        }}
      >
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

        {pickup?.coordinates && destination?.coordinates && (
          <MapViewDirections
            origin={pickup.coordinates}
            destination={destination.coordinates}
            apikey={GOOGLE_MAPS_API_KEY}
            strokeWidth={5}
            strokeColor="#F97316"
            onReady={(result) => setWaypoints(result.coordinates)}
            onError={(err) =>
              console.warn("Directions error (pickup→dest):", err)
            }
          />
        )}
      </MapView>

      {/* Header */}
      <SafeAreaView edges={["top"]} className="absolute top-0 left-0 right-0 px-4">
        <View className="flex-row items-center bg-[#2C2C30] rounded-full mt-2">
          <TouchableOpacity
            onPress={() => router.back()}
            className="w-11 h-11 rounded-full bg-[#3A3A3F] justify-center items-center"
          >
            <Ionicons name="chevron-back" size={22} color="white" />
          </TouchableOpacity>
          <Text
            className="flex-1 text-white text-xl text-center mr-11"
            numberOfLines={1}
          >
            {destination?.name ?? "Send a package"}
          </Text>
        </View>
      </SafeAreaView>

      {/* Re-center button */}
      <TouchableOpacity
        className="absolute right-4 bg-gray-700 p-2 rounded-full z-50"
        style={{ bottom: hasItem ? 420 : 260 }}
        onPress={() =>
          fitAll({
            mapRef: mapRef as React.RefObject<MapView>,
            pickup: pickup?.coordinates,
            destination: destination?.coordinates,
            selectedRider: waypoints?.[0],
          })
        }
      >
        <Ionicons name="compass-outline" size={28} color="white" />
      </TouchableOpacity>

      {/* Bottom Panel */}
      <SafeAreaView
        edges={["bottom"]}
        className="absolute bottom-0 left-0 right-0 bg-black"
      >
        {hasItem ? (
          <BookingSheet
            itemLabel={itemType ?? "Item description"}
            quotes={quotes}
            quotesLoading={quotesLoading}
            rideType={rideType}
            booking={booking}
            onEditItem={() =>
              router.push({ pathname: "/map/specifications", params: { edit: "1" } })
            }
            onSelectRideType={setRideType}
            onBook={handleBook}
          />
        ) : (
          <View className="p-4 gap-4">
            <Text className="text-lg font-semibold text-white text-center">
              Select Pickup & Destination
            </Text>

            <View className="flex-row items-center justify-between gap-2">
              <TouchableOpacity
                className="flex-1 flex-row items-center bg-[#1C1C21] rounded-xl px-2 gap-2 py-3"
                onPress={() => setActiveField("from")}
              >
                {MY_ICONS.marker("green", 20)}
                <Text className="text-white font-medium" numberOfLines={1}>
                  {pickup ? pickup.name : "Set Pickup"}
                </Text>
              </TouchableOpacity>

              <Ionicons name="arrow-forward" size={20} color="#9CA3AF" />

              <TouchableOpacity
                className="flex-1 flex-row items-center gap-2 bg-[#1C1C21] rounded-xl px-2 py-3"
                onPress={() => setActiveField("to")}
              >
                {MY_ICONS.marker("red", 20)}
                <Text className="text-white font-medium" numberOfLines={1}>
                  {destination ? destination.name : "Set Destination"}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleContinue}
              disabled={!pickup || !destination}
              className={`h-14 rounded-full bg-[#EE7F3A] justify-center items-center ${
                pickup && destination ? "" : "opacity-50"
              }`}
            >
              <Text className="text-white text-lg font-bold">Continue</Text>
            </TouchableOpacity>
          </View>
        )}
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

      {/* Opens once Korapay reports success; sends the ride request */}
      {paymentReference && (
        <RiderAwaitingModal
          visible
          paymentReference={paymentReference}
          pickup={pickup.coordinates}
          dropoff={destination.coordinates}
          pickupName={placeNames.pickup}
          dropoffName={placeNames.dropoff}
          onClose={() => {
            setPaymentReference(null);
            router.replace("/(tabs)/deliveries");
          }}
          onCancelled={() => {
            setPaymentReference(null);
            reset();
            router.replace("/(tabs)/home");
          }}
          onRiderFound={(orderId) => {
            setPaymentReference(null);
            reset();
            router.replace({
              pathname: "/trackPackage",
              params: { order_id: String(orderId), rider_found: "1" },
            });
          }}
        />
      )}
    </View>
  );
}
