import { IMAGES } from "@/assets/assetsData";
import CameraModal from "@/components/CameraModal"; // ⬅️ import the modal
import { Feather, Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Image,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ShippingTrackerApp = () => {
  const [cameraVisible, setCameraVisible] = useState(false);

  const shipments = [
    {
      id: "FNL1345603",
      recipient: "Ramesh",
      status: "In Delivery",
      statusColor: "text-orange-400",
    },
    {
      id: "FNL1345403",
      sender: "Ramesh",
      status: "Completed",
      statusColor: "text-green-400",
    },
    {
      id: "FNL1888403",
      sender: "Anu",
      status: "Completed",
      statusColor: "text-green-400",
    },
    {
      id: "FMD348403",
      recipient: "David",
      status: "Completed",
      statusColor: "text-green-400",
    },
  ];

  const quickActions = [
    { icon: "car-outline", label: "Send" },
    { icon: "location-outline", label: "Location" },
    { icon: "card-outline", label: "Payments" },
    { icon: "information-circle-outline", label: "Info" },
  ];

  return (
    <SafeAreaView className="flex-1 bg-gray-900">
      <StatusBar barStyle="light-content" backgroundColor="#111827" />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row justify-between items-center  px-4 py-3">
          <View className="flex-row bg-[#3C3C43] p-3 px-5 justify-evenly rounded-full items-center">
            <View className="w-10 h-10 rounded-full bg-orange-500 justify-center items-center mr-3">
              <Text className="text-white text-base font-bold">M</Text>
            </View>
            <View className="justify-center">
              <Text className="text-white text-lg font-semibold">
                Mithun MR
              </Text>
              <Text className="text-gray-400 text-xs mt-0.5">
                24th Nov 2024
              </Text>
            </View>
          </View>
          <TouchableOpacity className="ml-4 aspect-square flex-row items-center justify-center bg-[#3C3C43] p-3 rounded-full">
            <Ionicons name="settings-outline" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Search Bar */}
        <View className="px-4 py-3 mb-4">
          <View className="bg-[#3C3C43] rounded-full px-3 py-2.5 flex-row items-center">
            <Ionicons name="search-outline" size={16} color="#9CA3AF" />
            <TextInput
              className="flex-1 text-gray-300 rounded-full text-sm ml-2"
              placeholder="Search here"
              placeholderTextColor="#6B7280"
            />
            <View className="w-3 h-3 border border-gray-400 transform rotate-45" />
          </View>
        </View>

        {/* Promo Banner */}
        <View className="mx-4 mb-4 bg-[#3C3C43] h-40 overflow-hidden rounded-xl p-4 flex-row justify-between items-center">
          <View className="flex-1">
            <Text className="text-white text-lg font-bold mb-1">
              Claim 25% Off
            </Text>
            <Text className="text-white text-xs opacity-90 leading-4 mb-3">
              Get <Text className="font-extrabold">25%</Text> Off when you pay
              with <Text className="font-extrabold">Solana</Text>.{"\n"}
              Fast, secure, and low fees.
            </Text>

            {/* CTA Button */}
            <TouchableOpacity className="bg-orange-500 rounded-full px-4 py-2 self-start">
              <Text className="text-white text-sm font-semibold">
                Link Phantom Wallet
              </Text>
            </TouchableOpacity>
          </View>
          <View className="w-2/5">
            <Image
              source={IMAGES.wallet}
              className="w-full"
              resizeMode="contain"
            />
          </View>
        </View>

        {/* Quick Actions */}
        <View className="flex-row justify-around px-4 py-4 mb-4">
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              className="items-center"
              onPress={() => {
                if (action.label === "Send") setCameraVisible(true);
              }}
            >
              <View className="w-16 h-16 rounded-full bg-[#3C3C43] justify-center items-center mb-2">
                <Ionicons name={action.icon} size={24} color="white" />
              </View>
              <Text className="text-gray-400 text-xs">{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Track Shipping Section */}
        <View className="px-4 py-4 bg-[#3C3C43] rounded-2xl mx-4 mb-6">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-white text-lg font-semibold">
              Track Shipping
            </Text>
            <TouchableOpacity>
              <Text className="text-white text-sm underline">See All</Text>
            </TouchableOpacity>
          </View>

          <View className="mt-2">
            {shipments.map((shipment, index) => (
              <View
                key={index}
                className="flex-row justify-between items-center py-3"
              >
                <View className="flex-row items-center">
                  <Feather
                    name="package"
                    size={25}
                    color="#9CA3AF"
                    style={{ marginRight: 12 }}
                  />

                  <View className="justify-center">
                    <Text className="text-white text-sm">
                      {shipment.recipient
                        ? `To ${shipment.recipient}`
                        : `From ${shipment.sender}`}
                    </Text>
                    <Text className="text-gray-400 text-xs mt-0.5">
                      ID: {shipment.id}
                    </Text>
                  </View>
                </View>
                <Text className={`text-xs font-medium ${shipment.statusColor}`}>
                  {shipment.status}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Camera Modal */}
      <CameraModal
        visible={cameraVisible}
        onClose={() => setCameraVisible(false)}
        onConfirm={async (uri: any) => {
          console.log("Package photo URI has being saved");
          try {
            await AsyncStorage.setItem("packageImage", uri);
            console.log("✅ Image saved to AsyncStorage");
            router.push("/map");
          } catch (error) {
            console.error("Error saving image:", error);
            Alert.alert("Error", "Failed to save image");
          }
        }}
      />
    </SafeAreaView>
  );
};

export default ShippingTrackerApp;
