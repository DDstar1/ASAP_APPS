import { BikeMarker, Radar, RADAR_ORANGE, RadarSpot } from "@/components/Radar";
import {
  isAssignedOffer,
  respondToRideOffer,
  type OfferDetails,
} from "@/lib/ride-offers";
import { useAcceptedDeliveryStore } from "@/store/useAcceptedDeliveriesStore";
import { useRideOfferStore } from "@/store/useRideOfferStore";
import { startTracking } from "@/utils/utils_orderLocationTracking";
import { cleanAddress } from "@/utils/utils_for_me";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import * as Location from "expo-location";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// The outer ring: Rust's widest driver search
const RADAR_KM = 12;
const PIN_W = 132;
const PIN_H = 72;
// From the pin's top to the middle of its blip
const PIN_ANCHOR = 18;

// The offer is on a countdown, so take the last known fix if there is one
// rather than waiting on a fresh high-accuracy reading. Null if unavailable;
// the accept still goes through.
async function currentLocation() {
  try {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status !== "granted") return null;
    const position =
      (await Location.getLastKnownPositionAsync({ maxAge: 60_000 })) ??
      (await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      }));
    return { lat: position.coords.latitude, long: position.coords.longitude };
  } catch {
    return null;
  }
}

// Bearing (radians clockwise from north) and distance in km; fine at city scale
function bearingAndKm(
  from: { lat: number; long: number },
  to: { lat: number; long: number },
) {
  const rad = Math.PI / 180;
  const dx = (to.long - from.long) * rad * Math.cos(((from.lat + to.lat) / 2) * rad);
  const dy = (to.lat - from.lat) * rad;
  return { bearing: Math.atan2(dx, dy), km: Math.hypot(dx, dy) * 6371 };
}

function shortPlace(name: string | null) {
  return cleanAddress(name ?? "").split(",")[0]?.trim() || "Pickup";
}

// Shown on the home tab when Rust offers this rider a delivery. A <Modal>
// covers the whole app and tabs stay mounted, so it only renders while home
// is focused; otherwise the offer waits in the store until the rider is back.
export function RideOfferModal() {
  const isFocused = useIsFocused();
  const offer = useRideOfferStore((s) => s.offer);
  const others = useRideOfferStore((s) => s.others);
  const dismissOffer = useRideOfferStore((s) => s.dismissOffer);
  const focusOffer = useRideOfferStore((s) => s.focusOffer);
  const fetchAcceptedDeliveries = useAcceptedDeliveryStore(
    (s) => s.fetchAcceptedDeliveries,
  );
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const radarSize = Math.min(width - 32, 340);

  const [secondsLeft, setSecondsLeft] = useState(0);
  const [responding, setResponding] = useState<"accept" | "decline" | null>(
    null,
  );
  const [here, setHere] = useState<{ lat: number; long: number } | null>(null);

  const hasOffer = !!offer && isFocused;
  useEffect(() => {
    if (hasOffer) currentLocation().then(setHere);
  }, [hasOffer]);

  // Countdown to expires_at; close when it runs out
  useEffect(() => {
    if (!offer || !isFocused) return;
    const expiresAt = new Date(offer.expires_at).getTime();
    const tick = () => {
      const left = Math.max(0, Math.round((expiresAt - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left === 0) dismissOffer(offer.offer_id);
    };
    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [offer?.offer_id, isFocused]);

  if (!offer || !isFocused) return null;

  // Rust already gave this delivery to the rider, so there's nothing to
  // decline; Start records the response and sends their location
  const assigned = isAssignedOffer(offer);

  const respond = async (accepted: boolean) => {
    if (responding) return;
    setResponding(accepted ? "accept" : "decline");

    const location = accepted ? await currentLocation() : null;
    const result = await respondToRideOffer(offer.offer_id, accepted, location);
    setResponding(null);

    if (!result.success) {
      if (result.expired) dismissOffer(offer.offer_id);
      Alert.alert(
        assigned ? "Couldn't start" : accepted ? "Couldn't accept" : "Couldn't decline",
        result.error,
      );
      return;
    }

    dismissOffer(offer.offer_id);
    if (!accepted) return;

    startTracking(offer.order_id);
    fetchAcceptedDeliveries();
    router.push({
      pathname: "/(tabs)/deliveries",
      params: { newlyAcceptedId: offer.order_id, time_added: Date.now() },
    });
  };

  const openOthers = others.filter(
    (o) => new Date(o.expires_at).getTime() > Date.now(),
  );
  const pins = [offer, ...openOthers];
  // Keeps the pin's label inside the radar so it stays tappable on Android
  const maxR = radarSize / 2 - (PIN_H - PIN_ANCHOR);

  return (
    <Modal transparent animationType="fade" visible>
      <View className="flex-1 bg-black">
        <View
          className="flex-row justify-between items-center px-6"
          style={{ paddingTop: insets.top + 12 }}
        >
          <Text className="text-white text-2xl font-bold">
            {assigned ? "New delivery assigned" : "New delivery request"}
          </Text>
          <View className="bg-[#FF7518]/20 px-3 py-1 rounded-full">
            <Text className="text-[#FF7518] font-semibold">{secondsLeft}s</Text>
          </View>
        </View>

        <View className="flex-1 justify-center items-center">
          <Radar size={radarSize} center={<BikeMarker size={44} />}>
            {pins.map((o, i) => {
              const { x, y, km } = pinPosition(o, i, here, maxR);
              return (
                <RadarSpot
                  key={o.offer_id}
                  x={x}
                  y={y}
                  radarSize={radarSize}
                  width={PIN_W}
                  height={PIN_H}
                  anchorY={PIN_ANCHOR}
                >
                  <OfferPin
                    label={shortPlace(o.pickup_name)}
                    km={km}
                    focused={o.offer_id === offer.offer_id}
                    onPress={() => focusOffer(o.offer_id)}
                  />
                </RadarSpot>
              );
            })}
          </Radar>
          {openOthers.length > 0 && (
            <Text className="text-gray-500 text-xs mt-3">
              {openOthers.length + 1} offers · tap a pin to switch
            </Text>
          )}
        </View>

        <View
          className="bg-[#1C1C21] rounded-t-3xl px-6 pt-6 gap-4"
          style={{ paddingBottom: insets.bottom + 20 }}
        >
          <View className="bg-[#26262B] rounded-2xl px-4 py-3 gap-1">
            <View className="flex-row items-start gap-3">
              <Ionicons name="radio-button-on" size={18} color={RADAR_ORANGE} />
              <View className="flex-1">
                <Text className="text-xs text-gray-400">Pickup</Text>
                <Text className="text-sm text-white">
                  {cleanAddress(offer.pickup_name ?? "") || "—"}
                </Text>
              </View>
            </View>
            <View className="ml-[8px] h-3 border-l border-dashed border-gray-600" />
            <View className="flex-row items-start gap-3">
              <Ionicons name="location" size={18} color="white" />
              <View className="flex-1">
                <Text className="text-xs text-gray-400">Drop-off</Text>
                <Text className="text-sm text-white">
                  {cleanAddress(offer.dropoff_name ?? "") || "—"}
                </Text>
              </View>
            </View>
          </View>

          {(offer.package_type || offer.image_url) && (
            <View className="flex-row items-center gap-3">
              <Ionicons name="cube-outline" size={18} color="#9CA3AF" />
              <Text className="flex-1 text-sm text-gray-300">
                {offer.package_type ?? "Package"}
              </Text>
              {offer.image_url && (
                <Image
                  source={{ uri: offer.image_url }}
                  className="w-14 h-14 rounded-lg"
                />
              )}
            </View>
          )}

          <View className="flex-row gap-3 mt-1">
            {!assigned && (
              <TouchableOpacity
                className="flex-1 h-14 rounded-full border border-[#3A3A3F] justify-center items-center"
                onPress={() => respond(false)}
                disabled={!!responding}
              >
                {responding === "decline" ? (
                  <ActivityIndicator color="#9CA3AF" />
                ) : (
                  <Text className="text-white font-semibold">Decline</Text>
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity
              className="flex-1 h-14 rounded-full bg-[#FF7518] justify-center items-center"
              onPress={() => respond(true)}
              disabled={!!responding}
            >
              {responding === "accept" ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-semibold">
                  {assigned ? "Start" : "Accept"}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// The pickup's real direction and distance from the rider; spread evenly if
// either location is unknown
function pinPosition(
  o: OfferDetails,
  index: number,
  here: { lat: number; long: number } | null,
  maxR: number,
) {
  const lat = Number(o.pickup_lat);
  const long = Number(o.pickup_long);
  if (here && o.pickup_lat != null && o.pickup_long != null && Number.isFinite(lat + long)) {
    const { bearing, km } = bearingAndKm(here, { lat, long });
    const r = Math.min(Math.max(km / RADAR_KM, 0.35), 1) * maxR;
    return { x: Math.sin(bearing) * r, y: -Math.cos(bearing) * r, km };
  }
  const bearing = ((45 + index * 110) * Math.PI) / 180;
  const r = 0.7 * maxR;
  return { x: Math.sin(bearing) * r, y: -Math.cos(bearing) * r, km: null };
}

function OfferPin({
  label,
  km,
  focused,
  onPress,
}: {
  label: string;
  km: number | null;
  focused: boolean;
  onPress: () => void;
}) {
  const distance = km == null ? "" : km < 1 ? " · <1 km" : ` · ${km.toFixed(1)} km`;
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={focused}
      accessibilityRole="button"
      accessibilityLabel={`Offer from ${label}${distance}`}
      className="items-center"
      style={{ width: PIN_W, opacity: focused ? 1 : 0.75 }}
    >
      <View
        className="w-9 h-9 rounded-full justify-center items-center"
        style={{
          backgroundColor: focused ? RADAR_ORANGE : "white",
          borderWidth: 2,
          borderColor: "black",
        }}
      >
        <Ionicons name="cube" size={16} color={focused ? "white" : RADAR_ORANGE} />
      </View>
      <View className="w-[2px] h-3 bg-white/40" />
      <View
        className="px-2.5 py-1 rounded-full bg-[#1C1C21]"
        style={{ borderWidth: 1, borderColor: focused ? RADAR_ORANGE : "#3A3A3F" }}
      >
        <Text
          className="text-white text-[11px] font-semibold"
          numberOfLines={1}
          style={{ maxWidth: PIN_W - 20 }}
        >
          {label}
          {distance}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
