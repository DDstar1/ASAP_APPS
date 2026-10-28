import { Ionicons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

export const RADAR_ORANGE = "#FF7518";

// Rings with pulses spreading from the centre. Children are placed with RadarSpot.
export function Radar({
  size,
  active = true,
  center,
  children,
}: {
  size: number;
  active?: boolean;
  center: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <View style={{ width: size, height: size }} className="items-center justify-center">
      {[1, 0.68, 0.36].map((f) => (
        <View
          key={f}
          pointerEvents="none"
          style={{
            position: "absolute",
            width: size * f,
            height: size * f,
            borderRadius: (size * f) / 2,
            borderWidth: 1,
            borderColor: "rgba(255,117,24,0.2)",
          }}
        />
      ))}
      {active && [0, 1, 2].map((i) => <Pulse key={i} size={size} delay={i * 1100} />)}
      {children}
      {center}
    </View>
  );
}

function Pulse({ size, delay }: { size: number; delay: number }) {
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(
      delay,
      withRepeat(withTiming(1, { duration: 3300, easing: Easing.out(Easing.quad) }), -1),
    );
    return () => cancelAnimation(p);
  }, []);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: p.value }],
    opacity: interpolate(p.value, [0, 1], [0.3, 0]),
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: "absolute",
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: RADAR_ORANGE,
        },
        style,
      ]}
    />
  );
}

// A box whose anchor point sits at (x, y) from the radar's centre. The box
// stays inside its own bounds so touches work on Android.
export function RadarSpot({
  x,
  y,
  radarSize,
  width,
  height,
  anchorY = height / 2,
  children,
}: {
  x: number;
  y: number;
  radarSize: number;
  width: number;
  height: number;
  anchorY?: number;
  children: React.ReactNode;
}) {
  return (
    <View
      style={{
        position: "absolute",
        left: radarSize / 2 + x - width / 2,
        top: radarSize / 2 + y - anchorY,
        width,
        height,
        alignItems: "center",
      }}
    >
      {children}
    </View>
  );
}

// The landing page's map marker: orange bike with a ping
export function BikeMarker({ delay = 0, size = 40 }: { delay?: number; size?: number }) {
  const appear = useSharedValue(0);
  const ping = useSharedValue(0);
  useEffect(() => {
    appear.value = withDelay(
      delay,
      withTiming(1, { duration: 450, easing: Easing.out(Easing.back(1.8)) }),
    );
    ping.value = withDelay(delay, withRepeat(withTiming(1, { duration: 2200 }), -1));
    return () => {
      cancelAnimation(appear);
      cancelAnimation(ping);
    };
  }, []);
  const appearStyle = useAnimatedStyle(() => ({
    opacity: appear.value,
    transform: [{ scale: appear.value }],
  }));
  const pingStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(ping.value, [0, 1], [1, 2]) }],
    opacity: interpolate(ping.value, [0, 1], [0.4, 0]),
  }));

  return (
    <Animated.View
      style={[{ width: size, height: size, alignItems: "center", justifyContent: "center" }, appearStyle]}
    >
      <Animated.View
        style={[
          { position: "absolute", width: size, height: size, borderRadius: size / 2, backgroundColor: RADAR_ORANGE },
          pingStyle,
        ]}
      />
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: RADAR_ORANGE,
          borderWidth: 2,
          borderColor: "black",
          alignItems: "center",
          justifyContent: "center",
          shadowColor: RADAR_ORANGE,
          shadowOpacity: 0.55,
          shadowRadius: 10,
          elevation: 8,
        }}
      >
        <Ionicons name="bicycle" size={size * 0.5} color="white" />
      </View>
    </Animated.View>
  );
}
