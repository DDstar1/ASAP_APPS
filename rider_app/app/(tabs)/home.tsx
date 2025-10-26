import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  StatusBar,
  Image,
  FlatList,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { IMAGES } from "@/assets/assetsData";
import OrderSummary from "@/components/OrderSummary";
import { deliveryOrders } from "@/utils/deliveryOrders";

// ✅ Reanimated imports
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  FadeInDown,
  FadeOutUp,
} from "react-native-reanimated";

const RiderHomeScreen = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [showOrders, setShowOrders] = useState(false);

  // Shared values for Reanimated
  const slide = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (showOrders) {
      slide.value = withSpring(1, { damping: 12, stiffness: 120 });
      opacity.value = withTiming(1, { duration: 300 });
    } else {
      slide.value = withTiming(0, { duration: 250 });
      opacity.value = withTiming(0, { duration: 150 });
    }
  }, [showOrders]);

  const toggleDropdown = () => setShowOrders((prev) => !prev);

  // Derived animated styles
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
    <View className="flex-1 bg-white">
      <StatusBar barStyle="light-content" />

      {/* ===== Header ===== */}
      <LinearGradient
        colors={["#10B981", "#059669"]}
        className="relative"
        style={{ borderBottomRightRadius: 200, overflow: "hidden" }}
      >
        <SafeAreaView edges={["top"]} className="px-5 pb-10 pt-3">
          <View className="flex-row justify-between items-center mb-6">
            <Ionicons name="menu" size={28} color="white" />
            <Image
              source={IMAGES.profile_img}
              className="w-10 h-10 rounded-full border-2 border-white"
            />
          </View>

          <View className="z-10">
            <View className="bg-orange-600/40 px-3 py-1 rounded-full self-start">
              <Text className="text-white text-sm font-semibold">Level 1</Text>
            </View>
            <Text className="text-3xl text-white font-bold mb-8">
              Partner Alex
            </Text>

            <Text className="text-white/70 text-[11px] tracking-wide mb-1">
              TOTAL EARNINGS
            </Text>
            <Text className="text-white text-5xl font-bold mb-2">₦157.34</Text>
          </View>
        </SafeAreaView>

        <Image
          source={IMAGES.riderIllustraion}
          className="absolute right-0 bottom-[-10px] w-52 h-52 opacity-90"
          resizeMode="contain"
        />
      </LinearGradient>

      {/* ===== Body ===== */}
      <View className="bg-gray-50 px-5 pt-6 pb-24">
        {/* Online/Offline Switch */}
        <View className="bg-white rounded-3xl p-5 mb-4 shadow-sm">
          <View className="flex-row justify-between items-center">
            <View className="flex-1">
              <Text className="text-lg font-bold text-gray-900 mb-1">
                Status: {isOnline ? "Online" : "Offline"}
              </Text>
              <Text className="text-sm text-gray-400">
                {isOnline
                  ? "You're available for new deliveries."
                  : "You're currently offline."}
              </Text>
            </View>
            <Switch
              value={isOnline}
              onValueChange={setIsOnline}
              thumbColor="white"
              trackColor={{ false: "#D1D5DB", true: "#10B981" }}
              style={{
                transform: [{ scaleX: 1.4 }, { scaleY: 1.4 }],
                marginRight: 30,
              }}
            />
          </View>
        </View>

        {/* ===== Animated Orders Card ===== */}
        <LinearGradient
          colors={["#FDE68A", "#F59E0B"]}
          style={{
            borderRadius: 20,
            padding: 15,
            overflow: "hidden",
          }}
        >
          <TouchableOpacity activeOpacity={0.85} onPress={toggleDropdown}>
            <View className="flex-row justify-between items-center">
              <View className="flex-row items-center">
                <View className="w-12 h-12 bg-yellow-100 rounded-2xl justify-center items-center mr-4">
                  <Ionicons name="cube-outline" size={26} color="#F59E0B" />
                </View>
                <Text className="text-base font-bold text-gray-900">
                  {deliveryOrders.length} delivery orders found!
                </Text>
              </View>

              <Ionicons
                name={showOrders ? "chevron-up" : "chevron-down"}
                size={22}
                color="#374151"
              />
            </View>
          </TouchableOpacity>

          {/* ✅ Animated Dropdown */}
          <Animated.View
            entering={FadeInDown.duration(500)}
            exiting={FadeOutUp.duration(200)}
            style={dropdownStyle}
          >
            <FlatList
              data={deliveryOrders}
              keyExtractor={(item) => item.id.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() =>
                    router.push({
                      pathname: "/order_detail",
                      params: {
                        orderId: item.id,
                      },
                    })
                  }
                >
                  <OrderSummary
                    order={item}
                    onAccept={() => console.log("Accepted order:", item.id)}
                  />
                </TouchableOpacity>
              )}
              showsVerticalScrollIndicator
              nestedScrollEnabled
              style={{ maxHeight: 350, flexGrow: 0 }}
            />
          </Animated.View>
        </LinearGradient>
      </View>
    </View>
  );
};

export default RiderHomeScreen;
