import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Pressable,
} from "react-native";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { MyKeyboardAvoidingWrapper } from "./MyKeyboardAvoidingWrapper";
import { updateUserPassword } from "@/lib/supabase-app-functions"; // adjust path

export function UpdatePasswordModal({ visible, onClose, onForgotPassword }) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const passwordsMatch = newPassword === confirmPassword;
  const canSubmit =
    !loading &&
    !!currentPassword &&
    !!newPassword &&
    !!confirmPassword &&
    passwordsMatch;

  const handleClose = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    setError("");
    setSuccess(false);
    onClose();
  };

  const handleSave = async () => {
    if (!canSubmit) return;
    try {
      setLoading(true);
      setError("");
      setSuccess(false);

      await updateUserPassword(currentPassword, newPassword);

      setSuccess(true);
      setTimeout(() => handleClose(), 1500); // close after showing success
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = () => {
    handleClose();
    onForgotPassword?.();
  };

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
              <MaterialIcons name="lock-reset" size={20} color="#ff923e" />
            </View>
            <View>
              <Text className="text-[#e0e5f9] text-lg font-bold">
                Change Password
              </Text>
              <Text className="text-[#a5abbd] text-xs mt-0.5">
                Keep your account secure
              </Text>
            </View>
          </View>

          {/* Current Password */}
          <PasswordField
            label="CURRENT PASSWORD"
            icon="lock-outline"
            placeholder="Enter current password"
            value={currentPassword}
            onChangeText={(v) => {
              setCurrentPassword(v);
              setError("");
            }}
            show={showCurrent}
            onToggleShow={() => setShowCurrent(!showCurrent)}
          />

          {/* Forgot password */}
          <TouchableOpacity
            onPress={handleForgotPassword}
            className="self-end mt-1.5 mb-1"
            hitSlop={{ top: 6, bottom: 6, left: 12, right: 4 }}
          >
            <Text className="text-[#ff923e] text-xs font-medium">
              Forgot password?
            </Text>
          </TouchableOpacity>

          <View className="h-2" />

          {/* New Password */}
          <PasswordField
            label="NEW PASSWORD"
            icon="lock-open"
            placeholder="Enter new password"
            value={newPassword}
            onChangeText={(v) => {
              setNewPassword(v);
              setError("");
            }}
            show={showNew}
            onToggleShow={() => setShowNew(!showNew)}
          />

          <View className="h-3" />

          {/* Confirm Password */}
          <PasswordField
            label="CONFIRM PASSWORD"
            icon="verified-user"
            placeholder="Re-enter new password"
            value={confirmPassword}
            onChangeText={(v) => {
              setConfirmPassword(v);
              setError("");
            }}
            show={showConfirm}
            onToggleShow={() => setShowConfirm(!showConfirm)}
            hasError={!!confirmPassword && !passwordsMatch}
          />

          {/* Passwords don't match error */}
          {!!confirmPassword && !passwordsMatch && (
            <View className="flex-row items-center gap-1 mt-1.5">
              <MaterialIcons name="error-outline" size={13} color="#ef4444" />
              <Text className="text-red-500 text-xs">
                Passwords do not match
              </Text>
            </View>
          )}

          {/* API error */}
          {!!error && (
            <View className="flex-row items-center gap-1 mt-3 bg-red-500/10 px-3 py-2.5 rounded-xl">
              <MaterialIcons name="error-outline" size={14} color="#ef4444" />
              <Text className="text-red-500 text-xs flex-1">{error}</Text>
            </View>
          )}

          {/* Success message */}
          {success && (
            <View className="flex-row items-center gap-1 mt-3 bg-green-500/10 px-3 py-2.5 rounded-xl">
              <MaterialIcons name="check-circle" size={14} color="#22c55e" />
              <Text className="text-green-500 text-xs flex-1">
                Password updated successfully!
              </Text>
            </View>
          )}

          {/* CTA */}
          <TouchableOpacity
            onPress={handleSave}
            disabled={!canSubmit}
            className="mt-6 py-4 rounded-full items-center justify-center flex-row gap-2"
            style={{
              backgroundColor: canSubmit ? "#ff923e" : "rgba(255,146,62,0.25)",
            }}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <>
                <MaterialIcons name="check-circle" size={18} color="#000" />
                <Text className="text-black font-bold text-[15px]">
                  UPDATE PASSWORD
                </Text>
              </>
            )}
          </TouchableOpacity>
        </SafeAreaView>
      </MyKeyboardAvoidingWrapper>
    </Modal>
  );
}

function PasswordField({
  label,
  icon,
  placeholder,
  value,
  onChangeText,
  show,
  onToggleShow,
  hasError = false,
}) {
  return (
    <>
      <Text className="text-[#a5abbd] text-[11px] tracking-widest mb-2">
        {label}
      </Text>
      <View
        className="flex-row items-center bg-[#121a2b] rounded-2xl px-4 py-4 gap-3"
        style={{ borderWidth: hasError ? 1 : 0, borderColor: "#ef4444" }}
      >
        <MaterialIcons name={icon} size={18} color="#a5abbd" />
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#4a5568"
          secureTextEntry={!show}
          className="flex-1 text-[#e0e5f9] text-base"
        />
        <TouchableOpacity onPress={onToggleShow}>
          <MaterialIcons
            name={show ? "visibility-off" : "visibility"}
            size={18}
            color="#a5abbd"
          />
        </TouchableOpacity>
      </View>
    </>
  );
}
