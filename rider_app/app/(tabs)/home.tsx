import { IMAGES } from "@/assets/assetsData"; // adjust path as needed
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Image,
  ScrollView,
  StatusBar,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const RiderHomeScreen = () => {
  const [isOnline, setIsOnline] = useState(true);

  const recentTransactions = [
    {
      id: 1,
      label: "5 batch deliveries",
      amount: "+$79.90",
      time: "Today, 1:23 pm · 18.7 mi",
    },
    {
      id: 2,
      label: "3 single deliveries",
      amount: "+$42.30",
      time: "Yesterday · 12.2 mi",
    },
  ];

  return (
    <SafeAreaView className="flex-1 bg-white">
      <StatusBar barStyle="light-content" />

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* ===== Header / Earnings Section ===== */}
        <LinearGradient
          colors={["#10B981", "#059669"]}
          className="rounded-b-[30px] px-5 pb-10 pt-3 relative"
        >
          {/* Top Row */}
          <View className="flex-row justify-between items-center mb-6">
            <TouchableOpacity>
              <Ionicons name="menu" size={28} color="white" />
            </TouchableOpacity>
            <TouchableOpacity>
              <Image
                source={IMAGES.profile_img}
                className="w-10 h-10 rounded-full border-2 border-white"
              />
            </TouchableOpacity>
          </View>

          {/* Welcome Text + Earnings */}
          <View className="z-10">
            <Text className="text-white text-lg mb-1 font-medium">
              Welcome back 👋
            </Text>
            <Text className="text-3xl text-white font-bold mb-2">
              Partner Alex
            </Text>

            <Text className="text-white/70 text-[11px] tracking-wide mb-1">
              TOTAL EARNINGS
            </Text>
            <Text className="text-white text-5xl font-bold mb-2">$157.34</Text>
          </View>

          {/* Background Scooter Illustration */}
          <Image
            source={IMAGES.riderBikePizza}
            className="absolute right-[-20px] bottom-[-10px] w-52 h-52 opacity-90"
            resizeMode="contain"
          />
        </LinearGradient>

        {/* ===== Body ===== */}
        <View className="bg-gray-50 px-5 pt-6 pb-24">
          {/* Online/Offline Card */}
          <View className="bg-white rounded-3xl p-5 mb-4 shadow-sm">
            <View className="flex-row justify-between items-center">
              <View className="flex-1">
                <Text className="text-lg font-bold text-gray-900 mb-1">
                  Status: {isOnline ? "Online" : "Offline"}
                </Text>
                <Text className="text-sm text-gray-400">
                  {isOnline
                    ? "You’re available for new deliveries."
                    : "You’re currently offline."}
                </Text>
              </View>
              <Switch
                value={isOnline}
                onValueChange={setIsOnline}
                thumbColor="white"
                trackColor={{ false: "#D1D5DB", true: "#10B981" }}
              />
            </View>
          </View>

          {/* Orders Found */}
          <TouchableOpacity activeOpacity={0.8}>
            <LinearGradient
              colors={["#FDE68A", "#F59E0B"]}
              className="rounded-3xl p-[2px] mb-4"
            >
              <View className="bg-white rounded-3xl p-5 flex-row items-start">
                <View className="w-14 h-14 bg-yellow-100 rounded-2xl justify-center items-center mr-4">
                  <Ionicons name="cube-outline" size={28} color="#F59E0B" />
                </View>
                <View className="flex-1">
                  <Text className="text-base font-bold text-gray-900 mb-1">
                    4 delivery orders found!
                  </Text>
                  <Text className="text-xs text-red-500 font-semibold mb-2">
                    Rush hour — be careful.
                  </Text>
                  <View className="flex-row items-center">
                    <Text className="text-green-600 text-sm font-semibold">
                      View details
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color="#10B981"
                      style={{ marginLeft: 2 }}
                    />
                  </View>
                </View>
                <Image
                  source={IMAGES.wallet}
                  className="w-12 h-12"
                  resizeMode="contain"
                />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Recent Transactions */}
          <View className="bg-white rounded-3xl p-5 shadow-sm">
            <View className="flex-row justify-between items-center mb-4">
              <Text className="text-lg font-bold text-gray-900">
                Recent Transactions
              </Text>
              <Text className="text-xs text-green-500 font-semibold">
                View All
              </Text>
            </View>

            {recentTransactions.map((tx, index) => (
              <View
                key={tx.id}
                className={`flex-row justify-between items-center py-3 ${
                  index < recentTransactions.length - 1
                    ? "border-b border-gray-100"
                    : ""
                }`}
              >
                <View className="flex-row items-center flex-1">
                  <View className="w-10 h-10 bg-gray-100 rounded-full justify-center items-center mr-3">
                    <Ionicons name="bicycle" size={20} color="#6B7280" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-sm font-semibold text-gray-900 mb-0.5">
                      {tx.label}
                    </Text>
                    <Text className="text-xs text-gray-400">{tx.time}</Text>
                  </View>
                </View>
                <Text className="text-sm font-bold text-green-500">
                  {tx.amount}
                </Text>
              </View>
            ))}
          </View>
        </View>
        {/* Open Map Button */}
        <TouchableOpacity
          onPress={() => router.push("/map")}
          activeOpacity={0.8}
          className="mt-6 mx-5 bg-green-600 py-4 rounded-2xl items-center justify-center shadow-md"
        >
          <Text className="text-white font-semibold text-lg">Open Map</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
};

export default RiderHomeScreen;
