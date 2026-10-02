import { IMAGES } from "@/assets/assetsData";
import type { RideQuote, RideType } from "@/lib/ride-request";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Image,
  ImageSourcePropType,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const RIDE_TYPES: { type: RideType; label: string; image: ImageSourcePropType }[] =
  [
    { type: "ASAP", label: "Asap", image: IMAGES.riderBikePizza },
    { type: "ASAPEXPRESS", label: "Asap Express", image: IMAGES.riderManTransit },
  ];

type Props = {
  itemLabel: string;
  quotes: RideQuote[];
  quotesLoading: boolean;
  rideType: RideType | null;
  booking: boolean;
  onEditItem: () => void;
  onSelectRideType: (type: RideType) => void;
  onBook: () => void;
};

export default function BookingSheet({
  itemLabel,
  quotes,
  quotesLoading,
  rideType,
  booking,
  onEditItem,
  onSelectRideType,
  onBook,
}: Props) {
  const selected = RIDE_TYPES.find((r) => r.type === rideType);
  const canBook = !!rideType && !booking;

  return (
    <View className="bg-black rounded-t-3xl px-3 pt-3 pb-2 gap-3">
      <View className="self-center w-8 h-1 rounded-full bg-[#3A3A3F]" />

      {/* Back to specifications to edit the item */}
      <TouchableOpacity
        onPress={onEditItem}
        className="self-start flex-row items-center gap-1 border border-[#EE7F3A] rounded-full px-3 py-1"
      >
        <Text className="text-white text-lg font-semibold" numberOfLines={1}>
          {itemLabel}
        </Text>
        <Ionicons name="chevron-down" size={16} color="white" />
      </TouchableOpacity>

      {RIDE_TYPES.map(({ type, label, image }) => {
        const quote = quotes.find((q) => q.ride_type === type);
        const isSelected = type === rideType;
        return (
          <TouchableOpacity
            key={type}
            onPress={() => onSelectRideType(type)}
            className={`flex-row items-center rounded-2xl p-3 bg-[#1C1C21] ${
              isSelected ? "border-2 border-[#EE7F3A]" : "opacity-70"
            }`}
          >
            <Image
              source={image}
              className="w-20 h-16 rounded-lg"
              resizeMode="cover"
            />
            <View className="flex-1 ml-4">
              <Text className="text-white text-lg font-semibold">{label}</Text>
              {quote && (
                <Text className="text-gray-300 text-sm">
                  {Math.ceil(quote.estimated_time_min)} min{"   "}
                  {quote.distance_km.toFixed(1)}km
                </Text>
              )}
            </View>
            <View className="items-end">
              {quotesLoading ? (
                <ActivityIndicator color="white" />
              ) : quote ? (
                <>
                  <Text className="text-white text-2xl font-bold">
                    ₦{quote.estimated_price}
                  </Text>
                  {quote.original_price != null && (
                    <Text className="text-gray-400 line-through">
                      ₦{quote.original_price}
                    </Text>
                  )}
                </>
              ) : (
                <Text className="text-gray-400">—</Text>
              )}
            </View>
          </TouchableOpacity>
        );
      })}

      <TouchableOpacity
        onPress={onBook}
        disabled={!canBook}
        className={`h-14 rounded-full bg-[#EE7F3A] justify-center items-center mt-1 ${
          canBook ? "" : "opacity-50"
        }`}
      >
        {booking ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text className="text-white text-lg font-bold">
            {selected ? `Book ${selected.label}` : "Choose a ride type"}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
