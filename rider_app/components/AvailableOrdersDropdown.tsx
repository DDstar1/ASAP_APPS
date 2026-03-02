import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, FlatList } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import Animated, {
  FadeInDown,
  FadeOutUp,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  LinearTransition,
} from "react-native-reanimated";
import OrderSummary from "@/components/OrderSummary";

interface AvailableOrdersDropdownProps {
  availableOrders: any[];
  showOrders: boolean;
  onToggle: () => void;
}

const AvailableOrdersDropdown: React.FC<AvailableOrdersDropdownProps> = ({
  availableOrders,
  showOrders,
  onToggle,
}) => {
  // Reanimated shared values
  const slide = useSharedValue(0);
  const opacity = useSharedValue(0);

  // Handle dropdown animation
  useEffect(() => {
    if (showOrders) {
      slide.value = withSpring(1, { damping: 12, stiffness: 120 });
      opacity.value = withTiming(1, { duration: 300 });
    } else {
      slide.value = withTiming(0, { duration: 250 });
      opacity.value = withTiming(0, { duration: 150 });
    }
  }, [showOrders]);

  // Animated styles for dropdown
  const dropdownStyle = useAnimatedStyle(() => {
    const translateY = interpolate(slide.value, [0, 1], [-20, 0]);
    const scale = interpolate(slide.value, [0, 1], [0.95, 1]);
    const maxHeight = interpolate(slide.value, [0, 1], [0, 400]);
    return {
      opacity: opacity.value,
      transform: [{ translateY }, { scale }],
      maxHeight,
    };
  });

  return (
    <LinearGradient
      colors={["#FDE68A", "#F59E0B"]}
      style={{ borderRadius: 20, padding: 15, overflow: "hidden" }}
    >
      <TouchableOpacity activeOpacity={0.85} onPress={onToggle}>
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center">
            <View className="w-12 h-12 bg-yellow-100 rounded-2xl justify-center items-center mr-4">
              <Ionicons name="cube-outline" size={26} color="#F59E0B" />
            </View>
            <Text className="text-base font-bold text-gray-900">
              {availableOrders.length} delivery order
              {availableOrders.length !== 1 ? "s" : ""} found!
            </Text>
          </View>
          <Ionicons
            name={showOrders ? "chevron-up" : "chevron-down"}
            size={22}
            color="#374151"
          />
        </View>
      </TouchableOpacity>

      <Animated.View
        entering={FadeInDown.duration(500)}
        exiting={FadeOutUp.duration(200)}
        style={dropdownStyle}
      >
        <FlatList
          data={availableOrders}
          keyExtractor={(item) => item.id.toString()}
          className="mt-3"
          renderItem={({ item }) => (
            <Animated.View
              layout={LinearTransition.springify()}
              entering={FadeInDown.duration(400).springify()}
              exiting={FadeOutUp.duration(300).springify()}
            >
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() =>
                  router.navigate({
                    pathname: "/order_detail",
                    params: { orderCode: item.order_code },
                  })
                }
              >
                <OrderSummary order={item} />
              </TouchableOpacity>
            </Animated.View>
          )}
          showsVerticalScrollIndicator
          nestedScrollEnabled
          style={{ maxHeight: 350, flexGrow: 0 }}
        />
      </Animated.View>
    </LinearGradient>
  );
};

export default AvailableOrdersDropdown;
