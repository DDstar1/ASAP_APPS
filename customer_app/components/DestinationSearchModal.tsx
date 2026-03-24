import { getSavedLocations } from "@/lib/supabase-app-functions";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as Location from "expo-location";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import GooglePlacesTextInput from "react-native-google-places-textinput";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.googleMapsApiKey ?? "";

// Move AnimatedSavedItem outside and memoize it
const AnimatedSavedItem = React.memo(({ show, item, onPress }: any) => {
  const maxHeight = useSharedValue(show ? 80 : 0);
  const isMounted = useRef(false);

  useEffect(() => {
    if (!isMounted.current) {
      // Set initial value without animation
      maxHeight.value = show ? 80 : 0;
      isMounted.current = true;
    } else {
      // Animate on subsequent changes
      maxHeight.value = withTiming(show ? 80 : 0, {
        duration: 300,
        easing: Easing.out(Easing.ease),
      });
    }
  }, [show]);

  const animatedStyle = useAnimatedStyle(() => ({
    maxHeight: maxHeight.value,
    opacity: maxHeight.value / 80,
  }));

  return (
    <Animated.View
      style={[animatedStyle, { overflow: "hidden" }]}
      className="w-2/3  self-end"
    >
      <TouchableOpacity
        onPress={onPress}
        className="flex-row items-center bg-gray-700 p-3 rounded-xl"
      >
        <Ionicons name="location" size={18} color="#f97316" />
        <View className="ml-2 flex-1">
          <Text className="text-gray-100 font-medium">{item.name}</Text>
          <Text className="text-gray-400 text-xs">
            {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

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
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [savedLocations, setSavedLocations] = useState<any[]>([]);
  const [showSaved, setShowSaved] = useState(false);

  const fetchSavedLocations = async () => {
    try {
      setLoadingSaved(true);
      const { data, error } = await getSavedLocations();
      if (error) throw error;
      setSavedLocations(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSaved(false);
    }
  };

  useEffect(() => {
    if (visible) fetchSavedLocations();
  }, [visible]);

  const handleUseCurrentLocation = async () => {
    try {
      setLoadingLocation(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permission denied", "Location permission is required");
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;
      const [address] = await Location.reverseGeocodeAsync({
        latitude,
        longitude,
      });

      const locData = {
        name: "Current Location",
        address: address?.name || address?.city,
        coordinates: { latitude, longitude },
      };

      onSelect(locData);
      onClose();
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleSelectSaved = (item: any) => {
    onSelect({
      name: `${item.name} (saved)`,
      coordinates: {
        latitude: parseFloat(item.latitude),
        longitude: parseFloat(item.longitude),
      },
    });
    onClose();
  };

  const handlePlaceSelect = (place: any) => {
    const latitude = place?.details?.location?.latitude;
    const longitude = place?.details?.location?.longitude;

    if (!latitude || !longitude) return;

    const locationData = {
      name: place?.structuredFormat?.mainText?.text || place?.text?.text,
      address:
        place?.details?.formattedAddress ||
        place?.structuredFormat?.secondaryText?.text,
      coordinates: { latitude, longitude },
    };

    onSelect(locationData);
    onClose();
  };

  // Memoize listData to prevent recreating on every render
  const listData = useMemo(
    () => [
      { type: "header" },
      { type: "current_location" },
      { type: "toggle_saved" },
      ...(showSaved
        ? savedLocations.length > 0
          ? savedLocations.map((l) => ({ type: "saved", ...l }))
          : [{ type: "no_saved" }]
        : []),
      { type: "google_places" },
    ],
    [showSaved, savedLocations],
  );

  const renderItem = ({ item }: any) => {
    switch (item.type) {
      case "header":
        return (
          <View className="flex-row items-center justify-between mb-3 bg-gray-900 pb-2">
            <Text className="text-lg font-semibold text-white">
              Select {field === "from" ? "Pickup" : "Destination"}
            </Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#f97316" />
            </TouchableOpacity>
          </View>
        );
      case "current_location":
        return (
          <TouchableOpacity
            onPress={handleUseCurrentLocation}
            className="flex-row items-center bg-gray-800 p-3 rounded-xl mb-2"
          >
            {loadingLocation ? (
              <ActivityIndicator color="#f97316" />
            ) : (
              <View className="flex-row items-center w-full justify-center">
                <Ionicons name="locate" size={20} color="#f97316" />
                <Text className="ml-2 text-orange-500 font-medium">
                  Use Current Location
                </Text>
              </View>
            )}
          </TouchableOpacity>
        );
      case "toggle_saved":
        return (
          <TouchableOpacity
            onPress={() => setShowSaved((prev) => !prev)}
            className="flex-row items-center justify-center bg-gray-800 p-3 rounded-xl mb-2"
          >
            <Ionicons name="bookmarks" size={20} color="#f97316" />
            <Text className="ml-2 text-orange-500 font-medium">
              {showSaved ? "Hide Saved Locations" : "Show Saved Locations"}
            </Text>
          </TouchableOpacity>
        );
      case "saved":
        return (
          <AnimatedSavedItem
            show={showSaved}
            item={item}
            onPress={() => handleSelectSaved(item)}
          />
        );
      case "no_saved":
        return (
          <View className="w-2/3  self-end p-4 bg-gray-800 rounded-xl mb-2 m items-center">
            <Text className="text-gray-400 text-center">
              No saved locations yet.
            </Text>
          </View>
        );
      case "google_places":
        return (
          <View className="mt-3">
            <GooglePlacesTextInput
              apiKey={GOOGLE_MAPS_API_KEY}
              onPlaceSelect={handlePlaceSelect}
              fetchDetails={true}
              includedRegionCodes={["NG"]}
              detailsFields={[
                "formattedAddress",
                "location",
                "viewport",
                "addressComponents",
                "types",
              ]}
              placeHolderText={`Search ${
                field === "from" ? "pickup" : "destination"
              }`}
              style={{
                suggestionsContainer: { maxHeight: 400 },
                placeholder: { color: "grey" },
                suggestionItem: {
                  borderBottomWidth: 1,
                  borderBottomColor: "grey",
                  paddingVertical: 10,
                },
              }}
            />
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      {/* Outer Pressable for overlay */}
      <Pressable className="flex-1 justify-end bg-black/40" onPress={onClose}>
        {/* Inner Pressable to block propagation */}
        <Pressable onPress={(e) => e.stopPropagation()}>
          <SafeAreaView className="bg-gray-900 rounded-t-3xl p-4 h-[600px]">
            {loadingSaved && savedLocations.length === 0 ? (
              <ActivityIndicator color="#f97316" />
            ) : (
              <FlatList
                data={listData}
                keyExtractor={(item, index) =>
                  item.type === "saved"
                    ? `saved-${item.id || index}`
                    : `${item.type}-${index}`
                }
                renderItem={renderItem}
                showsVerticalScrollIndicator={false}
                stickyHeaderIndices={[0]}
              />
            )}
          </SafeAreaView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
