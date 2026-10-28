import BookingSheet from "@/components/BookingSheet";
import DestinationSearchModal from "@/components/DestinationSearchModal";
import RiderAwaitingModal from "@/components/RiderAwaitingModal";
import { payWithKorapay } from "@/lib/payments";
import { checkServiceArea, getRideQuotes, RideQuote } from "@/lib/ride-request";
import { useRideDraftStore } from "@/store/useRideDraftStore";
import { useCustomerDeliveryStore } from "@/store/useCustomerDeliveriesStore";
import { getRebookItems } from "@/lib/supabase-app-functions";
import { useUserStore } from "@/store/useUserStore";
import { fitAll, reverseGeocode } from "@/utils/mapUtils";
import { Coordinates } from "@/utils/my_types";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { SafeAreaView } from "react-native-safe-area-context";
import { mapStyleFor } from "@/constants/mapStyle";
import { useColorScheme } from "@/hooks/use-color-scheme";

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

// Orders store "Name, address"; the map's places keep them apart
function placeFromName(full: string, lat: number, lng: number) {
  const [name, ...rest] = (full ?? "").split(",");
  return {
    name: name.trim() || "Saved stop",
    address: rest.join(",").trim() || null,
    coordinates: { latitude: Number(lat), longitude: Number(lng) },
  };
}

export default function MapScreen() {
  const [pickup, setPickup] = useState<any>(null);
  const [destination, setDestination] = useState<any>(null);
  const [activeField, setActiveField] = useState<"from" | "to" | null>(null);
  const [waypoints, setWaypoints] = useState<Coordinates[] | null>(null);

  const [quotes, setQuotes] = useState<RideQuote[]>([]);
  const [quotesLoading, setQuotesLoading] = useState(false);
  // Why the last quote failed, shown on the booking sheet
  const [quoteError, setQuoteError] = useState<string | null>(null);
  // Bumped to fetch fresh quotes when checkout says the price has changed
  const [quoteRefresh, setQuoteRefresh] = useState(0);
  const [booking, setBooking] = useState(false);
  const [checkingArea, setCheckingArea] = useState(false);
  // Set once Korapay reports success; opens the awaiting-rider modal
  const [checkout, setCheckout] = useState<{
    reference: string;
    orderRef: string;
  } | null>(null);
  const [placeNames, setPlaceNames] = useState<{
    pickup: string | null;
    dropoff: string | null;
  }>({ pickup: null, dropoff: null });

  // "Choose on map": a fixed centre pin; the address under it is looked up
  // each time the map stops moving
  const [pickingField, setPickingField] = useState<"from" | "to" | null>(null);
  const [pinCenter, setPinCenter] = useState<Coordinates | null>(null);
  const [pinAddress, setPinAddress] = useState<string | null>(null);
  const [pinLoading, setPinLoading] = useState(false);
  const geocodeSeq = useRef(0);

  const mapRef = useRef<MapView>(null);
  const colorScheme = useColorScheme();
  const { itemType, items, rideType, setRideType, reset } = useRideDraftStore();
  const hasItem = items.length > 0;

  // From the landing screen: a recent place as the destination, and/or the
  // search opened straight away
  const { search, dest_lat, dest_lng, dest_name, dest_address, rebook } =
    useLocalSearchParams<{
      search?: "from" | "to";
      dest_lat?: string;
      dest_lng?: string;
      dest_name?: string;
      dest_address?: string;
      rebook?: string;
    }>();

  // Each visit to the map starts a fresh booking
  useEffect(() => {
    reset();

    // Rebook: same stops and items as a past order, straight to the ride types
    const past = rebook
      ? useCustomerDeliveryStore.getState().AllDeliveries.find((d) => String(d.id) === rebook)
      : null;
    if (past) {
      setPickup(placeFromName(past.pickup_name, past.pickup_lat, past.pickup_long));
      setDestination(placeFromName(past.dropoff_name, past.dropoff_lat, past.dropoff_long));
      getRebookItems(past.id).then((items) => {
        const { setItemType, setItems } = useRideDraftStore.getState();
        const type = items[0]?.type ?? past.package_type ?? null;
        if (type) setItemType(type);
        if (items.length) setItems(items);
        else router.push("/map/item-type");
      });
      return;
    }

    const latitude = Number(dest_lat);
    const longitude = Number(dest_lng);
    if (dest_name && Number.isFinite(latitude) && Number.isFinite(longitude)) {
      setDestination({
        name: dest_name,
        address: dest_address ?? null,
        coordinates: { latitude, longitude },
      });
    }
    if (search === "from" || search === "to") setActiveField(search);
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

  // What the quote depends on besides the route. The photo doesn't change the
  // price, so a new image_url alone doesn't refetch.
  const quoteItemsKey = JSON.stringify(items.map(({ image_url, ...rest }) => rest));

  // Rust prices both ride types once the locations are set, and again once
  // the item details (package type, weight, size) are in, so the booking
  // sheet shows the same price Rust checks at checkout
  useEffect(() => {
    if (!pickup?.coordinates || !destination?.coordinates) {
      setQuotes([]);
      setQuoteError(null);
      return;
    }
    let cancelled = false;
    setQuotesLoading(true);
    getRideQuotes(
      pickup.coordinates,
      destination.coordinates,
      useRideDraftStore.getState().items,
    ).then(({ quotes: q, error }) => {
      if (cancelled) return;
      setQuotes(q);
      setQuoteError(error);
      setQuotesLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [pickup?.coordinates, destination?.coordinates, quoteItemsKey, quoteRefresh]);

  const handleContinue = async () => {
    if (!pickup || !destination) {
      Alert.alert("Missing Info", "Please select both pickup and destination.");
      return;
    }
    setCheckingArea(true);
    const area = await checkServiceArea(pickup.coordinates, destination.coordinates);
    setCheckingArea(false);
    if (!area.allowed) {
      Alert.alert("Outside our coverage", area.reason ?? "We don't deliver there yet.");
      return;
    }
    router.push("/map/item-type");
  };

  const startPicking = (field: "from" | "to") => {
    setPickingField(field);
    setPinAddress(null);
    const current = (field === "from" ? pickup : destination)?.coordinates;
    if (current) {
      mapRef.current?.animateToRegion(
        { ...current, latitudeDelta: 0.01, longitudeDelta: 0.01 },
        400,
      );
    } else {
      // Zoom in where the map already is, close enough to pick a street
      mapRef.current?.getCamera().then((camera) => {
        mapRef.current?.animateToRegion(
          { ...camera.center, latitudeDelta: 0.02, longitudeDelta: 0.02 },
          400,
        );
      });
    }
  };

  const handleRegionChangeComplete = async (region: Region) => {
    if (!pickingField) return;
    const center = { latitude: region.latitude, longitude: region.longitude };
    setPinCenter(center);
    setPinLoading(true);
    // Only the latest lookup wins when the user keeps moving the map
    const seq = ++geocodeSeq.current;
    const address = await reverseGeocode(center.latitude, center.longitude).catch(() => null);
    if (seq !== geocodeSeq.current) return;
    setPinAddress(address);
    setPinLoading(false);
  };

  const confirmPin = () => {
    if (!pickingField || !pinCenter) return;
    const location = {
      name: pinAddress?.split(",")[0]?.trim() || "Pinned location",
      address: pinAddress,
      coordinates: pinCenter,
    };
    if (pickingField === "from") setPickup(location);
    else setDestination(location);
    setPickingField(null);
    setPinCenter(null);
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

    // The price shown on the booking sheet; Rust re-checks it at initialize
    const quote = quotes.find((q) => q.ride_type === rideType);
    if (!quote) {
      setBooking(false);
      Alert.alert("Price unavailable", "Please wait for the price to load and try again.");
      return;
    }

    const payment = await payWithKorapay(
      {
        pickup_lat: pickup.coordinates.latitude,
        pickup_long: pickup.coordinates.longitude,
        pickup_name: pickupName,
        dropoff_lat: destination.coordinates.latitude,
        dropoff_long: destination.coordinates.longitude,
        dropoff_name: dropoffName,
        package_type: itemType,
        package_description: items[0]?.name ?? null,
        image_url: items[0]?.image_url ?? null,
        customer_phone: user.phone ?? null,
      },
      {
        source: "app",
        rider_id: user.id,
        pick_up: pickup.coordinates,
        drop_off: destination.coordinates,
        ride_type: rideType,
        payment_method: "korapay",
        items,
        user_id: null,
        user_phone_number: user.phone ?? null,
        vendor_phone_number: null,
        pickup_name: pickupName,
        dropoff_name: dropoffName,
      },
      quote.estimated_price,
    );
    setBooking(false);

    if (payment.status === "paid")
      setCheckout({ reference: payment.reference, orderRef: payment.orderRef });
    // 409: Rust's price no longer matches the quote shown (e.g. it changed
    // since the sheet loaded), so show the new price instead of charging
    else if (payment.status === "error" && payment.error.includes("API 409")) {
      setQuoteRefresh((n) => n + 1);
      Alert.alert("Price updated", "The price for this delivery has changed. Check the new price and book again.");
    } else if (payment.status === "error") Alert.alert("Payment failed", payment.error);
  };

  // ----------------- RENDER -----------------
  return (
    <View className="flex-1 bg-black">
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        customMapStyle={mapStyleFor(colorScheme)}
        // Abuja, the centre of the first service area
        initialRegion={{
          latitude: 9.0765,
          longitude: 7.3986,
          latitudeDelta: 0.2,
          longitudeDelta: 0.2,
        }}
        onRegionChangeComplete={handleRegionChangeComplete}
      >
        {pickup?.coordinates && pickingField !== "from" && (
          <Marker
            coordinate={pickup.coordinates}
            title="Pickup"
            pinColor="green"
          />
        )}

        {destination?.coordinates && pickingField !== "to" && (
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
            strokeColor="#FF7518"
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
            accessibilityRole="button"
            accessibilityLabel="Go back"
            className="w-11 h-11 rounded-full bg-[#3A3A3F] justify-center items-center"
          >
            <Ionicons name="chevron-back" size={22} color="white" />
          </TouchableOpacity>
          {/* Tapping the title changes the destination */}
          <TouchableOpacity
            className="flex-1 mr-11"
            onPress={() => setActiveField("to")}
            accessibilityRole="button"
            accessibilityLabel="Change destination"
          >
            <Text className="text-white text-xl text-center" numberOfLines={1}>
              {destination?.name ?? "Send a package"}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {pickingField && (
        <>
          {/* Fixed pin: its tip marks the centre of the map */}
          <View
            pointerEvents="none"
            className="absolute left-1/2 top-1/2"
            style={{ marginLeft: -22, marginTop: -44 }}
          >
            <Ionicons
              name="location"
              size={44}
              color={pickingField === "from" ? "#22C55E" : "#EF4444"}
            />
          </View>

          <SafeAreaView
            edges={["bottom"]}
            className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-[#1C1C21] px-4 pt-3 pb-4 gap-3"
          >
            <View className="self-center w-10 h-1 rounded-full bg-white/20" />
            <Text className="text-white text-lg font-bold">
              Set your {pickingField === "from" ? "pickup" : "destination"}
            </Text>
            <Text className="text-gray-400 text-sm -mt-2">
              Move the map until the pin is on the exact spot
            </Text>
            <View className="bg-[#2C2C30] rounded-2xl px-4 py-4 flex-row items-center gap-3 min-h-[60px]">
              {pinLoading ? (
                <ActivityIndicator color="#FF7518" />
              ) : (
                <Ionicons name="location-outline" size={20} color="#9CA3AF" />
              )}
              <Text className="text-white text-base flex-1" numberOfLines={2}>
                {pinLoading
                  ? "Finding address…"
                  : pinAddress ?? (pinCenter ? "No address here — you can still use this spot" : "Move the map")}
              </Text>
            </View>
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => setPickingField(null)}
                accessibilityRole="button"
                className="h-14 px-6 rounded-full border border-white/20 justify-center items-center"
              >
                <Text className="text-white font-semibold">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={confirmPin}
                disabled={!pinCenter || pinLoading}
                accessibilityRole="button"
                className={`flex-1 h-14 rounded-full bg-[#FF7518] justify-center items-center ${
                  !pinCenter || pinLoading ? "opacity-50" : ""
                }`}
              >
                <Text className="text-white text-lg font-bold">
                  Confirm {pickingField === "from" ? "pickup" : "destination"}
                </Text>
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </>
      )}

      {/* Re-center button */}
      {!pickingField && (
      <TouchableOpacity
        accessibilityRole="button"
        accessibilityLabel="Show the whole route"
        className="absolute right-4 w-11 h-11 bg-[#2C2C30] rounded-full justify-center items-center z-50"
        // Just above whichever sheet is showing (the ride type sheet is taller)
        style={{ bottom: hasItem ? 480 : 280 }}
        onPress={() =>
          fitAll({
            mapRef: mapRef as React.RefObject<MapView>,
            pickup: pickup?.coordinates,
            destination: destination?.coordinates,
            selectedRider: waypoints?.[0],
          })
        }
      >
        <Ionicons name="compass-outline" size={24} color="white" />
      </TouchableOpacity>
      )}

      {/* Bottom Panel */}
      <SafeAreaView
        edges={["bottom"]}
        className={`absolute bottom-0 left-0 right-0 rounded-t-3xl ${
          hasItem ? "bg-black" : "bg-[#1C1C21]"
        } ${pickingField ? "hidden" : ""}`}
      >
        {hasItem ? (
          <BookingSheet
            itemLabel={itemType ?? "Item description"}
            quotes={quotes}
            quotesLoading={quotesLoading}
            quoteError={quoteError}
            onRetryQuotes={() => setQuoteRefresh((n) => n + 1)}
            rideType={rideType}
            booking={booking}
            onEditItem={() =>
              router.push({ pathname: "/map/specifications", params: { edit: "1" } })
            }
            onSelectRideType={setRideType}
            onBook={handleBook}
          />
        ) : (
          <View className="px-4 pt-3 pb-4 gap-3">
            <View className="self-center w-10 h-1 rounded-full bg-white/20" />

            {/* Pick up / Deliver to, joined by a dotted line */}
            <View className="bg-[#2C2C30] rounded-2xl px-4">
              <TouchableOpacity
                className="flex-row items-center gap-3 py-4"
                onPress={() => setActiveField("from")}
                accessibilityRole="button"
                accessibilityLabel={`Pickup: ${pickup?.name ?? "not set"}`}
              >
                <View className="w-3 h-3 rounded-full bg-[#EF4444]" />
                <View className="flex-1">
                  <Text className="text-gray-400 text-xs">Pick up</Text>
                  <Text
                    className={`text-base ${pickup ? "text-white" : "text-gray-500"}`}
                    numberOfLines={1}
                  >
                    {pickup ? pickup.name : "Set pickup"}
                  </Text>
                </View>
              </TouchableOpacity>

              <View className="h-px bg-white/10 ml-6" />

              <TouchableOpacity
                className="flex-row items-center gap-3 py-4"
                onPress={() => setActiveField("to")}
                accessibilityRole="button"
                accessibilityLabel={`Destination: ${destination?.name ?? "not set"}`}
              >
                <View className="w-3 h-3 rounded-full bg-[#22C55E]" />
                <View className="flex-1">
                  <Text className="text-gray-400 text-xs">Deliver to</Text>
                  <Text
                    className={`text-base ${destination ? "text-white" : "text-gray-500"}`}
                    numberOfLines={1}
                  >
                    {destination ? destination.name : "Set destination"}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleContinue}
              disabled={!pickup || !destination || checkingArea}
              className={`h-14 rounded-full bg-[#FF7518] justify-center items-center ${
                pickup && destination ? "" : "opacity-50"
              }`}
            >
              {checkingArea ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-lg font-bold">Continue</Text>
              )}
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>

      {/* Modals */}
      <DestinationSearchModal
        visible={!!activeField}
        field={activeField || "from"}
        originLabel={pickup?.name}
        onClose={() => setActiveField(null)}
        onChooseOnMap={startPicking}
        onSelect={(location) => {
          if (activeField === "from") setPickup(location);
          if (activeField === "to") setDestination(location);
        }}
      />

      {/* Opens once Korapay reports success; sends the ride request */}
      {checkout && (
        <RiderAwaitingModal
          visible
          paymentReference={checkout.reference}
          orderRef={checkout.orderRef}
          pickup={pickup.coordinates}
          dropoff={destination.coordinates}
          pickupName={placeNames.pickup}
          dropoffName={placeNames.dropoff}
          onClose={() => {
            setCheckout(null);
            router.replace("/(tabs)/deliveries");
          }}
          onCancelled={() => {
            setCheckout(null);
            reset();
            router.replace("/(tabs)/home");
          }}
          onRiderFound={(orderId) => {
            setCheckout(null);
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
