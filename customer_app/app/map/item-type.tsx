import { useRideDraftStore } from "@/store/useRideDraftStore";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ITEM_TYPES = [
  "Documents",
  "Clothing & Fashion Items",
  "Medical Supplies",
  "Food & Groceries",
  "Gifts & Flowers",
  "Industrial Parts",
  "Fragile Items",
  "Electronics",
  "Hazardous / Restricted Items",
  "Oversized / Heavy Items",
  "Valuables",
  "Other",
];

export default function ItemTypeScreen() {
  const { itemType, setItemType } = useRideDraftStore();
  const [selected, setSelected] = useState<string | null>(
    itemType && !ITEM_TYPES.includes(itemType) ? "Other" : itemType,
  );
  const [customType, setCustomType] = useState(
    itemType && !ITEM_TYPES.includes(itemType) ? itemType : "",
  );

  const handleSet = () => {
    if (!selected) {
      Alert.alert("Select an item type to continue.");
      return;
    }
    const itemType = selected === "Other" ? customType.trim() : selected;
    if (!itemType) {
      Alert.alert("Tell us what you are sending.");
      return;
    }
    setItemType(itemType);
    router.push("/map/specifications");
  };

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-black">
      <KeyboardAvoidingView
        className="flex-1"
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* Header */}
        <View className="flex-row items-center justify-center px-4 py-3">
          <TouchableOpacity
            onPress={() => router.back()}
            className="absolute left-4 w-11 h-11 rounded-full bg-[#2C2C30] justify-center items-center"
          >
            <Ionicons name="chevron-back" size={22} color="white" />
          </TouchableOpacity>
          <Text className="text-white text-2xl font-bold">Item Type</Text>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: 32 }}>
          {ITEM_TYPES.map((type) => {
            const isSelected = type === selected;
            return (
              <TouchableOpacity
                key={type}
                onPress={() => setSelected(type)}
                className="flex-row items-center gap-5 py-6 border-b border-[#3A3A3F]"
              >
                <Ionicons
                  name={isSelected ? "checkbox-outline" : "square-outline"}
                  size={24}
                  color="white"
                />
                <Text className="text-white text-lg">{type}</Text>
              </TouchableOpacity>
            );
          })}

          {selected === "Other" && (
            <TextInput
              className="mt-4 border border-[#3A3A3F] rounded-xl p-3 text-white"
              placeholder="What are you sending?"
              placeholderTextColor="#6B7280"
              value={customType}
              onChangeText={setCustomType}
            />
          )}
        </ScrollView>

        {/* Footer */}
        <SafeAreaView edges={["bottom"]} className="bg-[#1C1C21] px-6 pt-5 pb-2">
          <TouchableOpacity
            onPress={handleSet}
            className="h-14 rounded-full bg-[#EE7F3A] justify-center items-center"
          >
            <Text className="text-white text-lg font-bold">Set</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
