import { Animated } from "react-native";
import { useEffect, useRef } from "react";

// Add this hook inside RiderHomeScreen (or as a separate component)
export const PulseDot = ({ isOnline }: { isOnline: boolean }) => {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!isOnline) {
      pulse.setValue(1);
      return;
    }

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 0.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    return () => pulse.stopAnimation();
  }, [isOnline]);

  return (
    <Animated.View
      style={{ opacity: pulse }}
      className={`w-2 h-2 rounded-full ${
        isOnline ? "bg-[#ff923e]" : "bg-[#a5abbd]"
      }`}
    />
  );
};
