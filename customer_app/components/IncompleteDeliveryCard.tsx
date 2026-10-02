import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

import { IMAGES, MY_ICONS } from "@/assets/assetsData";
import {
  CustomerDelivery,
  useCustomerDeliveryStore,
} from "@/store/useCustomerDeliveriesStore";
import { openOrderChat } from "@/utils/my_utils";
import { confirmPickup } from "@/lib/supabase-app-functions";
import { router } from "expo-router";

type Props = {
  item: CustomerDelivery;
  width: number;
};

const IncompleteDeliveryCard = ({ item, width }: Props) => {
  const rawStatus = item.status;
  const normalizedStatus = rawStatus?.trim().toLowerCase();
  const [cancelling, setCancelling] = useState(false);
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [pickupCode, setPickupCode] = useState("");
  const [confirming, setConfirming] = useState(false);

  const pulseProgress = useSharedValue(0);
  const { removeDelivery, unreadCounts, fetchAllDeliveries } =
    useCustomerDeliveryStore();

  const unreadCount = unreadCounts?.[String(item.id)] ?? 0;

  useEffect(() => {
    if (normalizedStatus === "pending") {
      pulseProgress.value = withRepeat(
        withTiming(1, { duration: 600 }),
        -1,
        true,
      );
    } else {
      pulseProgress.value = 0;
    }
  }, [normalizedStatus]);

  const pulseStyle = useAnimatedStyle(() => ({
    opacity:
      normalizedStatus === "pending"
        ? interpolate(pulseProgress.value, [0, 1], [0.3, 1])
        : 1,
    transform:
      normalizedStatus === "pending"
        ? [{ scale: interpolate(pulseProgress.value, [0, 1], [0.6, 20]) }]
        : [{ scale: 1 }],
  }));

  const pickedUp =
    !!item.is_pickup_code_authenticated || normalizedStatus === "in_transit";

  const closePickupModal = () => {
    setPickupCode("");
    setShowPickupModal(false);
  };

  // Rust moves the order to in_transit; realtime updates the status and the
  // refetch picks up is_pickup_code_authenticated
  const handleConfirmPickup = async () => {
    setConfirming(true);
    const result = await confirmPickup(item.order_code, pickupCode.trim());
    setConfirming(false);
    if (result.success) {
      closePickupModal();
      fetchAllDeliveries();
      Alert.alert("Pickup confirmed ✓", "Your package is on its way.");
    } else {
      setPickupCode("");
      Alert.alert("Invalid code", result.error || "The code is incorrect.");
    }
  };

  const handleCancel = () => {
    Alert.alert(
      "Cancel Order",
      `Are you sure you want to cancel order #${item.order_code}?`,
      [
        { text: "Keep Order", style: "cancel" },
        {
          text: "Cancel Order",
          style: "destructive",
          onPress: async () => {
            setCancelling(true);
            try {
              removeDelivery(item.order_code);
            } catch (err) {
              setCancelling(false);
              Alert.alert("Error", "Failed to cancel order. Please try again.");
            }
          },
        },
      ],
    );
  };

  return (
    <View
      style={{ width: width * 0.9, height: "100%" }}
      className="bg-[#3C3C43] h-fit rounded-2xl gap-2 flex items-center flex-row overflow-hidden relative p-3 mr-4"
    >
      {/* Top-right action buttons */}
      <View className="absolute top-3 z-20 right-3 flex-col gap-3">
        {/* Map button */}
        <TouchableOpacity
          onPress={() =>
            router.replace({
              pathname: "/trackPackage",
              params: { order_id: item.id },
            })
          }
          className="p-2 bg-gray-200 rounded-full"
        >
          {MY_ICONS.map("black", 25)}
        </TouchableOpacity>

        {/* Message button — hidden while pending */}
        {normalizedStatus !== "pending" && (
          <TouchableOpacity
            onPress={() => openOrderChat(item.id)}
            className="p-2 bg-gray-200 rounded-full"
          >
            {/* Icon + unread badge */}
            <View>
              {MY_ICONS.message("black", 25)}
              {unreadCount > 0 && (
                <View
                  className="absolute bg-red-500 rounded-full items-center justify-center"
                  style={{
                    top: -5,
                    right: -5,
                    minWidth: 17,
                    height: 17,
                    paddingHorizontal: 3,
                  }}
                >
                  <Text
                    style={{ fontSize: 9, lineHeight: 11 }}
                    className="text-white font-bold"
                  >
                    {unreadCount > 99 ? "99+" : unreadCount}
                  </Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}

        {/* Cancel button — only while pending */}
        {normalizedStatus === "pending" && (
          <TouchableOpacity
            onPress={handleCancel}
            disabled={cancelling}
            className="p-2 bg-red-500/90 rounded-full"
          >
            {cancelling ? (
              <ActivityIndicator size={25} color="white" />
            ) : (
              MY_ICONS.cancel("white", 25)
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Left Side */}
      <View className="flex-1 mr-20 z-10">
        <Text selectable className="text-white text-lg font-bold mb-2">
          #{item.order_code}
        </Text>

        <Text className="text-gray-400 text-xs mb-1">Pickup</Text>
        <View className="flex-row items-center mb-2">
          {MY_ICONS.location("#9CA3AF", 14)}
          <Text numberOfLines={2} className="text-white text-sm ml-2">
            {item.pickup_name || "Unknown"}
          </Text>
        </View>

        <Text className="text-gray-400 text-xs mb-1">Dropoff</Text>
        <View className="flex-row items-center mb-2">
          {MY_ICONS.location("#9CA3AF", 14)}
          <Text numberOfLines={2} className="text-white text-sm ml-2">
            {item.dropoff_name || "Unknown"}
          </Text>
        </View>

        <View className="flex-row items-center">
          {/* Status Section */}
          <View className="flex-1">
            <Text
              className={`text-gray-400 text-xs mb-1 ${
                normalizedStatus === "pending" ? "ml-[63px]" : ""
              }`}
            >
              Status
            </Text>

            <View className="flex-row items-center relative">
              {/* Pulsating background effect */}
              <Animated.View
                style={[
                  pulseStyle,
                  {
                    opacity: 0.1,
                    position: "absolute",
                    zIndex: -20,
                    left: 0,
                  },
                ]}
              >
                {MY_ICONS.circle(item.statusColor ?? "#c5a722", 7)}
              </Animated.View>

              {/* Static foreground circle */}
              <View style={{ zIndex: 10 }}>
                {MY_ICONS.circle(item.statusColor ?? "#c5a722", 7)}
              </View>

              <View className="ml-2 flex-1">
                <Text
                  className={`text-white text-sm ${
                    normalizedStatus === "pending" ? "ml-[50px]" : ""
                  }`}
                >
                  {rawStatus?.replace("_", " ")}
                </Text>

                {normalizedStatus === "pending" && (
                  <Text className="ml-[50px] text-gray-400 text-xs">
                    Awaiting a rider...
                  </Text>
                )}
              </View>
            </View>
          </View>

          {/* Code Section */}
          <View>
            <Text className="text-gray-400 text-xs">Pickup</Text>
            {pickedUp ? (
              <Text className="text-white text-xs font-semibold mb-1">
                Confirmed ✓
              </Text>
            ) : normalizedStatus === "arriving_pickup" ? (
              <TouchableOpacity
                onPress={() => setShowPickupModal(true)}
                className="bg-[#ff923e] rounded-full px-2 py-1 mb-1 self-start"
              >
                <Text className="text-black text-xs font-semibold">
                  Enter code
                </Text>
              </TouchableOpacity>
            ) : (
              <Text className="text-white text-xs font-semibold mb-1">—</Text>
            )}
            <Text className="text-gray-400 text-xs">Dropoff Code</Text>
            <Text
              selectable
              className="text-white text-xs font-semibold tracking-wider"
            >
              {item.dropoff_code}
            </Text>
          </View>
        </View>
      </View>

      {/* Map / Image */}
      <MaskedView
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: "50%",
          height: "110%",
        }}
        maskElement={
          <LinearGradient
            colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.3)"]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ flex: 1 }}
          />
        }
      >
        <Image
          source={IMAGES.indomie_package}
          style={{ width: "100%", height: "100%" }}
          resizeMode="cover"
        />
      </MaskedView>

      {/* Pickup code entry — the rider shows the code at pickup */}
      <Modal
        visible={showPickupModal}
        transparent
        animationType="fade"
        onRequestClose={closePickupModal}
      >
        <View className="flex-1 bg-black/70 justify-center px-6">
          <View className="bg-[#131a2e] rounded-3xl p-6">
            <Text className="text-[#e0e5f9] text-xl font-bold mb-1">
              Confirm pickup
            </Text>
            <Text className="text-[#a5abbd] text-sm mb-5">
              Enter the pickup code
            </Text>

            <TextInput
              value={pickupCode}
              onChangeText={setPickupCode}
              placeholder="Pickup code"
              placeholderTextColor="#3d4560"
              autoCapitalize="characters"
              autoCorrect={false}
              autoFocus
              maxLength={10}
              editable={!confirming}
              className="bg-[#080e1c] text-[#e0e5f9] text-2xl font-bold text-center tracking-[6px] rounded-2xl py-4 mb-5"
            />

            <TouchableOpacity
              onPress={handleConfirmPickup}
              disabled={confirming || pickupCode.trim().length < 4}
              className={`py-4 rounded-full items-center mb-3 ${
                confirming || pickupCode.trim().length < 4
                  ? "bg-[#1c2a42]"
                  : "bg-[#ff923e]"
              }`}
            >
              {confirming ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-black text-base font-semibold">
                  Confirm Pickup
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={closePickupModal}
              disabled={confirming}
              className="py-3 items-center"
            >
              <Text className="text-[#a5abbd] text-sm">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default IncompleteDeliveryCard;
