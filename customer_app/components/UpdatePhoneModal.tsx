import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Animated,
  Keyboard,
} from "react-native";
import { useState, useRef, useEffect } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { MyKeyboardAvoidingWrapper } from "./MyKeyboardAvoidingWrapper";

export function UpdatePhoneModal({ visible, onClose }) {
  const [newPhone, setNewPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);

  const [behaviour, setBehaviour] = useState<"padding" | undefined>("padding");

  useEffect(() => {
    const showListener = Keyboard.addListener("keyboardDidShow", () => {
      setBehaviour("padding");
    });
    const hideListener = Keyboard.addListener("keyboardDidHide", () => {
      setBehaviour(undefined);
    });

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  const otpHeight = useRef(new Animated.Value(0)).current;
  const otpOpacity = useRef(new Animated.Value(0)).current;

  const handleClose = () => {
    setNewPhone("");
    setOtp("");
    setStep("phone");
    otpHeight.setValue(0);
    otpOpacity.setValue(0);
    onClose();
  };

  const handleNext = async () => {
    if (!newPhone) return;
    try {
      setLoading(true);
      // TODO: trigger OTP send to newPhone
      await new Promise((r) => setTimeout(r, 600));
      setStep("otp");
      Animated.parallel([
        Animated.spring(otpHeight, {
          toValue: 1,
          useNativeDriver: false,
          tension: 60,
          friction: 10,
        }),
        Animated.timing(otpOpacity, {
          toValue: 1,
          duration: 350,
          useNativeDriver: false,
        }),
      ]).start();
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!otp || otp.length < 4) return;
    try {
      setLoading(true);
      // TODO: verify OTP and update phone
      await new Promise((r) => setTimeout(r, 600));
      handleClose();
    } finally {
      setLoading(false);
    }
  };

  const goBackToPhone = () => {
    setStep("phone");
    Animated.parallel([
      Animated.timing(otpHeight, {
        toValue: 0,
        duration: 250,
        useNativeDriver: false,
      }),
      Animated.timing(otpOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: false,
      }),
    ]).start();
  };

  // Animated values must stay in style — NativeWind can't handle runtime Animated nodes
  const otpBoxHeight = otpHeight.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 130],
  });

  const isCtaActive = step === "phone" ? !!newPhone : otp.length >= 4;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={handleClose}
    >
      <MyKeyboardAvoidingWrapper>
        <Pressable className="flex-1 bg-black/90" onPress={handleClose} />

        <SafeAreaView
          edges={["top", "bottom"]}
          className="bg-[#0f1626] rounded-t-[28px] px-6 pt-6 pb-10"
        >
          {/* Handle bar */}
          <View className="w-10 h-1 rounded-full bg-[#2a3245] self-center mb-6" />

          {/* Header */}
          <View className="flex-row items-center gap-3 mb-6">
            <View className="w-10 h-10 rounded-2xl bg-[#ff923e]/15 items-center justify-center">
              <MaterialIcons name="phone-android" size={20} color="#ff923e" />
            </View>
            <View>
              <Text className="text-[#e0e5f9] text-lg font-bold">
                Update Phone Number
              </Text>
              <Text className="text-[#a5abbd] text-xs mt-0.5">
                {step === "phone"
                  ? "Enter your new phone number below"
                  : "Check your messages for the OTP"}
              </Text>
            </View>
          </View>

          {/* Phone input label */}
          <Text className="text-[#a5abbd] text-[11px] tracking-widest mb-2">
            NEW PHONE NUMBER
          </Text>

          {/* Phone input row — border is conditional so keep borderWidth/Color in style */}
          <View
            className="flex-row items-center bg-[#121a2b] rounded-2xl px-4 py-4 gap-3"
            style={{
              borderWidth: step === "otp" ? 1 : 0,
              borderColor: "#ff923e40",
            }}
          >
            <MaterialIcons name="phone" size={18} color="#a5abbd" />
            <TextInput
              value={newPhone}
              onChangeText={setNewPhone}
              placeholder="e.g. 08012345678"
              placeholderTextColor="#4a5568"
              keyboardType="phone-pad"
              editable={step === "phone"}
              className={`flex-1 text-base ${step === "otp" ? "text-[#a5abbd]" : "text-[#e0e5f9]"}`}
            />
            {step === "otp" && (
              <TouchableOpacity onPress={goBackToPhone}>
                <MaterialIcons name="edit" size={16} color="#ff923e" />
              </TouchableOpacity>
            )}
          </View>

          {/* OTP box — height/opacity are Animated so must stay in style */}
          <Animated.View
            style={{
              height: otpBoxHeight,
              opacity: otpOpacity,
              overflow: "hidden",
            }}
          >
            <View className="mt-4">
              {/* OTP label */}
              <View className="flex-row items-center gap-2 mb-2">
                <MaterialIcons
                  name="mark-email-unread"
                  size={14}
                  color="#ff923e"
                />
                <Text className="text-[#a5abbd] text-[11px] tracking-widest">
                  OTP CODE
                </Text>
              </View>

              {/* OTP input */}
              <View className="flex-row items-center bg-[#121a2b] rounded-2xl px-4 py-4 gap-3 border border-[#ff923e]/20">
                <MaterialIcons name="dialpad" size={18} color="#a5abbd" />
                <TextInput
                  value={otp}
                  onChangeText={(t) => setOtp(t.replace(/[^0-9]/g, ""))}
                  placeholder="Enter 6-digit OTP"
                  placeholderTextColor="#4a5568"
                  keyboardType="number-pad"
                  maxLength={6}
                  className="flex-1 text-[#e0e5f9] text-xl tracking-[8px]"
                />
              </View>

              <TouchableOpacity className="mt-2 self-end">
                <Text className="text-[#ff923e] text-xs">Resend OTP</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* CTA — background color is dynamic so keep in style */}
          <TouchableOpacity
            onPress={step === "phone" ? handleNext : handleVerify}
            disabled={loading || !isCtaActive}
            className="mt-6 py-4 rounded-full items-center justify-center flex-row gap-2"
            style={{
              backgroundColor: isCtaActive
                ? "#ff923e"
                : "rgba(255,146,62,0.25)",
            }}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <MaterialIcons
                  name={step === "phone" ? "arrow-forward" : "check-circle"}
                  size={18}
                  color="#000"
                />
                <Text className="text-black font-bold text-[15px]">
                  {step === "phone" ? "NEXT" : "VERIFY & SAVE"}
                </Text>
              </>
            )}
          </TouchableOpacity>
        </SafeAreaView>
      </MyKeyboardAvoidingWrapper>
    </Modal>
  );
}
