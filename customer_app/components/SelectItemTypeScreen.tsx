import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  KeyboardAvoidingView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

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

interface Props {
  visible: boolean;
  onClose: () => void;
  onConfirm: (packageType: string, description?: string) => void;
}

export default function SelectItemTypeScreen({
  visible,
  onClose,
  onConfirm,
}: Props) {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [customType, setCustomType] = useState<string>("");
  const [customDescription, setCustomDescription] = useState<string>("");

  const handleSelect = (type: string) => {
    setSelectedType(type);
    if (type !== "Other") {
      setCustomType("");
      setCustomDescription("");
    }
  };

  const handleNext = () => {
    if (!selectedType) {
      Alert.alert("Please select an item type to continue.");
      return;
    }
    if (selectedType === "Other" && !customType.trim()) {
      Alert.alert("Please specify what you are sending.");
      return;
    }

    const finalType =
      selectedType === "Other" ? customType.trim() : selectedType;
    onConfirm(finalType, customDescription.trim());
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView
        className="flex-1 justify-end bg-black/50"
        behavior="padding"
      >
        <SafeAreaView className="bg-gray-100 rounded-t-3xl p-6 h-3/4">
          <Text className="text-lg font-semibold text-gray-800 mb-4">
            Select the type of item you’re sending:
          </Text>

          <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
            {ITEM_TYPES.map((item) => {
              const isSelected = item === selectedType;
              return (
                <TouchableOpacity
                  key={item}
                  className="flex-row items-center p-3 mb-2 bg-white rounded-xl border border-gray-300"
                  onPress={() => handleSelect(item)}
                >
                  {/* Checkbox */}
                  <View
                    className={`w-6 h-6 rounded border mr-4 justify-center items-center ${
                      isSelected
                        ? "bg-indigo-600 border-indigo-800"
                        : "bg-white border-gray-400"
                    }`}
                  >
                    {isSelected && (
                      <Ionicons name="checkmark" size={18} color="white" />
                    )}
                  </View>
                  <Text className="text-gray-800 text-base">{item}</Text>
                </TouchableOpacity>
              );
            })}

            {/* Custom input for "Other" */}
            {selectedType === "Other" && (
              <View className="mt-4">
                <TextInput
                  className="border border-gray-300 rounded-xl p-3 mb-3 bg-white text-gray-800"
                  placeholder="What are you sending?"
                  placeholderTextColor="#9CA3AF"
                  value={customType}
                  onChangeText={setCustomType}
                />
                <TextInput
                  className="border border-gray-300 rounded-xl p-3 bg-white text-gray-800"
                  placeholder="Short description (optional)"
                  placeholderTextColor="#9CA3AF"
                  value={customDescription}
                  onChangeText={setCustomDescription}
                />
              </View>
            )}
          </ScrollView>

          <TouchableOpacity
            className="bg-indigo-600 p-4 rounded-xl items-center mt-4"
            onPress={handleNext}
          >
            <Text className="text-white text-base font-semibold">Next</Text>
          </TouchableOpacity>

          <TouchableOpacity className="mt-3 items-center" onPress={onClose}>
            <Text className="text-indigo-600 font-semibold">Cancel</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}
