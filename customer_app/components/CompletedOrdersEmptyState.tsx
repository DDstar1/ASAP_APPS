import React, { useEffect, useRef } from "react";
import { Animated, Easing, Text, TouchableOpacity, View } from "react-native";

/**
 * CompletedOrdersEmptyState
 * Kinetic Noir — NativeWind (className) version.
 *
 * Drop-in for the SectionList's ListEmptyComponent in orders.tsx.
 * Pass optional `onSendPackage` to wire up the nudge CTA.
 */

type Props = {
  onSendPackage?: () => void;
  activeDeliveriesCount?: any; // For potential future use (e.g. "You have X active deliveries")
};

const CompletedOrdersEmptyState = ({
  activeDeliveriesCount,
  onSendPackage,
}: Props) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(16)).current;
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance: fade + slide up
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 480,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 480,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();

    // Icon tile shimmer loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  // Animated values stay in style — NativeWind can't interpolate these
  const iconOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.45, 1],
  });

  return (
    <Animated.View
      className="flex-1 justify-between px-5 pt-12"
      style={{
        opacity: fadeAnim,
        transform: [{ translateY: slideAnim }],
      }}
    >
      {/* ── Row: icon tile | text | chevron ── */}
      <View className="flex-row items-center gap-3.5 py-3.5">
        {/* Archive icon tile — shimmer via animated opacity */}
        <Animated.View
          className="w-[52px] h-[52px] rounded-[14px] bg-[#1a2235] items-center justify-center border border-white/[0.15]"
          style={{ opacity: iconOpacity }}
        >
          {/* Swap with MY_ICONS.archive or similar */}
          <Text className="text-[22px]">🗃️</Text>
        </Animated.View>

        {/* Text */}
        <View className="flex-1 gap-1">
          <Text className="text-sm font-semibold text-[#e0e5f9] -tracking-[0.1px]">
            No completed deliveries yet.
          </Text>
          <Text className="text-xs text-[#a5abbd] leading-[17px]">
            Your order history will appear here once a delivery is done.
          </Text>
        </View>

        {/* Chevron */}
        <Text className="text-[22px] text-[#3d4160] leading-6 mr-0.5">›</Text>
      </View>

      {/* Ghost separator — very low opacity, no hard 1px line */}
      {/* <View className="h-px bg-[#1F2230]/80 my-1" /> */}

      {/* Optional CTA nudge */}
      {onSendPackage && activeDeliveriesCount == 0 && (
        <TouchableOpacity
          onPress={onSendPackage}
          activeOpacity={0.75}
          className="self-start mt-3 py-3 px-3.5 w-full  rounded-full border border-[#ff923e]/25 bg-[#ff923e]/[0.07]"
        >
          <Text className="text-md font-semibold text-[#ff923e] text-center tracking-[0.1px]">
            + Send your first package
          </Text>
        </TouchableOpacity>
      )}
    </Animated.View>
  );
};

export default CompletedOrdersEmptyState;
