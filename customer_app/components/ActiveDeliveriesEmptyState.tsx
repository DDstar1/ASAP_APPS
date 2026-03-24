import React, { useEffect, useRef } from "react";
import { Animated, Easing, Text, View } from "react-native";

/**
 * ActiveDeliveriesEmptyState
 * Kinetic Noir — NativeWind (className) version.
 *
 * Drop-in for the FlatList's ListEmptyComponent in orders.tsx.
 * Pass `width` (Dimensions.get("window").width) so the card spans
 * the full slot just like a real IncompleteDeliveryCard.
 */

type Props = { width: number };

const ActiveDeliveriesEmptyState = ({ width }: Props) => {
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Pulsing orange glow halo
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Gentle vertical float
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 2400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Animated values — kept in style because NativeWind can't interpolate these
  const glowOpacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.2, 0.55],
  });
  const glowScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.9, 1.35],
  });
  const floatY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -7],
  });

  return (
    /* Outer card — surface-container-high, no stroke (No-Line rule) */
    <View
      className="bg-[#111827] rounded-[20px] py-7 px-6 items-center my-3 overflow-hidden"
      style={{ width: width - 48 }}
    >
      {/* ── Icon block with float + glow ── */}
      <Animated.View
        className="items-center justify-center mb-5 w-[88px] h-[88px]"
        style={{ transform: [{ translateY: floatY }] }}
      >
        {/* Orange glow halo — animated opacity + scale, must stay in style */}
        <Animated.View
          className="absolute w-[88px] h-[88px] rounded-full bg-[#ff923e]"
          style={{ opacity: glowOpacity, transform: [{ scale: glowScale }] }}
        />

        {/* Dark icon circle — surface-container-highest */}
        <View className="w-[72px] h-[72px] rounded-full bg-[#1a2235] items-center justify-center z-10">
          {/* Swap with MY_ICONS.truck("#ff923e", 30) if preferred */}
          <Text className="text-[30px]">🚚</Text>
        </View>

        {/* Live status dot */}
        <View className="absolute bottom-1 right-1 w-3.5 h-3.5 rounded-full bg-[#ff923e] border-2 border-[#111827] z-20" />
      </Animated.View>

      {/* ── Copy ── */}
      <View className="items-center gap-1.5">
        <Text className="text-base font-bold text-[#e0e5f9] text-center -tracking-[0.2px]">
          No active deliveries
        </Text>
        <Text className="text-[13px] text-[#a5abbd] text-center leading-[19px] max-w-[220px]">
          Start a new order to see it here.
        </Text>
      </View>

      {/* Ghost dashed border overlay — outline-variant @ 15% opacity */}
      {/* borderStyle:"dashed" has no Tailwind utility, so style prop is required here */}
      <View
        pointerEvents="none"
        className="absolute inset-0 rounded-[20px]"
        style={{
          borderWidth: 1,
          borderStyle: "dashed",
          borderColor: "rgba(165,171,189,0.15)",
        }}
      />
    </View>
  );
};

export default ActiveDeliveriesEmptyState;
