import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";

interface CodeInputComponentProps {
  currentDelivery: {
    id: string;
    order_code: string;
    status: string;
    pickup_name: string;
    dropoff_name: string;
  } | null;
  onSubmitCode: (code: string, type: "pickup" | "dropoff") => Promise<void>;
  hasOngoingDeliveries: boolean;
}

const CodeInputComponent: React.FC<CodeInputComponentProps> = ({
  currentDelivery,
  onSubmitCode,
  hasOngoingDeliveries,
}) => {
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ✅ If no active delivery OR manually disabled → hide component
  //console.log(
  //"Rendering CodeInputComponent - hasOngoingDeliveries:",
  //hasOngoingDeliveries,
  //"currentDelivery:",
  //currentDelivery,
  //);
  if (!hasOngoingDeliveries || !currentDelivery) {
    return null;
  }

  // Determine which code is needed
  const needsPickupCode = currentDelivery.status === "arriving_pickup";
  const needsDropoffCode = currentDelivery.status === "in_transit";

  // If delivery is completed or in unknown state → hide
  // if (!needsPickupCode && !needsDropoffCode) {
  //  return null;
  // }

  const codeType: "pickup" | "dropoff" = needsPickupCode ? "pickup" : "dropoff";

  const locationName = needsPickupCode
    ? currentDelivery.pickup_name
    : currentDelivery.dropoff_name;

  const handleSubmit = async () => {
    if (code.trim().length < 4) {
      Alert.alert("Invalid Code", "Please enter a valid code");
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmitCode(code.trim(), codeType);
      setCode(""); // Clear input after success
    } catch (error) {
      console.error("Error submitting code:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <LinearGradient
      colors={needsPickupCode ? ["#F59E0B", "#EA580C"] : ["#10B981", "#059669"]}
      style={{ borderRadius: 16, padding: 16, overflow: "hidden" }}
    >
      {/* Header */}
      <View className="flex-row items-center mb-4">
        <View
          className={`w-12 h-12 ${
            needsPickupCode ? "bg-orange-100" : "bg-green-100"
          } rounded-2xl justify-center items-center mr-3`}
        >
          <Ionicons
            name={needsPickupCode ? "cube-outline" : "checkmark-circle-outline"}
            size={26}
            color={needsPickupCode ? "#F59E0B" : "#10B981"}
          />
        </View>

        <View className="flex-1">
          <Text className="text-white text-lg font-bold">
            {needsPickupCode ? "Pickup" : "Dropoff"} Code
          </Text>
          <Text
            className={`${
              needsPickupCode ? "text-orange-200" : "text-green-200"
            } text-sm`}
          >
            Order: {currentDelivery.order_code}
          </Text>
        </View>
      </View>

      {/* Location */}
      <View className="bg-white/20 rounded-xl p-3 mb-4">
        <Text
          className={`${
            needsPickupCode ? "text-orange-200" : "text-green-200"
          } text-xs tracking-wide mb-1`}
        >
          LOCATION
        </Text>
        <Text className="text-white text-base font-semibold">
          {locationName}
        </Text>
      </View>

      {/* Instruction */}
      <Text className="text-white text-sm mb-3">
        Enter the {codeType} code provided by the customer:
      </Text>

      {/* Input */}
      <View className="bg-white rounded-xl overflow-hidden mb-3">
        <TextInput
          value={code}
          onChangeText={setCode}
          placeholder={`Enter ${codeType} code`}
          placeholderTextColor="#9CA3AF"
          className="px-4 py-4 text-gray-900 text-base font-semibold"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={15}
          editable={!isSubmitting}
        />
      </View>

      {/* Button */}
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={handleSubmit}
        disabled={isSubmitting || code.trim().length < 4}
      >
        <LinearGradient
          colors={
            isSubmitting || code.trim().length < 4
              ? ["#D1D5DB", "#9CA3AF"]
              : needsPickupCode
                ? ["#F59E0B", "#EA580C"]
                : ["#10B981", "#059669"]
          }
          style={{ borderRadius: 12, padding: 16 }}
        >
          <Text className="text-white text-center text-base font-bold">
            {isSubmitting
              ? "Verifying..."
              : `Confirm ${needsPickupCode ? "Pickup" : "Dropoff"}`}
          </Text>
        </LinearGradient>
      </TouchableOpacity>

      {/* Info */}
      <View className="bg-white/20 rounded-xl p-3 mt-4">
        <View className="flex-row items-center">
          <Ionicons
            name="information-circle-outline"
            size={20}
            color={needsPickupCode ? "#FED7AA" : "#D1FAE5"}
          />
          <Text
            className={`${
              needsPickupCode ? "text-orange-100" : "text-green-100"
            } text-xs ml-2 flex-1`}
          >
            The customer will provide you with this code when you arrive.
          </Text>
        </View>
      </View>
    </LinearGradient>
  );
};

export default CodeInputComponent;
