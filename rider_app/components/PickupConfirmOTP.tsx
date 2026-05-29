import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Alert,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { confirmRidePickup } from "@/lib/supabase-app-functions";

interface Props {
  visible: boolean;
  onClose: () => void;
  orderRef: string;
  driverId: string;
  dropoffLat: number;
  dropoffLng: number;
  driverLat: number | null;
  driverLng: number | null;
  onSuccess: () => void;
}

function haversineMeters(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function haversineMetersExported(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
) {
  return haversineMeters(lat1, lon1, lat2, lon2);
}

const PickupConfirmOTP: React.FC<Props> = ({
  visible,
  onClose,
  orderRef,
  driverId,
  dropoffLat,
  dropoffLng,
  driverLat,
  driverLng,
  onSuccess,
}) => {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const distance =
    driverLat != null && driverLng != null
      ? haversineMeters(driverLat, driverLng, dropoffLat, dropoffLng)
      : Infinity;

  const inRange = distance <= 100;
  const distanceText =
    distance === Infinity
      ? "—"
      : distance < 1000
        ? `${Math.round(distance)}m`
        : `${(distance / 1000).toFixed(1)}km`;

  const digits = code.padEnd(6, " ").split("");

  const handleClose = () => {
    setCode("");
    onClose();
  };

  const handleConfirm = async () => {
    if (code.length !== 6 || !inRange) return;
    setSubmitting(true);
    const result = await confirmRidePickup(orderRef, driverId, code);
    setSubmitting(false);
    if (result.success) {
      setCode("");
      onSuccess();
    } else {
      Alert.alert("Invalid Code", result.error || "Code verification failed.");
      setCode("");
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)" }}
        onPress={handleClose}
      />

      <SafeAreaView
        edges={["bottom"]}
        style={{
          backgroundColor: "#0f1626",
          borderTopLeftRadius: 28,
          borderTopRightRadius: 28,
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: 32,
        }}
      >
        {/* Handle */}
        <View
          style={{
            width: 40, height: 4, borderRadius: 2,
            backgroundColor: "#2a3245",
            alignSelf: "center", marginBottom: 24,
          }}
        />

        {/* Header */}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 20 }}>
          <View
            style={{
              width: 44, height: 44, borderRadius: 14,
              backgroundColor: "rgba(255,146,62,0.15)",
              alignItems: "center", justifyContent: "center",
            }}
          >
            <MaterialIcons name="verified" size={22} color="#ff923e" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#e0e5f9", fontSize: 16, fontWeight: "700" }}>
              Confirm Trip Completion
            </Text>
            <Text style={{ color: "#a5abbd", fontSize: 12, marginTop: 2 }}>
              Enter the 6-digit code from your passenger
            </Text>
          </View>
        </View>

        {/* Distance badge */}
        <View
          style={{
            flexDirection: "row", alignItems: "center", gap: 8,
            paddingHorizontal: 12, paddingVertical: 10,
            borderRadius: 12, marginBottom: 28,
            backgroundColor: inRange
              ? "rgba(16,185,129,0.15)"
              : "rgba(165,171,189,0.08)",
          }}
        >
          <MaterialIcons
            name={inRange ? "location-on" : "location-off"}
            size={16}
            color={inRange ? "#10b981" : "#a5abbd"}
          />
          <Text style={{ fontSize: 12, fontWeight: "600", color: inRange ? "#10b981" : "#a5abbd" }}>
            {inRange
              ? `Within range · ${distanceText}`
              : `${distanceText} from dropoff — move closer`}
          </Text>
        </View>

        {/* 6 OTP circles */}
        <Pressable
          onPress={() => inRange && inputRef.current?.focus()}
          style={{
            flexDirection: "row", justifyContent: "space-between",
            marginBottom: 32,
            opacity: inRange ? 1 : 0.4,
          }}
        >
          {digits.map((d, i) => {
            const filled = d.trim().length > 0;
            const active = code.length === i;
            return (
              <View
                key={i}
                style={{
                  width: 48, height: 58, borderRadius: 16,
                  backgroundColor: filled ? "#1c2a42" : "#121a2b",
                  borderWidth: 1.5,
                  borderColor: active
                    ? "#ff923e"
                    : filled
                      ? "rgba(255,146,62,0.4)"
                      : "#1e2a40",
                  alignItems: "center", justifyContent: "center",
                }}
              >
                {filled ? (
                  <Text style={{ color: "#e0e5f9", fontSize: 24, fontWeight: "700" }}>
                    {d}
                  </Text>
                ) : active ? (
                  <View
                    style={{
                      width: 2, height: 26, borderRadius: 1,
                      backgroundColor: "#ff923e",
                    }}
                  />
                ) : null}
              </View>
            );
          })}
        </Pressable>

        {/* Hidden real input */}
        <TextInput
          ref={inputRef}
          value={code}
          onChangeText={(t) => setCode(t.replace(/[^0-9]/g, "").slice(0, 6))}
          keyboardType="number-pad"
          maxLength={6}
          editable={inRange}
          style={{ position: "absolute", opacity: 0, width: 1, height: 1 }}
        />

        {/* Confirm button */}
        <TouchableOpacity
          onPress={handleConfirm}
          disabled={code.length !== 6 || !inRange || submitting}
          style={{ borderRadius: 50, overflow: "hidden" }}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={
              code.length === 6 && inRange
                ? ["#ff923e", "#c46018"]
                : ["rgba(255,146,62,0.2)", "rgba(196,96,24,0.2)"]
            }
            style={{
              paddingVertical: 16,
              alignItems: "center", justifyContent: "center",
              flexDirection: "row", gap: 8,
            }}
          >
            {submitting ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <MaterialIcons
                  name="check-circle"
                  size={18}
                  color={code.length === 6 && inRange ? "#000" : "#555"}
                />
                <Text
                  style={{
                    fontWeight: "700", fontSize: 15,
                    color: code.length === 6 && inRange ? "#000" : "#555",
                  }}
                >
                  CONFIRM TRIP
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
};

export default PickupConfirmOTP;
