import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Modal,
  TouchableOpacity,
  View,
  Text,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import GooglePlacesTextInput from "react-native-google-places-textinput";
import * as Location from "expo-location";
import Constants from "expo-constants";

const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.googleMapsApiKey ?? "";

export default function DestinationSearchModal({
  visible,
  onClose,
  onSelect,
  field,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (location: any) => void;
  field: "from" | "to";
}) {
  const [loadingLocation, setLoadingLocation] = useState(false);

  const handlePlaceSelect = (place: any) => {
    const latitude = place?.details?.location?.latitude;
    const longitude = place?.details?.location?.longitude;

    if (!latitude || !longitude) {
      console.warn("⚠️ No valid coordinates for selected place:", place);
      return;
    }

    const locationData = {
      name: place?.structuredFormat?.mainText?.text || place?.text?.text,
      address:
        place?.details?.formattedAddress ||
        place?.structuredFormat?.secondaryText?.text,
      coordinates: { latitude, longitude },
    };

    console.log("📍 Selected location:", JSON.stringify(locationData, null, 2));
    onSelect(locationData);
    onClose();
  };

  // 🌍 Use current device location
  const handleUseCurrentLocation = async () => {
    try {
      setLoadingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Location access is required to use this feature."
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const { latitude, longitude } = location.coords;

      // Reverse geocode to get an address
      const [address] = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      const locationData = {
        name: "Current Location",
        address:
          address?.name ||
          `${address?.street || ""} ${address?.city || ""}`.trim(),
        coordinates: { latitude, longitude },
      };

      console.log("📍 Using current location:", locationData);
      onSelect(locationData);
      onClose();
    } catch (error) {
      console.error("❌ Error getting current location:", error);
      Alert.alert("Error", "Unable to fetch your location.");
    } finally {
      setLoadingLocation(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/40">
        <SafeAreaView
          style={{ height: 600 }}
          className="w-full bg-gray-900 rounded-t-[25px] p-4"
        >
          <View className="self-center w-12 h-1.5 bg-gray-600 rounded-full mb-3" />

          <View className="flex-row items-center mb-4">
            <TouchableOpacity
              onPress={onClose}
              className="h-10 w-10 items-center justify-center rounded-full bg-gray-800"
            >
              <Ionicons name="close" size={22} color="#f97316" />
            </TouchableOpacity>
            <Text className="ml-3 text-lg font-semibold text-gray-100">
              Select {field === "from" ? "Pickup" : "Destination"}
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleUseCurrentLocation}
            disabled={loadingLocation}
            className="flex-row items-center justify-center mb-4 bg-gray-800 p-3 rounded-xl"
          >
            {loadingLocation ? (
              <ActivityIndicator color="#f97316" />
            ) : (
              <>
                <Ionicons name="locate" size={20} color="#f97316" />
                <Text className="ml-2 text-orange-500 font-medium">
                  Use Current Location
                </Text>
              </>
            )}
          </TouchableOpacity>

          <GooglePlacesTextInput
            apiKey={GOOGLE_MAPS_API_KEY}
            onPlaceSelect={handlePlaceSelect}
            includedRegionCodes={["NG"]}
            fetchDetails={true}
            detailsFields={[
              "formattedAddress",
              "location",
              "viewport",
              "addressComponents",
              "types",
            ]}
            placeHolderText={`Type ${
              field === "from" ? "Pickup" : "Destination"
            }`}
            style={{
              suggestionsContainer: {
                maxHeight: 500,
              },
              placeholder: {
                color: "grey",
              },
              suggestionItem: {
                borderBottomWidth: 1,
                borderBottomColor: "grey",
                paddingVertical: 10,
              },
            }}
          />
        </SafeAreaView>
      </View>
    </Modal>
  );
}
