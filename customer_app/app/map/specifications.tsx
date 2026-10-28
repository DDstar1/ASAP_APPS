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
    // isFinite also rules out Infinity, which JSON sends as null and Rust's f64 rejects
    if (fields.some((f) => !f.trim()) || values.some((v) => !Number.isFinite(v) || v < 0)) {
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
        type: itemType ?? existing?.type ?? null,
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

        <ScrollView
          contentContainerStyle={{ padding: 20, gap: 28 }}
          keyboardShouldPersistTaps="handled"
        >
          {!!itemType && (
            <View className="self-start flex-row items-center gap-2 bg-[#1C1C21] rounded-full px-4 py-2">
              <Ionicons name="cube-outline" size={16} color="#FF7518" />
              <Text className="text-white text-sm font-medium">{itemType}</Text>
            </View>
          )}

          <Section title="Dimensions" hint="The packed size, in centimetres">
            {/* flex-1 on these wrappers splits the row's width; the fields
                themselves don't flex, or they collapse in vertical layouts */}
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Field label="Length" unit="cm" value={length} onChange={setLength} />
              </View>
              <View className="flex-1">
                <Field label="Width" unit="cm" value={width} onChange={setWidth} />
              </View>
              <View className="flex-1">
                <Field label="Height" unit="cm" value={height} onChange={setHeight} />
              </View>
            </View>
          </Section>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Section title="Weight">
                <Field label="Per item" unit="kg" value={weight} onChange={setWeight} />
              </Section>
            </View>
            <View className="flex-1">
              <Section title="Quantity">
                <Field label="Items" value={quantity} onChange={setQuantity} keyboardType="number-pad" />
              </Section>
            </View>
          </View>

          <Section
            title="Item value"
            hint="What the package is worth. Some package types are insured against this amount."
          >
            <Field label="Value" prefix="₦" value={price} onChange={setPrice} />
          </Section>
        </ScrollView>

        {/* Footer */}
        <SafeAreaView edges={["bottom"]} className="bg-[#1C1C21] px-6 pt-5 pb-2">
          <TouchableOpacity
            onPress={handleSet}
            className="h-14 rounded-full bg-[#FF7518] justify-center items-center"
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

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <View>
      <Text className="text-white text-lg font-semibold">{title}</Text>
      {hint && <Text className="text-gray-400 text-xs mt-0.5">{hint}</Text>}
      <View className="mt-3">{children}</View>
    </View>
  );
}

// Full-size field: the label sits above the number and the unit stays inside,
// so nothing the customer types is cut off
function Field({
  label,
  value,
  onChange,
  unit,
  prefix,
  keyboardType = "decimal-pad",
}: {
  label: string;
  value: string;
  onChange: (text: string) => void;
  unit?: string;
  prefix?: string;
  keyboardType?: "decimal-pad" | "number-pad";
}) {
  return (
    <View className="bg-[#1C1C21] rounded-2xl px-4 pt-2.5 pb-3">
      <Text className="text-gray-400 text-xs">{label}</Text>
      <View className="flex-row items-center gap-1.5 mt-1">
        {prefix && <Text className="text-gray-300 text-lg">{prefix}</Text>}
        <TextInput
          value={value}
          onChangeText={onChange}
          keyboardType={keyboardType}
          accessibilityLabel={unit ? `${label} in ${unit}` : label}
          placeholder="0"
          placeholderTextColor="#4B5563"
          className="flex-1 text-white text-lg font-semibold p-0"
        />
        {unit && <Text className="text-gray-400 text-sm">{unit}</Text>}
      </View>
    </View>
  );
}
