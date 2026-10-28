import {
  addRecentPlace,
  getRecentPlaces,
  type RecentPlace,
} from "@/lib/recent-places";
import { getSavedLocations } from "@/lib/supabase-app-functions";
import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import * as Location from "expo-location";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import GooglePlacesTextInput from "react-native-google-places-textinput";
import { SafeAreaView } from "react-native-safe-area-context";

const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.googleMapsApiKey ?? "";
const ORANGE = "#FF7518";

// One row of the list: icon in a dark square, title, optional subtitle
function PlaceRow({
  icon,
  iconColor = "white",
  title,
  subtitle,
  onPress,
  loading,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  title: string;
  subtitle?: string | null;
  onPress: () => void;
  loading?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      accessibilityLabel={subtitle ? `${title}, ${subtitle}` : title}
      className="flex-row items-center gap-4 py-3 border-b border-white/10"
    >
      <View className="w-11 h-11 rounded-xl bg-[#2C2C30] justify-center items-center">
        {loading ? (
          <ActivityIndicator color={ORANGE} />
        ) : (
          <Ionicons name={icon} size={20} color={iconColor} />
        )}
      </View>
      <View className="flex-1">
        <Text className="text-white text-base font-semibold" numberOfLines={1}>
          {title}
        </Text>
        {!!subtitle && (
          <Text className="text-gray-400 text-sm" numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

// Map icon at the end of a stop's input: set that stop by moving a pin instead
function MapPickButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      className="w-11 h-11 rounded-full bg-[#2C2C30] justify-center items-center"
    >
      <Ionicons name="map-outline" size={20} color={ORANGE} />
    </TouchableOpacity>
  );
}

export default function DestinationSearchModal({
  visible,
  onClose,
  onSelect,
  field,
  originLabel,
  onChooseOnMap,
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (location: any) => void;
  // Opens the map pin picker for that stop
  onChooseOnMap?: (field: "from" | "to") => void;
  field: "from" | "to";
  // Shown in the top pill while choosing the destination
  originLabel?: string | null;
}) {
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [savedLocations, setSavedLocations] = useState<any[]>([]);
  const [recents, setRecents] = useState<RecentPlace[]>([]);
  // Hide the lists while Google suggestions are showing
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!visible) return;
    setQuery("");
    getRecentPlaces().then(setRecents);
    getSavedLocations()
      .then(({ data }) => setSavedLocations(data || []))
      .catch((err) => console.error(err));
  }, [visible]);

  const choose = (location: any) => {
    onSelect(location);
    addRecentPlace(location);
    onClose();
  };

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

      choose({
        name: "Current Location",
        address: address?.name || address?.city,
        coordinates: { latitude, longitude },
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingLocation(false);
    }
  };

  const handleSelectSaved = (item: any) => {
    choose({
      name: `${item.name} (saved)`,
      coordinates: {
        latitude: parseFloat(item.latitude),
        longitude: parseFloat(item.longitude),
      },
    });
  };

  const handlePlaceSelect = (place: any) => {
    const latitude = place?.details?.location?.latitude;
    const longitude = place?.details?.location?.longitude;

    if (!latitude || !longitude) return;

    choose({
      name: place?.structuredFormat?.mainText?.text || place?.text?.text,
      address:
        place?.details?.formattedAddress ||
        place?.structuredFormat?.secondaryText?.text,
      coordinates: { latitude, longitude },
    });
  };

  const fieldLabel = field === "from" ? "pickup" : "destination";

  const pickOnMap = (which: "from" | "to") => {
    onClose();
    onChooseOnMap?.(which);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-black px-4">
        {/* Back button gets the first row to itself */}
        <View className="flex-row items-center mt-2 mb-4">
          <TouchableOpacity
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close search"
            className="w-11 h-11 rounded-full bg-[#2C2C30] justify-center items-center"
          >
            <Ionicons name="chevron-back" size={22} color="white" />
          </TouchableOpacity>
          <Text className="flex-1 text-center text-white text-xl font-bold mr-11">
            Set {fieldLabel}
          </Text>
        </View>

        {/* The trip's stops, joined by a dotted line. Choosing the destination
            shows the pickup above for context; each stop can be set on the map. */}
        <View className="bg-[#1C1C21] rounded-3xl px-3 py-3 z-10">
          {field === "to" && (
            <>
              <View className="flex-row items-center gap-3 pl-2">
                <View className="items-center w-3">
                  <View className="w-3 h-3 rounded-full bg-[#EF4444]" />
                </View>
                <Text className="flex-1 text-gray-300 text-base" numberOfLines={1}>
                  {originLabel ?? "Pickup not set"}
                </Text>
                <MapPickButton label="Set pickup on the map" onPress={() => pickOnMap("from")} />
              </View>
              <View className="w-3 ml-2 items-center">
                <View className="h-4 border-l border-dashed border-gray-500" />
              </View>
            </>
          )}

          <View className="flex-row items-center gap-3 pl-2">
            <View className="items-center w-3">
              <View
                className={`w-3 h-3 rounded-full ${field === "from" ? "bg-[#EF4444]" : "bg-[#22C55E]"}`}
              />
            </View>
            <View className="flex-1">
          <GooglePlacesTextInput
            apiKey={GOOGLE_MAPS_API_KEY}
            onPlaceSelect={handlePlaceSelect}
            onTextChange={setQuery}
            fetchDetails={true}
            includedRegionCodes={["NG"]}
            detailsFields={[
              "formattedAddress",
              "location",
              "viewport",
              "addressComponents",
              "types",
            ]}
            placeHolderText={`Search ${fieldLabel}`}
            accessibilityLabels={{ input: `Search ${fieldLabel}` }}
            style={{
              input: {
                height: 48,
                borderRadius: 16,
                borderWidth: 0,
                backgroundColor: "#2C2C30",
                color: "white",
                paddingHorizontal: 16,
                fontSize: 16,
              },
              placeholder: { color: "#9CA3AF" },
              loadingIndicator: { color: ORANGE },
              suggestionsContainer: {
                backgroundColor: "#000",
                maxHeight: 420,
              },
              suggestionItem: {
                backgroundColor: "#000",
                borderBottomWidth: 1,
                borderBottomColor: "rgba(255,255,255,0.1)",
                paddingVertical: 12,
              },
              suggestionText: {
                main: { color: "white", fontSize: 16, fontWeight: "600" },
                secondary: { color: "#9CA3AF", fontSize: 14 },
              },
            }}
          />
            </View>
            <MapPickButton label={`Set ${fieldLabel} on the map`} onPress={() => pickOnMap(field)} />
          </View>
        </View>

        {!query && (
          <ScrollView
            className="flex-1 mt-2"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <PlaceRow
              icon="navigate"
              iconColor={ORANGE}
              title="Current Location"
              subtitle="Use where you are now"
              onPress={handleUseCurrentLocation}
              loading={loadingLocation}
            />
            {onChooseOnMap && (
              <PlaceRow
                icon="map-outline"
                iconColor={ORANGE}
                title="Choose on map"
                subtitle={`Move the map to set your ${fieldLabel}`}
                onPress={() => pickOnMap(field)}
              />
            )}

            {recents.length > 0 && (
              <Text className="text-gray-400 text-xs font-semibold uppercase tracking-widest mt-5 mb-1">
                Recent
              </Text>
            )}
            {recents.map((place, i) => (
              <PlaceRow
                key={`recent-${i}`}
                icon="time-outline"
                title={place.name}
                subtitle={place.address}
                onPress={() => choose(place)}
              />
            ))}

            {savedLocations.length > 0 && (
              <Text className="text-gray-400 text-xs font-semibold uppercase tracking-widest mt-5 mb-1">
                Saved
              </Text>
            )}
            {savedLocations.map((item, i) => (
              <PlaceRow
                key={`saved-${item.id ?? i}`}
                icon="bookmark"
                title={item.name}
                subtitle={`${Number(item.latitude).toFixed(4)}, ${Number(
                  item.longitude,
                ).toFixed(4)}`}
                onPress={() => handleSelectSaved(item)}
              />
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}
