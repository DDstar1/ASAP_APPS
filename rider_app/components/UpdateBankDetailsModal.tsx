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
import { useEffect, useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { MyKeyboardAvoidingWrapper } from "./MyKeyboardAvoidingWrapper";
import { updateBankDetails } from "@/lib/supabase-app-functions";
import { getBanks, type Bank } from "@/lib/banks";

interface Props {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function UpdateBankDetailsModal({ visible, onClose, onSaved }: Props) {
  const [accountNumber, setAccountNumber] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [showPicker, setShowPicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [banksState, setBanksState] = useState<"loading" | "ready" | "error">("loading");
  const [search, setSearch] = useState("");

  const loadBanks = () => {
    setBanksState("loading");
    getBanks()
      .then((list) => { setBanks(list); setBanksState("ready"); })
      .catch((err) => { console.error("❌ Couldn't load banks:", err); setBanksState("error"); });
  };

  useEffect(() => {
    if (visible && banks.length === 0) loadBanks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const selectedBank = banks.find((b) => b.code === bankCode);
  const query = search.trim().toLowerCase();
  const filteredBanks = query ? banks.filter((b) => b.name.toLowerCase().includes(query)) : banks;

  const closePicker = () => {
    setShowPicker(false);
    setSearch("");
  };

  const handleClose = () => {
    setAccountNumber("");
    setBankCode("");
    closePicker();
    onClose();
  };

  const handleSave = async () => {
    if (!accountNumber || !bankCode) return;
    setLoading(true);
    const result = await updateBankDetails(accountNumber, bankCode);
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
            onPress={() => (banksState === "error" ? loadBanks() : setShowPicker(true))}
            disabled={banksState === "loading"}
            className="flex-row items-center justify-between bg-[#121a2b] rounded-2xl px-4 py-4 mb-6 border border-[#ff923e]/20"
          >
            <View className="flex-row items-center gap-3 flex-1">
              <MaterialIcons name="account-balance" size={18} color="#a5abbd" />
              <Text
                numberOfLines={1}
                className={selectedBank ? "text-[#e0e5f9] text-base flex-1" : "text-[#4a5568] text-base flex-1"}
              >
                {selectedBank
                  ? selectedBank.name
                  : banksState === "loading"
                    ? "Loading banks..."
                    : banksState === "error"
                      ? "Couldn't load banks. Tap to retry"
                      : "Select your bank"}
              </Text>
            </View>
            {banksState === "loading" ? (
              <ActivityIndicator size="small" color="#a5abbd" />
            ) : (
              <MaterialIcons name={banksState === "error" ? "refresh" : "expand-more"} size={20} color="#a5abbd" />
            )}
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
      <Modal visible={showPicker} transparent animationType="slide" onRequestClose={closePicker}>
        <MyKeyboardAvoidingWrapper>
        <Pressable className="flex-1 bg-black/80" onPress={closePicker} />
        <SafeAreaView edges={["bottom"]} className="bg-[#0f1626] rounded-t-[28px] px-4 pt-4 pb-6" style={{ maxHeight: "70%" }}>
          <View className="w-10 h-1 rounded-full bg-[#2a3245] self-center mb-4" />
          <Text className="text-[#e0e5f9] text-base font-bold mb-3 px-2">Select Bank</Text>
          {/* The full list runs to hundreds of banks */}
          <View className="flex-row items-center bg-[#121a2b] rounded-2xl px-4 py-3 gap-3 mb-3 mx-1">
            <MaterialIcons name="search" size={18} color="#a5abbd" />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Search banks"
              placeholderTextColor="#4a5568"
              autoCorrect={false}
              className="flex-1 text-[#e0e5f9] text-base"
            />
          </View>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {filteredBanks.length === 0 && (
              <Text className="text-[#a5abbd] text-sm px-2 py-4">No bank matches “{search.trim()}”</Text>
            )}
            {filteredBanks.map((bank) => (
              <TouchableOpacity
                key={bank.code}
                onPress={() => { setBankCode(bank.code); closePicker(); }}
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
        </MyKeyboardAvoidingWrapper>
      </Modal>
    </Modal>
  );
}
