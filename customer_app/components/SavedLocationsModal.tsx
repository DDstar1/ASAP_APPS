import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  TextInput,
  Linking,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import { INITIAL_LOCATIONS } from "@/utils/dummyData";
import {
  addSavedLocation,
  deleteSavedLocation,
  getSavedLocations,
} from "@/lib/supabase-app-functions";

export default function SavedLocationsModal({
  visible,
  onClose,
  SharedlocationDetails,
  onClearSharedDetails,
}: {
  visible: boolean;
  onClose: () => void;
  SharedlocationDetails: any;
  onClearSharedDetails: () => void;
}) {
  const [locations, setLocations] = useState(INITIAL_LOCATIONS);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedName, setEditedName] = useState("");
  const [newName, setNewName] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [loading, setLoading] = useState(false); // 🔹 Spinner for fetching

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
    Alert.alert(
      "Delete Location",
      "Are you sure you want to delete this location?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { success, error } = await deleteSavedLocation(id);

              if (error || !success) {
                console.error(
                  "❌ Failed to delete location:",
                  error?.message || "Unknown error"
                );
                return;
              }

              setLocations((prev) => prev.filter((loc) => loc.id !== id));
              console.log(`✅ Successfully deleted location ID: ${id}`);
            } catch (err: any) {
              console.error("Error deleting location:", err.message);
            }
          },
        },
      ]
    );
  };

  const handleAddNewLocation = async () => {
    if (!newName.trim()) return;

    const newLoc = {
      id: Date.now().toString(),
      name: newName.trim(),
      lat: parseFloat(SharedlocationDetails?.lat || 0),
      lng: parseFloat(SharedlocationDetails?.lng || 0),
      date: new Date().toLocaleDateString(),
    };

    setIsSaving(true);
    try {
      await addSavedLocation({
        name: newLoc.name,
        latitude: newLoc.lat,
        longitude: newLoc.lng,
      });

      setLocations((prev) => [newLoc, ...prev]);
      setNewName("");
    } catch (error) {
      console.error("Failed to save location:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // 🔹 Fetch from Supabase
  const getSavedLocationsFromDB = async () => {
    try {
      setLoading(true);
      const { data, error } = await getSavedLocations();
      setLoading(false);

      if (error) {
        console.error("❌ Failed to fetch saved locations:", error.message);
        return [];
      }

      const formatted = (data || []).map((loc) => ({
        id: loc.id.toString(),
        name: loc.name,
        lat: Number(loc.latitude),
        lng: Number(loc.longitude),
        date: new Date(loc.created_at).toLocaleDateString(),
      }));

      setLocations(formatted);
      return formatted;
    } catch (err: any) {
      setLoading(false);
      console.error("Error loading saved locations:", err.message);
      return [];
    }
  };

  // 🔹 Auto-fetch when modal opens
  useEffect(() => {
    if (visible) {
      getSavedLocationsFromDB();
    }
  }, [visible]);

  const cameFromSharedLink =
    SharedlocationDetails?.modal === "sharedlocation" &&
    SharedlocationDetails?.edit === "true";

  return (
    <Modal
      key={SharedlocationDetails?.key}
      visible={visible}
      animationType="slide"
      transparent
    >
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
            stickyHeaderIndices={cameFromSharedLink ? [0] : undefined}
            ListHeaderComponent={
              SharedlocationDetails.modal && SharedlocationDetails.edit ? (
                <View className="bg-gray-800/95 p-4 rounded-xl mb-4 border-2 border-orange-500/30 shadow-2xl relative">
                  {/* X Button */}
                  <TouchableOpacity
                    onPress={onClearSharedDetails}
                    className="absolute top-2 right-2 bg-gray-700/70 rounded-full p-1.5"
                  >
                    <Ionicons name="close" size={18} color="white" />
                  </TouchableOpacity>

                  <View className="flex-row items-center mb-2">
                    <View className="bg-orange-500 p-1.5 rounded-full mr-2">
                      <Ionicons name="add-circle" size={16} color="white" />
                    </View>
                    <Text className="text-white font-bold text-base">
                      Add New Shared Location
                    </Text>
                  </View>

                  <View className="flex-row justify-evenly bg-gray-800/50 p-3 rounded-lg mb-3 border border-gray-700">
                    <Text className="text-gray-300 text-sm">
                      📍 Latitude:
                      <Text className="text-orange-400 font-mono">
                        {SharedlocationDetails.lat}
                      </Text>
                    </Text>
                    <Text className="text-gray-300 text-sm">
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
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text className="text-white font-bold text-center">
                          Save
                        </Text>
                      )}
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
              loading ? (
                <View className="flex-1 justify-center items-center mt-12">
                  <ActivityIndicator size="large" color="#f97316" />
                  <Text className="text-gray-400 mt-2">Loading...</Text>
                </View>
              ) : (
                <View className="flex-1 justify-center items-center mt-12">
                  <Ionicons name="location-outline" size={40} color="#6B7280" />
                  <Text className="text-gray-400 mt-2 text-center">
                    No saved locations yet.
                  </Text>
                </View>
              )
            }
          />
        </SafeAreaView>
      </View>
    </Modal>
  );
}
