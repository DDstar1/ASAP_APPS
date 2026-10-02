import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { SafeAreaView } from "react-native-safe-area-context";
import { confirmReturn } from "@/lib/supabase-app-functions";

interface Props {
  visible: boolean;
  orderRef: string | null;
  driverId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const CODE_LENGTH = 6;

export default function ReturnCodeModal({
  visible,
  orderRef,
  driverId,
  onClose,
  onSuccess,
}: Props) {
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) setCode("");
  }, [visible]);

  const ready = code.length === CODE_LENGTH && !!orderRef;

  const handleConfirm = async () => {
    if (!ready || submitting || !orderRef) return;
    setSubmitting(true);
    const result = await confirmReturn(orderRef, driverId, code);
    setSubmitting(false);
    if (result.success) {
      onSuccess();
      Alert.alert("Return complete", "The package has been returned.");
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
      onRequestClose={onClose}
    >
      <Pressable
        style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.85)" }}
        onPress={onClose}
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
        <View
          style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            backgroundColor: "#2a3245",
            alignSelf: "center",
            marginBottom: 24,
          }}
        />

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 12,
            marginBottom: 24,
          }}
        >
          <View
            style={{
              width: 44,
              height: 44,
              borderRadius: 14,
              backgroundColor: "rgba(255,146,62,0.15)",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <MaterialIcons name="assignment-return" size={22} color="#ff923e" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: "#e0e5f9", fontSize: 16, fontWeight: "700" }}>
              Confirm Return
            </Text>
            <Text style={{ color: "#a5abbd", fontSize: 12, marginTop: 2 }}>
              Enter the return code
            </Text>
          </View>
        </View>

        <TextInput
          value={code}
          onChangeText={(t) =>
            setCode(t.replace(/[^0-9]/g, "").slice(0, CODE_LENGTH))
          }
          keyboardType="number-pad"
          maxLength={CODE_LENGTH}
          placeholder="000000"
          placeholderTextColor="#3a4358"
          autoFocus
          style={{
            backgroundColor: "#121a2b",
            borderWidth: 1.5,
            borderColor: code.length ? "#ff923e" : "#1e2a40",
            borderRadius: 16,
            color: "#e0e5f9",
            fontSize: 26,
            fontWeight: "700",
            letterSpacing: 10,
            textAlign: "center",
            paddingVertical: 14,
            marginBottom: 24,
          }}
        />

        <TouchableOpacity
          onPress={handleConfirm}
          disabled={!ready || submitting}
          activeOpacity={0.85}
          style={{
            borderRadius: 50,
            paddingVertical: 16,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: 8,
            backgroundColor: ready ? "#ff923e" : "rgba(255,146,62,0.2)",
          }}
        >
          {submitting ? (
            <ActivityIndicator color="#000" />
          ) : (
            <>
              <MaterialIcons
                name="check-circle"
                size={18}
                color={ready ? "#000" : "#555"}
              />
              <Text
                style={{
                  fontWeight: "700",
                  fontSize: 15,
                  color: ready ? "#000" : "#555",
                }}
              >
                CONFIRM RETURN
              </Text>
            </>
          )}
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
}
