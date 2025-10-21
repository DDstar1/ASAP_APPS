// app/map/DestinationSearchModal.tsx
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const locationSuggestions = [
  {
    id: "1",
    name: "Victoria Island",
    address: "Victoria Island, Lagos, Nigeria",
    distance: "12.5 km",
    type: "area",
    coordinates: { latitude: 6.4281, longitude: 3.4219 },
  },
  {
    id: "2",
    name: "Lekki Phase 1",
    address: "Lekki Phase 1, Lagos, Nigeria",
    distance: "8.3 km",
    type: "area",
    coordinates: { latitude: 6.4698, longitude: 3.5852 },
  },
  {
    id: "3",
    name: "Murtala Muhammed Airport",
    address: "Ikeja, Lagos, Nigeria",
    distance: "25.1 km",
    type: "airport",
    coordinates: { latitude: 6.5773, longitude: 3.3212 },
  },
];

export default function DestinationSearchModal({
  visible,
  onClose,
  onSelect,
  field, // "from" or "to"
}: {
  visible: boolean;
  onClose: () => void;
  onSelect: (location: any) => void;
  field: "from" | "to";
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredSuggestions, setFilteredSuggestions] =
    useState(locationSuggestions);

  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredSuggestions(locationSuggestions);
    } else {
      const filtered = locationSuggestions.filter(
        (location) =>
          location.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          location.address.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredSuggestions(filtered);
    }
  }, [searchQuery]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-gray-900 p-4">
        {/* Header */}
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

        {/* Search Box */}
        <View className="flex-row items-center bg-gray-800 rounded-lg px-3 h-12 border border-gray-700">
          <Ionicons name="search" size={18} color="#fb923c" />
          <TextInput
            className="ml-2 flex-1 text-base text-gray-100"
            placeholder={`Search for ${
              field === "from" ? "pickup" : "destination"
            }...`}
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoFocus
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={20} color="#9CA3AF" />
            </TouchableOpacity>
          )}
        </View>

        {/* Suggestions */}
        <ScrollView
          className="mt-4 rounded-lg border border-gray-800 bg-gray-900"
          keyboardShouldPersistTaps="handled"
        >
          {filteredSuggestions.map((location) => (
            <TouchableOpacity
              key={location.id}
              className="flex-row items-center p-4 border-b border-gray-800 active:bg-gray-800"
              onPress={() => {
                onSelect(location);
                onClose();
              }}
            >
              <Ionicons
                name="location-outline"
                size={18}
                color="#fb923c"
                style={{ marginRight: 12 }}
              />
              <View className="flex-1">
                <Text className="text-gray-100 font-medium" numberOfLines={1}>
                  {location.name}
                </Text>
                <Text className="text-gray-400 text-sm" numberOfLines={1}>
                  {location.address}
                </Text>
              </View>
              <Text className="text-gray-500 text-sm">{location.distance}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}
