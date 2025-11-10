import React from "react";
import { TouchableOpacity, Text, ActivityIndicator, View } from "react-native";

interface DeliveryButtonProps {
  pickup?: string | null;
  destination?: string | null;
  price?: number | null;
  loading?: boolean;
  hasMultipleRiders?: boolean;
  onConfirmLocations?: () => void;
  onSearchRider?: () => void;
  onConfirmDelivery?: () => void;
  onCycleRider?: () => void;
}

export default function DeliveryButton({
  pickup,
  destination,
  price,
  loading = false,
  hasMultipleRiders,
  onConfirmLocations,
  onSearchRider,
  onConfirmDelivery,
  onCycleRider,
}: DeliveryButtonProps) {
  type Stage =
    | "confirmLocations"
    | "searching"
    | "searchRider"
    | "confirmDelivery";

  const getStage = (): Stage => {
    if (!pickup || !destination) return "confirmLocations";
    if (loading) return "searching";
    if (!price) return "searchRider";
    return "confirmDelivery";
  };

  const stage = getStage();

  const getLabel = (): string => {
    switch (stage) {
      case "confirmLocations":
        return "Confirm Locations";
      case "searching":
        return "Searching for Closest Rider...";
      case "searchRider":
        return "Search for Closest Rider";
      case "confirmDelivery":
        return `Confirm Delivery – ₦${price}`;
    }
  };

  const handlePress = (): void => {
    switch (stage) {
      case "confirmLocations":
        onConfirmLocations?.();
        break;
      case "searchRider":
        onSearchRider?.();
        break;
      case "confirmDelivery":
        onConfirmDelivery?.();
        break;
    }
  };

  const isDisabled = stage === "searching";

  return (
    <View className="mt-4 flex-1">
      {/* Main button */}
      <TouchableOpacity
        className={`rounded-xl px-4 py-4 bg-orange-500 ${
          isDisabled ? "opacity-50" : ""
        }`}
        disabled={isDisabled}
        onPress={handlePress}
      >
        {stage === "searching" ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white text-center font-semibold text-lg">
            {getLabel()}
          </Text>
        )}
      </TouchableOpacity>

      {/* Secondary “Cycle Rider” button */}
      {hasMultipleRiders && (
        <TouchableOpacity
          className="mt-3  bg-gray-700 p-1 rounded-lg w-full self-center"
          onPress={onCycleRider}
        >
          <Text className="text-white text-center text-sm ">
            🔄 View Next Rider
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
