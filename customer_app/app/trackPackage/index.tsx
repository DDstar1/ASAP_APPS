import { IMAGES } from "@/assets/assetsData";
import { cancelPaidOrder } from "@/lib/payments";
import {
  getAllDriverDeliveryWaypoints,
  getOrderRiderInfo,
} from "@/lib/supabase-app-functions";
import { useCustomerDeliveryStore } from "@/store/useCustomerDeliveriesStore";
import { openOrderChat } from "@/utils/my_utils";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import Constants from "expo-constants";
import { router, useLocalSearchParams } from "expo-router";
import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { supabaseEvents } from "@/lib/supabase";
import {
  startWaypointEvents,
  stopWaypointEvents,
} from "@/lib/supabase-realtime-functions";
import MapView, {
  AnimatedRegion,
  LatLng,
  Marker,
  MarkerAnimated,
  PROVIDER_GOOGLE,
} from "react-native-maps";
import MapViewDirections from "react-native-maps-directions";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";

const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.googleMapsApiKey ?? "";
const ORANGE = "#EE7F3A";
// Each route/ETA refresh is a paid Directions request
const ROUTE_REFRESH_MS = 60 * 1000;
// Close to the rider app's 5 s upload, so the marker keeps gliding
const MARKER_GLIDE_MS = 4000;

const STATUS_LABEL: Record<string, string> = {
  pending: "Finding a rider",
  arriving_pickup: "Rider heading to pickup",
  in_transit: "On the way",
  delivered: "Delivered",
  no_driver: "No rider found",
  awaiting_payment: "Awaiting payment",
  cancelled: "Cancelled",
};

const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#1d1d1f" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8a8a8f" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1d1d1f" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2c2c30" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3a3a3f" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e0e10" }] },
];

// Delivery cycle: 1 in transit (rider accepted), 2 made pickup, 3 made delivery
function cycleStage(order: any): number {
  if (!order) return 0;
  if (order.status === "delivered") return 3;
  if (order.status === "in_transit" || order.is_pickup_code_authenticated)
    return 2;
  if (order.driver_id) return 1;
  return 0;
}

// Package box inside a ring split into the 3 delivery stages
function DeliveryRing({ stage }: { stage: number }) {
  const size = 64;
  const stroke = 4;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const part = circumference / 3;
  const gap = 8;

  return (
    <View style={{ width: size, height: size }} className="justify-center items-center">
      <Svg
        width={size}
        height={size}
        style={{ position: "absolute", transform: [{ rotate: "-90deg" }] }}
      >
        {[0, 1, 2].map((i) => (
          <Circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke={i < stage ? ORANGE : "#3A3A3F"}
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${part - gap} ${circumference - part + gap}`}
            strokeDashoffset={-i * part}
          />
        ))}
      </Svg>
      <Ionicons name="cube-outline" size={26} color="white" />
    </View>
  );
}

export default function RiderTrackingScreen() {
  const { order_id, rider_found } = useLocalSearchParams();
  const mapRef = useRef<MapView>(null);

  const [destination, setDestination] = useState<LatLng | null>(null);
  const [pickupLocation, setPickupLocation] = useState<LatLng | null>(null);
  const [driverWaypoints, setDriverWaypoints] = useState<LatLng[]>([]);
  // Minutes left on the remaining route, from Google Directions
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);
  // Arriving from "rider found" opens the driver's details first
  const [showDriver, setShowDriver] = useState(rider_found === "1");
  const [cancelling, setCancelling] = useState(false);

  const navigation = useNavigation();

  const {
    AllDeliveries,
    loading: StoreLoading,
    fetchAllDeliveries,
  } = useCustomerDeliveryStore();

  const order =
    AllDeliveries.find((d) => String(d.id) === String(order_id)) ?? null;

  const is_order_accepted =
    order?.status &&
    ["assigned", "arriving_pickup", "in_transit", "delivered"].includes(
      order.status,
    );

  const [rider, setRider] = useState<Awaited<
    ReturnType<typeof getOrderRiderInfo>
  > | null>(null);

  /*
  LOAD ASSIGNED RIDER
  */

  useEffect(() => {
    if (!order?.id || !order?.driver_id) {
      setRider(null);
      return;
    }

    let cancelled = false;
    getOrderRiderInfo(Number(order.id)).then((info) => {
      if (!cancelled) setRider(info);
    });

    return () => {
      cancelled = true;
    };
  }, [order?.id, order?.driver_id]);

  const callRider = () => {
    if (!rider?.phone) {
      Alert.alert("No phone number", "This rider hasn't added a phone number.");
      return;
    }

    Linking.openURL(`tel:${rider.phone}`).catch(() =>
      Alert.alert("Can't place call", `Call your rider on ${rider.phone}.`),
    );
  };

  /*
  FETCH DELIVERIES
  */

  useEffect(() => {
    if (AllDeliveries.length === 0) {
      fetchAllDeliveries();
    }
  }, []);

  /*
  NAVIGATION TITLE
  */

  useLayoutEffect(() => {
    navigation.setOptions({
      title: order?.order_code ? `Track ${order.order_code}` : "Track Package",
    });
  }, [navigation, order?.order_code]);

  /*
  PARSE PICKUP + DESTINATION
  */

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
      setPickupLocation({
        latitude: pickupLat,
        longitude: pickupLong,
      });
    }

    if (dropoffLat != null && dropoffLong != null) {
      setDestination({
        latitude: dropoffLat,
        longitude: dropoffLong,
      });
    }
  }, [order]);

  /*
  LOAD DRIVER WAYPOINTS
  */

  useEffect(() => {
    const loadDriverWaypoints = async () => {
      if (!is_order_accepted || !order_id) {
        setDriverWaypoints([]);
        return;
      }

      try {
        const result = await getAllDriverDeliveryWaypoints(Number(order_id));

        if (!result.success || !result.data?.length) {
          setDriverWaypoints([]);
          return;
        }

        const formatted: LatLng[] = result.data.map((wp: any) => ({
          latitude: Number(wp.lat),
          longitude: Number(wp.long),
        }));

        setDriverWaypoints(formatted);
      } catch (err) {
        console.log("Waypoint fetch error", err);
        setDriverWaypoints([]);
      }
    };

    loadDriverWaypoints();
  }, [order_id, is_order_accepted]);

  /*
  CLEAN ROUTE
  */

  const driverRoute: LatLng[] = useMemo(() => {
    if (!driverWaypoints.length) return [];

    const cleaned: LatLng[] = [];
    let last: LatLng | null = null;

    for (const point of driverWaypoints) {
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

    return cleaned.slice(-MAX_POINTS);
  }, [driverWaypoints]);

  const driverLocation =
    driverRoute.length > 0 ? driverRoute[driverRoute.length - 1] : null;

  /*
  LIVE WAYPOINTS
  */

  useEffect(() => {
    if (!order?.id || !order?.driver_id) return;
    const orderId = Number(order.id);

    const onWaypoint = (row: any) => {
      if (Number(row?.order_id) !== orderId) return;
      setDriverWaypoints((prev) => [
        ...prev,
        { latitude: Number(row.lat), longitude: Number(row.long) },
      ]);
    };

    supabaseEvents.on("waypoint_insert", onWaypoint);
    startWaypointEvents(orderId);

    return () => {
      supabaseEvents.off("waypoint_insert", onWaypoint);
      stopWaypointEvents();
    };
  }, [order?.id, order?.driver_id]);

  /*
  SMOOTH DRIVER MARKER
  */

  const driverMarker = useRef<AnimatedRegion | null>(null);
  // First position is placed directly; later ones glide from it
  if (driverLocation && !driverMarker.current) {
    driverMarker.current = new AnimatedRegion({
      ...driverLocation,
      latitudeDelta: 0,
      longitudeDelta: 0,
    });
  }

  useEffect(() => {
    if (!driverLocation || !driverMarker.current) return;
    driverMarker.current
      .timing({
        ...driverLocation,
        latitudeDelta: 0,
        longitudeDelta: 0,
        duration: MARKER_GLIDE_MS,
        useNativeDriver: false,
      } as any)
      .start();
  }, [driverLocation?.latitude, driverLocation?.longitude]);

  /*
  ROUTE ORIGIN (throttled)
  */

  // Where the drawn route and ETA start from; moves with the rider at most
  // once per ROUTE_REFRESH_MS
  const [routeAnchor, setRouteAnchor] = useState<LatLng | null>(null);
  const lastRouteAt = useRef(0);

  useEffect(() => {
    if (!driverLocation) return;
    if (!routeAnchor || Date.now() - lastRouteAt.current >= ROUTE_REFRESH_MS) {
      lastRouteAt.current = Date.now();
      setRouteAnchor(driverLocation);
    }
  }, [driverLocation]);

  /*
  FIT MAP
  */

  useEffect(() => {
    if (!mapRef.current || StoreLoading || !pickupLocation || !destination)
      return;

    const coordinates: LatLng[] = [pickupLocation, destination];
    if (driverLocation) coordinates.push(driverLocation);

    setTimeout(() => {
      mapRef.current?.fitToCoordinates(coordinates, {
        edgePadding: { top: 100, right: 50, bottom: 420, left: 50 },
        animated: true,
      });
    }, 500);
  }, [pickupLocation, destination, driverLocation, StoreLoading]);

  if (StoreLoading || !pickupLocation || !destination) {
    return (
      <View className="flex-1 justify-center items-center bg-black">
        <ActivityIndicator size="large" color={ORANGE} />
        <Text className="mt-4 text-gray-400">
          {StoreLoading ? "Loading delivery..." : "Coordinates unavailable"}
        </Text>
      </View>
    );
  }

  const status = order?.status ?? "pending";
  const isCancelled = status === "cancelled";
  // Nothing left to track: no route, ETA or contact buttons
  const isDelivered = status === "delivered" || isCancelled;
  const hasDriver = !!order?.driver_id;

  // Paid app orders can be cancelled any time before delivery. Refunds:
  // full with no rider yet, none once one is assigned; after pickup the
  // rider also takes the package back to the pickup point.
  const canCancel =
    !!order?.payment_reference && !isDelivered && status !== "awaiting_payment";

  const cancelOrder = () => {
    if (!order?.payment_reference) return;
    const reference = order.payment_reference;
    const pickedUp = cycleStage(order) >= 2;

    Alert.alert(
      "Cancel this delivery?",
      pickedUp
        ? "Your rider has already collected the package. You won't get a refund, and the rider will bring the package back to the pickup point. You'll get a code to confirm you've received it."
        : hasDriver
          ? "A rider has already accepted this delivery, so you won't get a refund."
          : "You'll get a full refund to your payment method.",
      [
        { text: "Keep it", style: "cancel" },
        {
          text: "Cancel delivery",
          style: "destructive",
          onPress: async () => {
            setCancelling(true);
            const { data, error } = await cancelPaidOrder(reference);
            setCancelling(false);

            if (!data) {
              Alert.alert("Couldn't cancel", error ?? "Please try again.");
              return;
            }

            useCustomerDeliveryStore
              .getState()
              .updateDeliveryStatus(order.id, "cancelled");
            setShowDriver(false);
            Alert.alert(
              "Delivery cancelled",
              data.refund_amount != null && data.refund_amount > 0
                ? `₦${data.refund_amount.toLocaleString()} will be refunded to your payment method.`
                : pickedUp
                  ? "Your rider is bringing the package back to the pickup point."
                  : "Your delivery has been cancelled.",
              [{ text: "OK", onPress: () => router.back() }],
            );
          },
        },
      ],
    );
  };

  // Remaining route: rider → pickup (until collected) → drop-off
  const routeOrigin = routeAnchor ?? pickupLocation;
  const routeVia =
    routeAnchor && cycleStage(order) < 2 ? [pickupLocation] : [];

  const arrivalText =
    !isDelivered && etaMinutes != null
      ? new Date(Date.now() + etaMinutes * 60_000)
          .toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
          .toLowerCase()
          .replace(" ", "")
      : null;

  const riderAvatar = rider?.profileImage
    ? { uri: rider.profileImage }
    : IMAGES.profile_img;

  const contactButtons = (
    <View className="flex-row items-center gap-3 mt-5">
      <TouchableOpacity
        onPress={callRider}
        className="flex-1 h-14 rounded-full bg-[#EE7F3A] flex-row justify-center items-center gap-2"
      >
        <Ionicons name="call" size={20} color="white" />
        <Text className="text-white text-lg font-bold">Call Driver</Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => openOrderChat(Number(order!.id))}
        className="w-14 h-14 rounded-full bg-[#EE7F3A] justify-center items-center"
      >
        <Ionicons name="chatbubble-ellipses" size={24} color="white" />
      </TouchableOpacity>
    </View>
  );

  return (
    <View className="flex-1 bg-black">
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        customMapStyle={DARK_MAP_STYLE}
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
          title="Pick up"
          description={order?.pickup_name || "Pickup Point"}
          anchor={{ x: 0.5, y: 1 }}
        >
          <MaterialCommunityIcons name="map-marker-outline" size={34} color="white" />
        </Marker>

        {/* Destination */}
        <Marker
          coordinate={destination}
          title="Deliver to"
          description={order?.dropoff_name || "Drop-off Point"}
          anchor={{ x: 0.5, y: 1 }}
        >
          <MaterialCommunityIcons name="map-marker" size={34} color={ORANGE} />
        </Marker>

        {/* Route */}
        {!isDelivered && (
          <MapViewDirections
            origin={routeOrigin}
            waypoints={routeVia}
            destination={destination}
            apikey={GOOGLE_MAPS_API_KEY}
            strokeWidth={4}
            strokeColor={ORANGE}
            onReady={(result) => setEtaMinutes(result.duration)}
            onError={(err) => console.warn("Directions error:", err)}
          />
        )}

        {/* Driver Marker */}
        {driverLocation && driverMarker.current && (
          <MarkerAnimated
            coordinate={driverMarker.current as any}
            anchor={{ x: 0.5, y: 0.5 }}
          >
            <Image
              source={IMAGES.map_rider}
              style={{ width: 40, height: 40 }}
              resizeMode="contain"
            />
          </MarkerAnimated>
        )}
      </MapView>

      {/* Track package sheet */}
      <SafeAreaView
        edges={["bottom"]}
        className="absolute bottom-0 left-0 right-0 bg-black rounded-t-3xl border-t-2 border-[#EE7F3A] px-5 pt-5 pb-2"
      >
        <View className="flex-row items-center gap-4">
          <DeliveryRing stage={cycleStage(order)} />
          <View className="flex-1">
            <Text className="text-white text-xl font-bold">
              #{order?.order_code}
            </Text>
            <Text className="text-gray-400 text-sm mt-0.5">
              {arrivalText
                ? `Arriving by ${arrivalText}`
                : STATUS_LABEL[status] ?? status}
            </Text>
          </View>

          {/* Driver chip reopens the driver sheet */}
          {hasDriver && (
            <TouchableOpacity onPress={() => setShowDriver(true)}>
              <Image source={riderAvatar} className="w-11 h-11 rounded-full" />
            </TouchableOpacity>
          )}
        </View>

        {/* Pick up / Deliver to */}
        <View className="mt-5">
          <View className="flex-row gap-3">
            <View className="items-center">
              <MaterialCommunityIcons name="map-marker-outline" size={22} color="white" />
              <View className="flex-1 border-l border-dashed border-gray-500 my-1" />
            </View>
            <View className="flex-1 pb-4">
              <Text className="text-gray-400 text-xs">Pick up</Text>
              <Text className="text-white text-base" numberOfLines={1}>
                {order?.pickup_name || "Not specified"}
              </Text>
            </View>
          </View>

          <View className="flex-row gap-3">
            <MaterialCommunityIcons name="map-marker" size={22} color={ORANGE} />
            <View className="flex-1">
              <Text className="text-gray-400 text-xs">Deliver to</Text>
              <Text className="text-white text-base" numberOfLines={1}>
                {order?.dropoff_name || "Not specified"}
              </Text>
            </View>
          </View>
        </View>

        {hasDriver && !isDelivered && contactButtons}

        {canCancel && (
          <TouchableOpacity
            onPress={cancelOrder}
            disabled={cancelling}
            className="self-center mt-3 py-2 px-4"
          >
            {cancelling ? (
              <ActivityIndicator color="#F87171" />
            ) : (
              <Text className="text-red-400 font-semibold">Cancel delivery</Text>
            )}
          </TouchableOpacity>
        )}
      </SafeAreaView>

      {/* Driver sheet, over the track package sheet */}
      {showDriver && hasDriver && (
        <Pressable
          onPress={() => setShowDriver(false)}
          className="absolute inset-0 bg-black/50 justify-end"
        >
          <Pressable onPress={() => {}}>
            <SafeAreaView
              edges={["bottom"]}
              className="bg-black rounded-t-3xl border-t-2 border-[#EE7F3A] px-5 pt-3 pb-2"
            >
              <TouchableOpacity
                onPress={() => setShowDriver(false)}
                className="self-center py-2 px-6 mb-3"
              >
                <View className="w-10 h-1 rounded-full bg-[#3A3A3F]" />
              </TouchableOpacity>

              <Text className="text-gray-400 text-sm">Your rider</Text>

              <View className="flex-row items-center mt-3">
                <Image source={riderAvatar} className="w-16 h-16 rounded-full mr-4" />
                <View className="flex-1">
                  <Text className="text-white text-xl font-bold" numberOfLines={1}>
                    {rider?.name ?? "Loading..."}
                  </Text>
                  {(rider?.vehicle || rider?.licenseNumber) && (
                    <Text className="text-gray-400 text-sm" numberOfLines={1}>
                      {[rider?.vehicle, rider?.licenseNumber]
                        .filter(Boolean)
                        .join(" · ")}
                    </Text>
                  )}
                  {rider?.ridesCompleted != null && (
                    <Text className="text-gray-400 text-sm" numberOfLines={1}>
                      {rider.ridesCompleted}{" "}
                      {rider.ridesCompleted === 1 ? "ride" : "rides"} completed
                    </Text>
                  )}
                </View>
              </View>

              <View className="flex-row items-center gap-3 mt-4 bg-[#1C1C21] rounded-2xl px-4 py-3">
                <Ionicons name="call-outline" size={20} color="#9CA3AF" />
                <Text className="text-white text-base">
                  {rider?.phone ?? "No phone number"}
                </Text>
              </View>

              {!isDelivered && contactButtons}
            </SafeAreaView>
          </Pressable>
        </Pressable>
      )}
    </View>
  );
}
