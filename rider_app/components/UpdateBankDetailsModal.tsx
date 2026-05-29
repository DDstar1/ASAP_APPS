import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Alert,
} from "react-native";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { MyKeyboardAvoidingWrapper } from "./MyKeyboardAvoidingWrapper";
import { updateBankDetails } from "@/lib/supabase-app-functions";

const NIGERIAN_BANKS = [
  { name: "Access Bank", code: "044" },
  { name: "Citibank", code: "023" },
  { name: "Ecobank", code: "050" },
  { name: "Fidelity Bank", code: "070" },
  { name: "First Bank of Nigeria", code: "011" },
  { name: "First City Monument Bank (FCMB)", code: "214" },
  { name: "Guaranty Trust Bank (GTBank)", code: "058" },
  { name: "Heritage Bank", code: "030" },
  { name: "Jaiz Bank", code: "301" },
  { name: "Keystone Bank", code: "082" },
  { name: "Kuda Bank", code: "090267" },
  { name: "Moniepoint", code: "50515" },
  { name: "OPay", code: "100004" },
  { name: "PalmPay", code: "100033" },
  { name: "Polaris Bank", code: "076" },
  { name: "Providus Bank", code: "101" },
  { name: "Stanbic IBTC Bank", code: "221" },
  { name: "Standard Chartered", code: "068" },
  { name: "Sterling Bank", code: "232" },
  { name: "Union Bank", code: "032" },
  { name: "United Bank for Africa (UBA)", code: "033" },
  { name: "Unity Bank", code: "215" },
  { name: "Wema Bank", code: "035" },
  { name: "Zenith Bank", code: "057" },
];

interface Props {
  visible: boolean;
  driverId: string;
  onClose: () => void;
  onSaved: () => void;
}

export function UpdateBankDetailsModal({ visible, driverId, onClose, onSaved }: Props) {
  const [accountNumber, setAccountNumber] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);

  const selectedBank = NIGERIAN_BANKS.find((b) => b.code === bankCode);

  const handleClose = () => {
    setAccountNumber("");
    setBankCode("");
    setShowPicker(false);
    onClose();
  };

  const handleSave = async () => {
    if (!accountNumber || !bankCode) return;
    setLoading(true);
    const result = await updateBankDetails(driverId, accountNumber, bankCode);
    setLoading(false);
    if (result.success) {
      Alert.alert("Saved", "Bank details updated successfully.");
      handleClose();
      onSaved();
    } else {
      Alert.alert("Error", result.error ?? "Failed to save bank details.");
    }
  };

  const isReady = accountNumber.length >= 10 && !!bankCode;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <MyKeyboardAvoidingWrapper>
        <Pressable className="flex-1 bg-black/90" onPress={handleClose} />

        <SafeAreaView edges={["bottom"]} className="bg-[#0f1626] rounded-t-[28px] px-6 pt-6 pb-10">
          {/* Handle */}
          <View className="w-10 h-1 rounded-full bg-[#2a3245] self-center mb-6" />

          {/* Header */}
          <View className="flex-row items-center gap-3 mb-6">
            <View className="w-10 h-10 rounded-2xl bg-[#ff923e]/15 items-center justify-center">
              <MaterialIcons name="account-balance" size={20} color="#ff923e" />
            </View>
            <View>
              <Text className="text-[#e0e5f9] text-lg font-bold">Bank Details</Text>
              <Text className="text-[#a5abbd] text-xs mt-0.5">Used for payout when trips complete</Text>
            </View>
          </View>

          {/* Account number */}
          <Text className="text-[#a5abbd] text-[11px] tracking-widest mb-2">ACCOUNT NUMBER</Text>
          <View className="flex-row items-center bg-[#121a2b] rounded-2xl px-4 py-4 gap-3 mb-4 border border-[#ff923e]/20">
            <MaterialIcons name="dialpad" size={18} color="#a5abbd" />
            <TextInput
              value={accountNumber}
              onChangeText={(t) => setAccountNumber(t.replace(/[^0-9]/g, "").slice(0, 10))}
              placeholder="10-digit account number"
              placeholderTextColor="#4a5568"
              keyboardType="number-pad"
              maxLength={10}
              className="flex-1 text-[#e0e5f9] text-base"
            />
          </View>

          {/* Bank picker */}
          <Text className="text-[#a5abbd] text-[11px] tracking-widest mb-2">BANK</Text>
          <TouchableOpacity
            onPress={() => setShowPicker(true)}
            className="flex-row items-center justify-between bg-[#121a2b] rounded-2xl px-4 py-4 mb-6 border border-[#ff923e]/20"
          >
            <View className="flex-row items-center gap-3">
              <MaterialIcons name="account-balance" size={18} color="#a5abbd" />
              <Text className={selectedBank ? "text-[#e0e5f9] text-base" : "text-[#4a5568] text-base"}>
                {selectedBank ? selectedBank.name : "Select your bank"}
              </Text>
            </View>
            <MaterialIcons name="expand-more" size={20} color="#a5abbd" />
          </TouchableOpacity>

          {/* Save button */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={loading || !isReady}
            className="py-4 rounded-full items-center justify-center flex-row gap-2"
            style={{ backgroundColor: isReady ? "#ff923e" : "rgba(255,146,62,0.25)" }}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <MaterialIcons name="check-circle" size={18} color="#000" />
                <Text className="text-black font-bold text-[15px]">SAVE BANK DETAILS</Text>
              </>
            )}
          </TouchableOpacity>
        </SafeAreaView>
      </MyKeyboardAvoidingWrapper>

      {/* Bank picker sheet */}
      <Modal visible={showPicker} transparent animationType="slide" onRequestClose={() => setShowPicker(false)}>
        <Pressable className="flex-1 bg-black/80" onPress={() => setShowPicker(false)} />
        <SafeAreaView edges={["bottom"]} className="bg-[#0f1626] rounded-t-[28px] px-4 pt-4 pb-6" style={{ maxHeight: "70%" }}>
          <View className="w-10 h-1 rounded-full bg-[#2a3245] self-center mb-4" />
          <Text className="text-[#e0e5f9] text-base font-bold mb-4 px-2">Select Bank</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {NIGERIAN_BANKS.map((bank) => (
              <TouchableOpacity
                key={bank.code}
                onPress={() => { setBankCode(bank.code); setShowPicker(false); }}
                className="flex-row items-center justify-between px-2 py-3.5 border-b border-[#1e2a40]"
              >
                <Text className="text-[#e0e5f9] text-sm">{bank.name}</Text>
                {bankCode === bank.code && (
                  <MaterialIcons name="check-circle" size={18} color="#ff923e" />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </Modal>
  );
}
