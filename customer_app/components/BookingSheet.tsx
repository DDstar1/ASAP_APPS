import { IMAGES } from "@/assets/assetsData";
import PriceBreakdown from "@/components/PriceBreakdown";
import type { RideQuote, RideType } from "@/lib/ride-request";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageSourcePropType,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const RIDE_TYPES: { type: RideType; label: string; image: ImageSourcePropType }[] =
  [
    { type: "ASAP", label: "Asap", image: IMAGES.rideAsap },
    { type: "ASAPEXPRESS", label: "Asap Express", image: IMAGES.rideExpress },
  ];

type Props = {
  itemLabel: string;
  quotes: RideQuote[];
  quotesLoading: boolean;
  // Why prices didn't load, if they didn't
  quoteError?: string | null;
  onRetryQuotes?: () => void;
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
  quoteError,
  onRetryQuotes,
  rideType,
  booking,
  onEditItem,
  onSelectRideType,
  onBook,
}: Props) {
  const selected = RIDE_TYPES.find((r) => r.type === rideType);
  const canBook = !!rideType && !booking;
  // Ride type whose price breakdown is open (held down)
  const [breakdownFor, setBreakdownFor] = useState<RideType | null>(null);
  const breakdownQuote = quotes.find((q) => q.ride_type === breakdownFor);
  const breakdownLabel = RIDE_TYPES.find((r) => r.type === breakdownFor)?.label;

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
    <View className="bg-black rounded-t-3xl px-4 pt-3 pb-3 gap-3.5">
      {/* Discount tab sits on the sheet's top edge */}
      {discountPct > 0 && (
        <View
          className="absolute -top-8 left-6 bg-[#FF7518] rounded-t-xl px-4 h-8 justify-center"
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
        className="self-start flex-row items-center gap-1 border border-[#FF7518] rounded-full px-4 min-h-[36px]"
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
            onLongPress={quote ? () => setBreakdownFor(type) : undefined}
            delayLongPress={350}
            accessibilityRole="radio"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={label}
            accessibilityHint="Hold to see the price breakdown"
            className={`flex-row items-center rounded-3xl px-4 py-4 min-h-[104px] bg-[#212126] border-2 ${
              isSelected ? "border-[#FF7518]" : "border-transparent opacity-60"
            }`}
          >
            <Image
              source={image}
              className="w-24 h-20"
              resizeMode="contain"
            />
            <View className="flex-1 ml-4">
              <Text className="text-white text-xl font-semibold">{label}</Text>
              {quote && (
                <Text className="text-gray-300 text-sm mt-1">
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
                  <Text className="text-white text-[26px] font-bold">
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

      {!quotesLoading && !!quoteError && (
        <View className="flex-row items-start gap-2 rounded-2xl bg-red-500/10 px-4 py-3">
          <Ionicons name="alert-circle-outline" size={18} color="#F87171" />
          <Text className="flex-1 text-red-300 text-sm">{quoteError}</Text>
          {onRetryQuotes && (
            <TouchableOpacity onPress={onRetryQuotes} accessibilityRole="button" hitSlop={8}>
              <Text className="text-white text-sm font-semibold">Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      <TouchableOpacity
        onPress={onBook}
        disabled={!canBook}
        className={`h-14 rounded-full bg-[#FF7518] justify-center items-center mt-1 ${
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

      <Text className="text-gray-500 text-xs text-center">
        Hold a ride type to see the price breakdown
      </Text>

      <Modal
        visible={!!breakdownQuote}
        transparent
        animationType="fade"
        onRequestClose={() => setBreakdownFor(null)}
      >
        <Pressable
          onPress={() => setBreakdownFor(null)}
          className="flex-1 bg-black/60 justify-center px-6"
        >
          <Pressable onPress={() => {}} className="bg-[#1C1C21] rounded-3xl p-6">
            {breakdownQuote && (
              <>
                <Text className="text-white text-xl font-bold mb-1">
                  {breakdownLabel} price
                </Text>
                <Text className="text-gray-400 text-sm mb-5">
                  {Math.ceil(breakdownQuote.estimated_time_min)} min ·{" "}
                  {breakdownQuote.distance_km.toFixed(1)}km
                </Text>
                <PriceBreakdown
                  total={breakdownQuote.estimated_price}
                  insurance={breakdownQuote.insurance ?? 0}
                  saved={
                    breakdownQuote.original_price != null
                      ? breakdownQuote.original_price - breakdownQuote.estimated_price
                      : 0
                  }
                />
                <TouchableOpacity
                  onPress={() => setBreakdownFor(null)}
                  className="h-12 rounded-full bg-[#2C2C30] justify-center items-center mt-6"
                >
                  <Text className="text-white font-semibold">Close</Text>
                </TouchableOpacity>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
