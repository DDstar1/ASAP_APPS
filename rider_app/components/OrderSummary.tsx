import { cleanAddress, timeAgo } from "@/utils/utils_for_me";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Alert,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { useAcceptedDeliveryStore } from "@/store/useAcceptedDeliveriesStore";
import * as Location from "expo-location";
import { startTracking } from "@/utils/utils_orderLocationTracking";
import { acceptDeliveryOrder } from "@/lib/supabase-app-functions";
import { router } from "expo-router";

interface OrderSummaryProps {
  order: {
    id: number;
    order_code: string;
    pickup_name: string;
    dropoff_name: string;
    price: string;
    distance: string;
    eta: string;
    pickupTime: string;
    created_at: string;
  };
}

const OrderSummary = ({ order }: OrderSummaryProps) => {
  const { addAcceptedDelivery } = useAcceptedDeliveryStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleAcceptOrder = async (orderCode: string) => {
    if (isLoading) return; // prevent double tap

    try {
      setIsLoading(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission Denied", "Location permission required.");
        setIsLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;

      const result = await acceptDeliveryOrder(orderCode, latitude, longitude);

      if (result.success && result.data) {
        const acceptedOrder = result.data;

        addAcceptedDelivery(result.data);
        startTracking(acceptedOrder.id);

        Alert.alert("Order Accepted", "You have accepted this delivery!", [
          {
            text: "OK",
            onPress: () => {
              router.push({
                pathname: "/(tabs)/deliveries",
                params: {
                  newlyAcceptedId: acceptedOrder.id,
                  time_added: Date.now(),
                },
              });
            },
          },
        ]);
      } else {
        Alert.alert("Failed", result.error || "Could not accept order");
      }
    } catch (err) {
      console.error("Error accepting order:", err);
      Alert.alert("Error", "Failed to accept order. Try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View className="bg-white flex-col gap-3 rounded-2xl p-4 mb-3 border border-gray-100">
      {/* Header */}
      <View className="flex-row justify-between items-center mb-3">
        <View className="flex-row gap-1 items-center bg-gray-100 px-3 py-1 rounded-full">
          <Ionicons name="time-outline" size={14} color="#6B7280" />
          <Text className="text-xs text-gray-400 mr-2">
            Posted {timeAgo(order.created_at)}
          </Text>
        </View>
        <Text className="text-lg font-bold text-green-600">{order.price}</Text>
      </View>

      <View className="flex-row items-center justify-between">
        <View className="flex gap-3 w-10/12 justify-between">
          {/* Pickup */}
          <View className="flex-col items-start mb-2">
            <View className="flex-row items-center">
              <View className="w-7 h-7 bg-orange-100 rounded-lg justify-center items-center mr-2">
                <Ionicons name="restaurant" size={14} color="#F97316" />
              </View>
              <Text className="text-xs w-20 text-gray-500">Pickup</Text>
            </View>
            <Text className="text-xs text-gray-500 mt-0.5">
              {cleanAddress(order.pickup_name)}
            </Text>
          </View>

          {/* Dropoff */}
          <View className="flex-col items-start mb-2">
            <View className="flex-row items-center">
              <View className="w-7 h-7 bg-orange-100 rounded-lg justify-center items-center mr-2 mt-0.5">
                <Ionicons name="location" size={14} color="#3B82F6" />
              </View>
              <Text className="text-xs w-20 text-gray-500">Destination</Text>
            </View>
            <Text className="text-xs text-gray-500 mt-0.5">
              {cleanAddress(order.dropoff_name)}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          className={`h-8 px-4 py-2 self-end rounded-full justify-center items-center ${
            isLoading ? "bg-green-400" : "bg-green-600"
          }`}
          onPress={() => handleAcceptOrder(order.order_code)}
          activeOpacity={0.8}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text className="text-white text-xs font-semibold">Accept</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default OrderSummary;
