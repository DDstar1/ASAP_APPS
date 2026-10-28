import { MyKeyboardAvoidingWrapper } from "@/components/MyKeyboardAvoidingWrapper";
import { getBanks, type Bank } from "@/lib/banks";
import { updateBankDetails } from "@/lib/supabase-app-functions";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ORANGE = "#FF7518";

// Where trip earnings are paid. The bank list comes from Rust (Korapay's codes).
export default function PayoutScreen() {
  const [accountNumber, setAccountNumber] = useState("");
  const [bankCode, setBankCode] = useState("");
  const [banks, setBanks] = useState<Bank[]>([]);
  const [banksState, setBanksState] = useState<"loading" | "ready" | "error">("loading");
  const [showPicker, setShowPicker] = useState(false);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const loadBanks = () => {
    setBanksState("loading");
    getBanks()
      .then((list) => { setBanks(list); setBanksState("ready"); })
      .catch(() => setBanksState("error"));
  };

  useEffect(loadBanks, []);

  const selectedBank = banks.find((b) => b.code === bankCode);
  const query = search.trim().toLowerCase();
  const filteredBanks = query ? banks.filter((b) => b.name.toLowerCase().includes(query)) : banks;
  const isReady = accountNumber.length === 10 && !!bankCode && !saving;

  const closePicker = () => {
    setShowPicker(false);
    setSearch("");
  };

  const save = async () => {
    if (!isReady) return;
    setSaving(true);
    setNotice(null);
    const result = await updateBankDetails(accountNumber, bankCode);
    setSaving(false);
    setNotice(
      result.success
        ? { tone: "ok", text: "Your payout account is saved. Future earnings will be paid there." }
        : { tone: "error", text: result.error ?? "Couldn't save your bank details. Please try again." },
    );
  };

  return (
    <SafeAreaView edges={["top", "bottom"]} className="flex-1 bg-black">
      <MyKeyboardAvoidingWrapper style={{ justifyContent: "flex-start" }}>
        <View className="flex-row items-center px-4 py-3">
          <TouchableOpacity
            onPress={() => router.back()}
            accessibilityRole="button"
            accessibilityLabel="Back"
            className="w-11 h-11 rounded-full bg-[#2C2C30] justify-center items-center"
          >
            <Ionicons name="chevron-back" size={22} color="white" />
          </TouchableOpacity>
          <Text className="flex-1 text-center text-white text-xl font-bold mr-11">
            Payout account
          </Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View className="flex-row items-center gap-3 mb-8">
            <View className="w-11 h-11 rounded-2xl bg-[#FF7518]/15 items-center justify-center">
              <MaterialIcons name="account-balance" size={22} color={ORANGE} />
            </View>
            <View className="flex-1">
              <Text className="text-white text-lg font-bold">Bank details</Text>
              <Text className="text-gray-400 text-xs mt-0.5">Your earnings are paid here when trips complete</Text>
            </View>
          </View>

          <Text className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-2">Account number</Text>
          <View className="flex-row items-center gap-3 bg-[#1C1C21] rounded-2xl px-4 h-14 mb-5">
            <MaterialIcons name="dialpad" size={18} color="#9CA3AF" />
            <TextInput
              value={accountNumber}
              onChangeText={(t) => { setAccountNumber(t.replace(/[^0-9]/g, "").slice(0, 10)); setNotice(null); }}
              placeholder="10-digit account number"
              placeholderTextColor="#6B7280"
              keyboardType="number-pad"
              maxLength={10}
              className="flex-1 text-white text-base"
            />
          </View>

          <Text className="text-gray-400 text-xs font-semibold uppercase tracking-widest mb-2">Bank</Text>
          <TouchableOpacity
            onPress={() => (banksState === "error" ? loadBanks() : setShowPicker(true))}
            disabled={banksState === "loading"}
            accessibilityRole="button"
            className="flex-row items-center gap-3 bg-[#1C1C21] rounded-2xl px-4 h-14"
          >
            <MaterialIcons name="account-balance" size={18} color="#9CA3AF" />
            <Text numberOfLines={1} className={`flex-1 text-base ${selectedBank ? "text-white" : "text-gray-500"}`}>
              {selectedBank
                ? selectedBank.name
                : banksState === "loading"
                  ? "Loading banks…"
                  : banksState === "error"
                    ? "Couldn't load banks. Tap to retry"
                    : "Select your bank"}
            </Text>
            {banksState === "loading" ? (
              <ActivityIndicator size="small" color="#9CA3AF" />
            ) : (
              <MaterialIcons name={banksState === "error" ? "refresh" : "expand-more"} size={20} color="#9CA3AF" />
            )}
          </TouchableOpacity>

          {notice && (
            <View className={`flex-row items-start gap-2 rounded-2xl px-4 py-3 mt-6 ${
              notice.tone === "ok" ? "bg-green-500/10" : "bg-red-500/10"}`}>
              <MaterialIcons
                name={notice.tone === "ok" ? "check-circle" : "error-outline"}
                size={16}
                color={notice.tone === "ok" ? "#22c55e" : "#ef4444"}
              />
              <Text className={`flex-1 text-sm ${notice.tone === "ok" ? "text-green-400" : "text-red-400"}`}>
                {notice.text}
              </Text>
            </View>
          )}

          <TouchableOpacity
            onPress={save}
            disabled={!isReady}
            accessibilityRole="button"
            className="h-14 rounded-full justify-center items-center mt-8"
            style={{ backgroundColor: isReady ? ORANGE : "rgba(255,117,24,0.3)" }}
          >
            {saving ? <ActivityIndicator color="white" /> : (
              <Text className="text-white text-base font-bold">Save bank details</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </MyKeyboardAvoidingWrapper>

      {/* Bank picker: a sheet, since it's a choice within this screen */}
      <Modal visible={showPicker} transparent animationType="slide" onRequestClose={closePicker}>
        <MyKeyboardAvoidingWrapper>
          <Pressable className="flex-1 bg-black/80" onPress={closePicker} />
          <SafeAreaView edges={["bottom"]} className="bg-[#1C1C21] rounded-t-[28px] px-4 pt-4 pb-6" style={{ maxHeight: "75%" }}>
            <View className="w-10 h-1 rounded-full bg-[#3C3C43] self-center mb-4" />
            <Text className="text-white text-base font-bold mb-3 px-2">Select bank</Text>
            <View className="flex-row items-center bg-[#2C2C30] rounded-2xl px-4 h-12 gap-3 mb-3 mx-1">
              <MaterialIcons name="search" size={18} color="#9CA3AF" />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search banks"
                placeholderTextColor="#6B7280"
                autoCorrect={false}
                className="flex-1 text-white text-base"
              />
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {filteredBanks.length === 0 && (
                <Text className="text-gray-400 text-sm px-2 py-4">No bank matches “{search.trim()}”</Text>
              )}
              {filteredBanks.map((bank) => (
                <TouchableOpacity
                  key={bank.code}
                  onPress={() => { setBankCode(bank.code); setNotice(null); closePicker(); }}
                  className="flex-row items-center justify-between px-2 py-3.5 border-b border-white/10"
                >
                  <Text className="text-white text-sm flex-1">{bank.name}</Text>
                  {bankCode === bank.code && <MaterialIcons name="check-circle" size={18} color={ORANGE} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </SafeAreaView>
        </MyKeyboardAvoidingWrapper>
      </Modal>
    </SafeAreaView>
  );
}
