import CameraModal from "@/components/CameraModal";
import { useRideDraftStore } from "@/store/useRideDraftStore";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
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

// First pass (from item type): Set → photo → back to the map to book.
// Opened with ?edit=1 from the map's "Item description" chip: Set → back.
export default function SpecificationsScreen() {
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  const { itemType, items, setItems, setImageUrl } = useRideDraftStore();
  const existing = items[0];

  // ItemDetails.dimensions is (length, width, height)
  const [height, setHeight] = useState(numText(existing?.dimensions[2]));
  const [length, setLength] = useState(numText(existing?.dimensions[0]));
  const [width, setWidth] = useState(numText(existing?.dimensions[1]));
  const [weight, setWeight] = useState(numText(existing?.weight));
  const [quantity, setQuantity] = useState(numText(existing?.quantity ?? 1));
  const [price, setPrice] = useState(numText(existing?.price));
  const [cameraVisible, setCameraVisible] = useState(false);

  const backToMap = () => router.dismissTo("/map");

  const handleSet = () => {
    const fields = [height, length, width, weight, quantity, price];
    const values = fields.map(Number);
    if (fields.some((f) => !f.trim()) || values.some((v) => isNaN(v) || v < 0)) {
      Alert.alert("Missing details", "Fill in every field with a number.");
      return;
    }
    const [h, l, w, kg, qty, naira] = values;
    if (!Number.isInteger(qty) || qty < 1) {
      Alert.alert("Quantity", "Quantity must be a whole number, 1 or more.");
      return;
    }

    setItems([
      {
        name: itemType ?? existing?.name ?? "Package",
        price: Math.round(naira),
        dimensions: [l, w, h],
        quantity: qty,
        weight: kg,
        image_url: existing?.image_url ?? null,
      },
    ]);

    if (edit) backToMap();
    else setCameraVisible(true);
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
          <Text className="text-white text-2xl font-bold">Specifications</Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 32, gap: 56 }}>
          <View>
            <Text className="text-white text-xl mb-1">Dimensions</Text>
            <View className="flex-row items-center gap-4">
              <Field label="H" value={height} onChange={setHeight} />
              <Field label="L" value={length} onChange={setLength} />
              <Field label="W" value={width} onChange={setWidth} />
            </View>
          </View>

          <View>
            <Text className="text-white text-xl mb-1">Weight</Text>
            <Field label="Kg" value={weight} onChange={setWeight} />
          </View>

          <View>
            <Text className="text-white text-xl mb-1">Quantity</Text>
            <Field
              label="Qty"
              value={quantity}
              onChange={setQuantity}
              keyboardType="number-pad"
            />
          </View>

          <View>
            <Text className="text-white text-xl mb-1">Current Price</Text>
            <Field label="₦" value={price} onChange={setPrice} wide />
          </View>
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

      {/* Photo step: CameraModal asks first and allows skipping */}
      <CameraModal
        visible={cameraVisible}
        onClose={() => setCameraVisible(false)}
        onConfirm={(imageUrl) => {
          setCameraVisible(false);
          setImageUrl(imageUrl);
          backToMap();
        }}
      />
    </SafeAreaView>
  );
}

function numText(value?: number) {
  return value != null ? String(value) : "";
}

function Field({
  label,
  value,
  onChange,
  wide,
  keyboardType = "decimal-pad",
}: {
  label: string;
  value: string;
  onChange: (text: string) => void;
  wide?: boolean;
  keyboardType?: "decimal-pad" | "number-pad";
}) {
  return (
    <View className="flex-row items-center gap-1">
      <Text className="text-white text-base">{label} :</Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType={keyboardType}
        className={`h-8 border border-white text-white px-1 ${wide ? "w-52" : "w-14"}`}
      />
    </View>
  );
}
