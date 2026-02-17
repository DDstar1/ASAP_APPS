import { IMAGES } from "@/assets/assetsData";
import CameraModal from "@/components/CameraModal";
import SavedLocationsModal from "@/components/SavedLocationsModal";
import SelectItemTypeScreen from "@/components/SelectItemTypeScreen";
import ShareScreenModal from "@/components/ShareScreenModal";
import { getCusUserById } from "@/lib/supabase-app-functions";
import { useUserStore } from "@/store/useUserStore";
import { shipments } from "@/utils/dummyData";
import { getFormattedToday } from "@/utils/home_utils";
import { Feather, Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import React, { useEffect, useState } from "react";
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
  const [shareVisible, setShareVisible] = useState(false);
  const [savedVisible, setSavedVisible] = useState(false);
  const [ItemTypeVisible, setItemTypeVisible] = useState(false);

  const [customUser, setCustomUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const userId = useUserStore((state) => state.user?.id);

  // 🧭 Deep link params
  const { modal, edit, lat, lng } = useLocalSearchParams();

  console.log("🏠 Home params:", { modal, edit, lat, lng });

  // 🧱 Shared location state (syncs with params)
  const [SharedlocationDetails, setSharedlocationDetailsParam] = useState<any>({
    modal: null,
    edit: null,
    lat: null,
    lng: null,
  });

  // 🧹 Function to clear shared location
  const handleClearSharedDetails = () => {
    console.log("🧹 Clearing SharedlocationDetails...");
    setSharedlocationDetailsParam({
      modal: null,
      edit: null,
      lat: null,
      lng: null,
    });
    router.replace("/(tabs)/home");
  };

  // ✅ Whenever params change, sync to state
  useEffect(() => {
    if (modal || edit || lat || lng) {
      const parsed = {
        modal,
        edit,
        lat: lat ? parseFloat(lat as string) : null,
        lng: lng ? parseFloat(lng as string) : null,
      };
      console.log("🧭 Updated SharedlocationDetails:", parsed);
      setSharedlocationDetailsParam(parsed);
    }
  }, [modal, edit, lat, lng]);

  // ✅ Auto-open Saved Locations modal when deep link triggers
  useEffect(() => {
    if (
      SharedlocationDetails &&
      SharedlocationDetails.modal === "sharedlocation" &&
      SharedlocationDetails.edit === "true"
    ) {
      console.log(
        "🗺 Opening SavedLocationsModal for:",
        SharedlocationDetails.lat,
        SharedlocationDetails.lng,
      );
      setSavedVisible(true);
    }
  }, [SharedlocationDetails]);

  // ✅ Fetch custom user from Supabase
  useEffect(() => {
    const fetchUser = async () => {
      if (!userId) {
        console.warn("⚠️ No user ID found in store");
        setLoadingUser(false);
        return;
      }

      try {
        const data = await getCusUserById(userId);
        setCustomUser(data);
      } catch (error) {
        console.error("❌ Error fetching user:", error);
      } finally {
        setLoadingUser(false);
      }
    };

    fetchUser();
  }, [userId]);

  const quickActions = [
    { icon: "navigate-outline", label: "Share Location" },
    { icon: "send-outline", label: "Send Package" },
    { icon: "bookmark-outline", label: "Saved Locations" },
  ];

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-gray-900">
      <StatusBar barStyle="light-content" backgroundColor="#111827" />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="flex-row justify-between items-center px-4 py-3">
          <View className="flex-row bg-[#3C3C43] p-3 px-5 justify-evenly rounded-full items-center">
            <View className="w-10 h-10 rounded-full bg-orange-500 justify-center items-center mr-3">
              <Text className="text-white text-base font-bold">
                {customUser?.username?.[0]?.toUpperCase() ?? "U"}
              </Text>
            </View>
            <View className="justify-center">
              <Text className="text-white text-lg font-semibold">
                {loadingUser ? "Loading..." : customUser?.username || "User"}
              </Text>
              <Text className="text-gray-400 text-xs mt-0.5">
                {getFormattedToday()}
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
              with <Text className="font-extrabold">Solana</Text>.{"\n"}Fast,
              secure, and low fees.
            </Text>

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
                if (action.label === "Send Package") setItemTypeVisible(true);
                else if (action.label === "Share Location")
                  setShareVisible(true);
                else if (action.label === "Saved Locations")
                  setSavedVisible(true);
              }}
            >
              <View
                className={`w-16 h-16 rounded-full justify-center items-center mb-2 bg-[#3C3C43]`}
              >
                {action.label === "Send Package" ? (
                  <Text className="text-2xl">🚴‍♂️</Text>
                ) : (
                  <Ionicons name={action.icon as any} size={24} color="white" />
                )}
              </View>
              <Text className={`text-xs text-gray-400`}>{action.label}</Text>
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

      {/* Camera Modal 
      <CameraModal
        visible={cameraVisible}
        onClose={() => {
          setCameraVisible(false);
        }}
        onConfirm={async (image_url) => {
          try {
            router.navigate({
              pathname: "/map",
              params: {
                packageImage: image_url,
              },
            });
          } catch (error) {
            console.error("Failed to save package image:", error);
            Alert.alert("Error", "Failed to save image");
            router.navigate("/map");
          }
        }}
      />*/}

      {/* Select Item Modal */}
      <SelectItemTypeScreen
        visible={ItemTypeVisible}
        onClose={() => setItemTypeVisible(false)}
        onConfirm={async (packageType, description) => {
          console.log("📦 Selected type:", packageType);
          console.log("📝 Description:", description);

          try {
            router.navigate({
              pathname: "/map",
              params: {
                packageType,
                packageDescription: description,
              },
            });
          } catch (error) {
            console.error("Failed to save package type:", error);
            Alert.alert("Error", "Failed to save package type");
            router.navigate("/map");
          }
        }}
      />

      {/* Share Modal */}
      <ShareScreenModal
        visible={shareVisible}
        onClose={() => setShareVisible(false)}
      />

      {/* Saved Locations Modal */}
      <SavedLocationsModal
        visible={savedVisible}
        onClose={() => setSavedVisible(false)}
        SharedlocationDetails={SharedlocationDetails}
        onClearSharedDetails={handleClearSharedDetails}
      />
    </SafeAreaView>
  );
};

export default ShippingTrackerApp;
