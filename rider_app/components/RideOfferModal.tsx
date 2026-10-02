import { respondToRideOffer } from "@/lib/ride-offers";
import { useAcceptedDeliveryStore } from "@/store/useAcceptedDeliveriesStore";
import { useRideOfferStore } from "@/store/useRideOfferStore";
import { startTracking } from "@/utils/utils_orderLocationTracking";
import { cleanAddress } from "@/utils/utils_for_me";
import { Ionicons } from "@expo/vector-icons";
import { useIsFocused } from "@react-navigation/native";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

// Shown on the home tab when Rust offers this rider a delivery. A <Modal>
// covers the whole app and tabs stay mounted, so it only renders while home
// is focused; otherwise the offer waits in the store until the rider is back.
export function RideOfferModal() {
  const isFocused = useIsFocused();
  const offer = useRideOfferStore((s) => s.offer);
  const dismissOffer = useRideOfferStore((s) => s.dismissOffer);
  const fetchAcceptedDeliveries = useAcceptedDeliveryStore(
    (s) => s.fetchAcceptedDeliveries,
  );

  const [secondsLeft, setSecondsLeft] = useState(0);
  const [responding, setResponding] = useState<"accept" | "decline" | null>(
    null,
  );

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

  const respond = async (accepted: boolean) => {
    if (responding) return;
    setResponding(accepted ? "accept" : "decline");

    const result = await respondToRideOffer(offer.offer_id, accepted);
    setResponding(null);

    if (!result.success) {
      if (result.expired) dismissOffer(offer.offer_id);
      Alert.alert(accepted ? "Couldn't accept" : "Couldn't decline", result.error);
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

  return (
    <Modal transparent animationType="slide" visible>
      <View className="flex-1 justify-end bg-black/50">
        <View className="bg-white rounded-t-3xl p-6 pb-10 gap-4">
          <View className="flex-row justify-between items-center">
            <Text className="text-xl font-bold text-gray-900">
              New delivery request
            </Text>
            <View className="bg-orange-100 px-3 py-1 rounded-full">
              <Text className="text-orange-600 font-semibold">
                {secondsLeft}s
              </Text>
            </View>
          </View>

          <View className="gap-3">
            <View className="flex-row items-start gap-3">
              <Ionicons name="radio-button-on" size={18} color="#F97316" />
              <View className="flex-1">
                <Text className="text-xs text-gray-500">Pickup</Text>
                <Text className="text-sm text-gray-900">
                  {cleanAddress(offer.pickup_name ?? "") || "—"}
                </Text>
              </View>
            </View>
            <View className="flex-row items-start gap-3">
              <Ionicons name="location" size={18} color="#3B82F6" />
              <View className="flex-1">
                <Text className="text-xs text-gray-500">Drop-off</Text>
                <Text className="text-sm text-gray-900">
                  {cleanAddress(offer.dropoff_name ?? "") || "—"}
                </Text>
              </View>
            </View>
            {(offer.package_type || offer.image_url) && (
              <View className="flex-row items-center gap-3">
                <Ionicons name="cube-outline" size={18} color="#6B7280" />
                <Text className="flex-1 text-sm text-gray-700">
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
          </View>

          <View className="flex-row gap-3 mt-2">
            <TouchableOpacity
              className="flex-1 h-12 rounded-full border border-gray-300 justify-center items-center"
              onPress={() => respond(false)}
              disabled={!!responding}
            >
              {responding === "decline" ? (
                <ActivityIndicator color="#6B7280" />
              ) : (
                <Text className="text-gray-700 font-semibold">Decline</Text>
              )}
            </TouchableOpacity>
            <TouchableOpacity
              className="flex-1 h-12 rounded-full bg-green-600 justify-center items-center"
              onPress={() => respond(true)}
              disabled={!!responding}
            >
              {responding === "accept" ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-white font-semibold">Accept</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
