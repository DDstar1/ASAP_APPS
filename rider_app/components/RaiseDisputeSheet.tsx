import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import CameraModal from "@/components/CameraModal";
import {
  PackageIssueReason,
  reportPackageIssue,
  uploadDisputePhoto,
} from "@/lib/supabase-app-functions";

const REASONS: { value: PackageIssueReason; label: string; hint: string }[] = [
  { value: "weight_exceeded", label: "Too heavy", hint: "Heavier than the order says" },
  { value: "dimensions_exceeded", label: "Too big", hint: "Won't fit or bigger than the order says" },
  { value: "prohibited_contents", label: "Prohibited item", hint: "Something ASAP doesn't carry" },
  { value: "package_not_found", label: "No package", hint: "Nothing to collect at the pickup" },
  { value: "wrong_location", label: "Wrong location", hint: "The pickup address is wrong" },
];

// apiPost throws "API <status>: <body>"; Rust's error bodies are { error }
function rustMessage(err: any) {
  const match = /^API \d{3}: (.*)$/s.exec(err?.message ?? "");
  try {
    return match ? JSON.parse(match[1]).error ?? null : null;
  } catch {
    return null;
  }
}

type Props = {
  visible: boolean;
  orderRef: string;
  onClose: () => void;
  onReported: () => void;
};

export default function RaiseDisputeSheet({ visible, orderRef, onClose, onReported }: Props) {
  const [reason, setReason] = useState<PackageIssueReason | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [cameraOpen, setCameraOpen] = useState(false);
  const [sending, setSending] = useState(false);

  const reset = () => {
    setReason(null);
    setPhotoUri(null);
    setNote("");
  };

  const close = () => {
    if (sending) return;
    reset();
    onClose();
  };

  const confirmAndSubmit = () => {
    if (!reason) return Alert.alert("Choose a reason", "Tell us what's wrong with the package.");
    if (!photoUri) return Alert.alert("Photo needed", "Take a photo of the package or the pickup.");
    const label = REASONS.find((r) => r.value === reason)?.label ?? reason;
    Alert.alert(
      "Refuse this package?",
      `Reason: ${label}.\n\nThe order will be cancelled now and can't be undone. A false report can lead to a penalty.`,
      [
        { text: "Go back", style: "cancel" },
        { text: "Refuse & cancel", style: "destructive", onPress: submit },
      ],
    );
  };

  const submit = async () => {
    if (!reason || !photoUri) return;
    setSending(true);
    try {
      const photoUrl = await uploadDisputePhoto(orderRef, photoUri);
      await reportPackageIssue(orderRef, reason, photoUrl, note.trim() || null);
      reset();
      onReported();
    } catch (err: any) {
      console.error("Package dispute failed:", err);
      Alert.alert(
        "Report Not Sent",
        rustMessage(err) ?? "We couldn't send your report. Check your connection and try again.",
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
      <Pressable className="flex-1 bg-black/60" onPress={close} />
      <View className="bg-[#212126] rounded-t-3xl max-h-[88%]">
        <ScrollView
          contentContainerStyle={{ padding: 20, paddingBottom: 36 }}
          keyboardShouldPersistTaps="handled"
        >
          <View className="w-10 h-1 rounded-full bg-white/20 self-center mb-4" />
          <Text className="text-white text-lg font-bold mb-1">Problem with this package?</Text>
          <Text className="text-gray-400 text-sm leading-relaxed mb-5">
            Refusing cancels the order now. ASAP reviews your photo: if you were right you earn 20% of the
            charge; a false report can lead to a penalty.
          </Text>

          <Text className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-2.5">Reason</Text>
          {REASONS.map(({ value, label, hint }) => {
            const selected = reason === value;
            return (
              <TouchableOpacity
                key={value}
                onPress={() => setReason(value)}
                accessibilityRole="radio"
                accessibilityState={{ selected }}
                className={`flex-row items-center p-3.5 rounded-2xl mb-2 border ${
                  selected ? "bg-[#EE7F3A]/15 border-[#EE7F3A]" : "bg-[#3C3C43] border-transparent"
                }`}
              >
                <View
                  className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${
                    selected ? "border-[#EE7F3A]" : "border-gray-500"
                  }`}
                >
                  {selected && <View className="w-2.5 h-2.5 rounded-full bg-[#EE7F3A]" />}
                </View>
                <View className="flex-1">
                  <Text className="text-white text-sm font-semibold">{label}</Text>
                  <Text className="text-gray-400 text-xs mt-0.5">{hint}</Text>
                </View>
              </TouchableOpacity>
            );
          })}

          <Text className="text-xs font-semibold text-gray-400 tracking-widest uppercase mt-3 mb-2.5">Photo</Text>
          {photoUri ? (
            <View className="mb-4">
              <Image source={{ uri: photoUri }} className="w-full h-48 rounded-2xl" resizeMode="cover" />
              <TouchableOpacity onPress={() => setCameraOpen(true)} className="mt-2 self-start">
                <Text className="text-[#EE7F3A] text-sm font-semibold">Retake photo</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={() => setCameraOpen(true)}
              className="flex-row items-center justify-center gap-2 h-28 rounded-2xl border border-dashed border-gray-500 mb-4"
            >
              <MaterialIcons name="photo-camera" size={22} color="#9CA3AF" />
              <Text className="text-gray-400 text-sm font-semibold">Take a photo</Text>
            </TouchableOpacity>
          )}

          <Text className="text-xs font-semibold text-gray-400 tracking-widest uppercase mb-2.5">
            Note (optional)
          </Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder="Anything the reviewer should know"
            placeholderTextColor="#6B7280"
            multiline
            className="bg-[#3C3C43] rounded-2xl p-3.5 text-white text-sm min-h-[80px] mb-5"
            style={{ textAlignVertical: "top" }}
          />

          <TouchableOpacity
            onPress={confirmAndSubmit}
            disabled={sending}
            className="h-14 rounded-full bg-[#EE7F3A] items-center justify-center mb-3"
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-bold text-sm">REFUSE PACKAGE & CANCEL ORDER</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={close} disabled={sending} className="h-12 items-center justify-center">
            <Text className="text-gray-400 font-semibold text-sm">Never mind</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <CameraModal
        visible={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onConfirm={(uri) => {
          setPhotoUri(uri);
          setCameraOpen(false);
        }}
      />
    </Modal>
  );
}
