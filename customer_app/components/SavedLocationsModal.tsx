import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Ionicons } from "@expo/vector-icons";
import { INITIAL_LOCATIONS } from "@/utils/dummyData";

export default function SavedLocationsModal({
  visible,
  onClose,
  SharedlocationDetails,
}: {
  visible: boolean;
  onClose: () => void;
  SharedlocationDetails: any;
}) {
  const [locations, setLocations] = useState(INITIAL_LOCATIONS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState("");
  const [newName, setNewName] = useState("");

  const openInMaps = (lat: number, lng: number) => {
    const url = `https://www.google.com/maps?q=${lat},${lng}`;
    Linking.openURL(url);
  };

  const handleSaveName = (id: string) => {
    setLocations((prev) =>
      prev.map((loc) =>
        loc.id === id ? { ...loc, name: editedName.trim() || loc.name } : loc
      )
    );
    setEditingId(null);
    setEditedName("");
  };

  const handleDeleteLocation = (id: string) => {
    setLocations((prev) => prev.filter((loc) => loc.id !== id));
  };

  const handleAddNewLocation = () => {
    if (!newName.trim()) return;

    const newLoc = {
      id: Date.now().toString(),
      name: newName.trim(),
      lat: parseFloat(SharedlocationDetails?.lat || 0),
      lng: parseFloat(SharedlocationDetails?.lng || 0),
      date: new Date().toLocaleDateString(),
    };

    setLocations((prev) => [newLoc, ...prev]);
    setNewName("");
  };

  const cameFromSharedLink =
    SharedlocationDetails?.modal === "sharedlocation" &&
    SharedlocationDetails?.edit === "true";

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View className="flex-1 justify-end bg-black/80">
        <SafeAreaView
          style={{ height: 500 }}
          className="w-full bg-gray-900 rounded-t-[25px] p-4"
        >
          <View className="self-center w-12 h-1.5 bg-gray-600 rounded-full mb-3" />

          {/* Header */}
          <View className="flex-row items-center mb-4">
            <TouchableOpacity
              onPress={onClose}
              className="h-10 w-10 items-center justify-center rounded-full bg-gray-800"
            >
              <Ionicons name="close" size={22} color="#f97316" />
            </TouchableOpacity>
            <Text className="ml-3 text-lg font-semibold text-gray-100">
              Saved Locations
            </Text>
          </View>

          {/* Locations List */}
          <FlatList
            data={locations}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            stickyHeaderIndices={!cameFromSharedLink ? [0] : undefined}
            ListHeaderComponent={
              !cameFromSharedLink ? (
                <View className="bg-gray-800/95 p-4 rounded-xl mb-4 border-2 border-orange-500/30 shadow-2xl">
                  <View className="flex-row items-center mb-2">
                    <View className="bg-orange-500 p-1.5 rounded-full mr-2">
                      <Ionicons name="add-circle" size={16} color="white" />
                    </View>
                    <Text className="text-white font-bold text-base">
                      Add New Shared Location
                    </Text>
                  </View>

                  <View className="flex-row justify-between bg-gray-800/50 p-3 rounded-lg mb-3 border border-gray-700">
                    <Text className="text-gray-300 text-sm">
                      📍 Latitude:
                      <Text className="text-orange-400 font-mono">
                        {SharedlocationDetails.lat}
                      </Text>
                    </Text>
                    <Text className="text-gray-300 text-sm ">
                      📍 Longitude:
                      <Text className="text-orange-400 font-mono">
                        {SharedlocationDetails.lng}
                      </Text>
                    </Text>
                  </View>

                  <View className="flex-row justify-center items-center gap-3">
                    <TextInput
                      value={newName}
                      onChangeText={setNewName}
                      placeholder="Enter location name"
                      placeholderTextColor="#9CA3AF"
                      className="bg-gray-800 text-white px-4 py-3 rounded-lg flex-1 border border-gray-700"
                    />

                    <TouchableOpacity
                      onPress={handleAddNewLocation}
                      className="bg-orange-500 px-5 py-3 rounded-lg shadow-lg active:bg-orange-600"
                    >
                      <Text className="text-white font-bold text-center">
                        Save
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null
            }
            renderItem={({ item }) => (
              <View className="flex-row items-center justify-between bg-gray-800 p-4 rounded-xl mb-3">
                <View className="flex-1 mr-2">
                  {editingId === item.id ? (
                    <View className="flex-row items-center">
                      <TextInput
                        value={editedName}
                        onChangeText={setEditedName}
                        className="flex-1 bg-gray-700 text-white px-2 py-1 rounded-lg"
                        autoFocus
                      />
                      <TouchableOpacity
                        onPress={() => handleSaveName(item.id)}
                        className="ml-2 p-2 bg-gray-700 rounded-full"
                      >
                        <Ionicons name="checkmark" size={15} color="#22c55e" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View className="flex-row items-center">
                      <Text className="text-white font-semibold text-base mr-2">
                        {item.name}
                      </Text>
                      <TouchableOpacity
                        onPress={() => {
                          setEditingId(item.id);
                          setEditedName(item.name);
                        }}
                      >
                        <Ionicons name="pencil" size={16} color="#f97316" />
                      </TouchableOpacity>
                    </View>
                  )}
                  <Text className="text-gray-400 text-xs mt-1">
                    Lat: {item.lat.toFixed(4)}, Lng: {item.lng.toFixed(4)}
                  </Text>
                  <Text className="text-gray-500 text-xs mt-1">
                    {item.date}
                  </Text>
                </View>

                {editingId !== item.id && (
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => openInMaps(item.lat, item.lng)}
                      className="p-2 bg-gray-700 rounded-full"
                    >
                      <Ionicons name="map-outline" size={20} color="#f97316" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeleteLocation(item.id)}
                      className="p-2 bg-red-600/20 rounded-full border border-red-500/30"
                    >
                      <Ionicons
                        name="trash-outline"
                        size={20}
                        color="#ef4444"
                      />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
            ListEmptyComponent={
              <View className="flex-1 justify-center items-center mt-12">
                <Ionicons name="location-outline" size={40} color="#6B7280" />
                <Text className="text-gray-400 mt-2 text-center">
                  No saved locations yet.
                </Text>
              </View>
            }
          />
        </SafeAreaView>
      </View>
    </Modal>
  );
}
