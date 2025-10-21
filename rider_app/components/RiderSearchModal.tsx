// components/RiderSearchModal.tsx
import { IMAGES } from "@/assets/assetsData";
import { assignNearestRider } from "@/utils/mapUtils"; // your helper
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

type Props = {
  visible: boolean;
  onClose: () => void;
  price: number | null;
  packageImage?: any;
  pickup: { latitude: number; longitude: number };
  destination: { coordinates: { latitude: number; longitude: number } };
  riders: any[];
};

export default function RiderSearchModal({
  visible,
  onClose,
  price,
  packageImage,
  pickup,
  destination,
  riders,
}: Props) {
  const [searching, setSearching] = useState(true);
  const [assignedRider, setAssignedRider] = useState<any>(null);

  useEffect(() => {
    if (visible) {
      setSearching(true);
      setAssignedRider(null);
      console.log("🔍 Searching for nearest rider...");
      console.log(riders);
      // simulate API + rider assignment after 4s
      const timer = setTimeout(() => {
        const nearest = assignNearestRider(pickup, riders);
        console.log(nearest);
        setAssignedRider(nearest);
        setSearching(false);
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent={false} animationType="slide">
      <View className="flex-1 bg-neutral-900">
        {/* Header */}
        <View className="flex-row justify-between items-center pt-12 pb-4 px-6">
          <Text className="text-white text-2xl font-bold">
            {searching ? "Finding Rider" : "Rider Found!"}
          </Text>
          <TouchableOpacity onPress={onClose} className="p-2">
            <Text className="text-gray-400 text-2xl">✕</Text>
          </TouchableOpacity>
        </View>

        <View className="flex-1 px-6 pb-8">
          {searching ? (
            // Searching state
            <View className="flex-1 justify-center items-center">
              <View className="bg-neutral-800 rounded-3xl w-full p-6 mb-8">
                <Text className="text-white text-lg font-semibold mb-4 text-center">
                  Your Package
                </Text>
                <Image
                  source={packageImage ? packageImage : IMAGES.riderBikePizza}
                  className="w-40 h-40 rounded-2xl self-center mb-4"
                  resizeMode="contain"
                />
                {price && (
                  <Text className="text-orange-500 text-2xl font-bold text-center">
                    ₦{price}
                  </Text>
                )}
              </View>

              <ActivityIndicator size="large" color="#F97316" />
              <Text className="text-gray-400 mt-4 text-center text-base">
                Connecting you with nearby riders...
              </Text>
              <Text className="text-gray-500 mt-2 text-center text-sm">
                This usually takes less than a minute
              </Text>
            </View>
          ) : (
            // Success state
            <View className="flex-1">
              <View className="bg-green-600/20 rounded-2xl p-4 mb-6 border border-green-600/30">
                <Text className="text-green-400 text-center text-lg font-bold">
                  🎉 Rider Assigned Successfully!
                </Text>
              </View>

              <View className="bg-neutral-800 rounded-3xl p-6 mb-6">
                {/* Package Info */}
                <View className="mb-6">
                  <Text className="text-white text-lg font-semibold mb-3">
                    Your Package
                  </Text>
                  <View className="flex-row items-center">
                    <Image
                      source={
                        packageImage ? packageImage : IMAGES.riderBikePizza
                      }
                      className="w-20 h-20 rounded-xl mr-4"
                      resizeMode="contain"
                    />
                    <View className="flex-1">
                      {price && (
                        <Text className="text-orange-500 text-xl font-bold">
                          ₦{price}
                        </Text>
                      )}
                      <Text className="text-gray-400 text-sm mt-1">
                        Ready for pickup
                      </Text>
                    </View>
                  </View>
                </View>

                <View className="h-px bg-gray-600 mb-6" />

                {/* Rider Info */}
                {assignedRider && (
                  <View>
                    <Text className="text-white text-lg font-semibold mb-3">
                      Your Rider
                    </Text>
                    <View className="flex-row items-center">
                      <Image
                        source={IMAGES.map_rider}
                        className="w-16 h-16 rounded-full mr-4"
                        resizeMode="contain"
                      />
                      <View className="flex-1">
                        <Text className="text-white text-lg font-semibold">
                          {assignedRider.name}
                        </Text>
                        <Text className="text-gray-400 text-sm">
                          ⭐ {assignedRider.rating} rating •{" "}
                          {assignedRider.deliveries} deliveries
                        </Text>
                        <Text className="text-green-400 text-sm mt-1">
                          🚴‍♂️ Arriving in {assignedRider.eta}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>

              {/* Buttons */}
              <View className="space-y-3 mt-auto mb-8">
                <TouchableOpacity
                  className="bg-orange-500 w-full py-4 rounded-2xl"
                  onPress={() =>
                    router.push({
                      pathname: "/trackPackage",
                      params: {
                        riderId: assignedRider.id,
                        riderLat: assignedRider.coordinate.latitude,
                        riderLng: assignedRider.coordinate.longitude,
                        destinationLat: destination.coordinates.latitude,
                        destinationLng: destination.coordinates.longitude,
                      },
                    })
                  }
                >
                  <Text className="text-white font-bold text-lg text-center">
                    Track Rider
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}
