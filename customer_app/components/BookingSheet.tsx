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

  // Biggest saving Rust is offering on either ride type
  const discountPct = quotes.reduce((best, q) => {
    if (q.original_price == null || q.original_price <= q.estimated_price)
      return best;
    const pct = Math.round(
      ((q.original_price - q.estimated_price) / q.original_price) * 100,
    );
    return Math.max(best, pct);
  }, 0);

  return (
    <View className="bg-black rounded-t-3xl px-3 pt-3 pb-2 gap-3">
      {/* Discount tab sits on the sheet's top edge */}
      {discountPct > 0 && (
        <View
          className="absolute -top-8 left-6 bg-[#EE7F3A] rounded-t-xl px-4 h-8 justify-center"
          accessibilityLabel={`${discountPct} percent discount applied`}
        >
          <Text className="text-white text-sm font-bold">
            {discountPct}% discount
          </Text>
        </View>
      )}

      <View className="self-center w-10 h-1 rounded-full bg-[#3A3A3F]" />

      {/* Back to specifications to edit the item */}
      <TouchableOpacity
        onPress={onEditItem}
        accessibilityRole="button"
        accessibilityLabel={`Item: ${itemLabel}. Edit item`}
        className="self-start flex-row items-center gap-1 border border-[#EE7F3A] rounded-full px-4 min-h-[36px]"
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
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={label}
            className={`flex-row items-center rounded-2xl p-3 bg-[#212126] border-2 ${
              isSelected ? "border-[#EE7F3A]" : "border-transparent opacity-60"
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
                    ₦{quote.estimated_price.toLocaleString()}
                  </Text>
                  {quote.original_price != null &&
                    quote.original_price > quote.estimated_price && (
                      <Text className="text-gray-400 line-through">
                        ₦{quote.original_price.toLocaleString()}
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
