import { Ionicons } from "@expo/vector-icons";
import { CameraType, CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useRef, useState } from "react";
import { Image, Modal, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Chat photos don't need full resolution
const PHOTO_QUALITY = 0.5;

// Takes a photo (or picks one from the gallery) for the chat and hands back
// the local file once the user taps Send; the chat screen uploads it.
export default function ChatCameraModal({
  visible,
  onClose,
  onSend,
}: {
  visible: boolean;
  onClose: () => void;
  onSend: (uri: string) => void;
}) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>("back");
  const [ready, setReady] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    if (!visible) return;
    setPhotoUri(null);
    setReady(false);
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [visible]);

  const capture = async () => {
    if (!ready || capturing || !cameraRef.current) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: PHOTO_QUALITY,
      });
      if (photo?.uri) setPhotoUri(photo.uri);
    } catch (err) {
      console.error("❌ Couldn't take photo:", err);
    } finally {
      setCapturing(false);
    }
  };

  // The system picker needs no permission on current iOS/Android
  const pickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: PHOTO_QUALITY,
      });
      if (!result.canceled && result.assets[0]?.uri) {
        setPhotoUri(result.assets[0].uri);
      }
    } catch (err) {
      console.error("❌ Couldn't pick photo:", err);
    }
  };

  const send = () => {
    if (!photoUri) return;
    onSend(photoUri);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-black">
        {/* A gallery pick still gets a preview without camera access */}
        {!permission?.granted && !photoUri ? (
          <SafeAreaView className="flex-1 items-center justify-center px-8">
            <Ionicons name="camera-outline" size={64} color="white" />
            <Text className="text-white text-xl font-semibold mt-4 text-center">
              Camera access needed
            </Text>
            <Text className="text-gray-400 text-center mt-2 mb-6">
              Allow camera access to send photos of the package.
            </Text>
            <TouchableOpacity
              onPress={requestPermission}
              className="bg-[#EE7F3A] px-6 py-3 rounded-full"
            >
              <Text className="text-white font-semibold">Allow camera</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={pickFromGallery}
              className="mt-3 px-6 py-3 rounded-full border border-gray-600 flex-row items-center gap-2"
            >
              <Ionicons name="images-outline" size={18} color="white" />
              <Text className="text-white font-semibold">Choose from gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} className="mt-2 px-6 py-3">
              <Text className="text-gray-400">Cancel</Text>
            </TouchableOpacity>
          </SafeAreaView>
        ) : photoUri ? (
          // Preview
          <>
            <Image
              source={{ uri: photoUri }}
              style={{ flex: 1 }}
              resizeMode="contain"
            />
            <SafeAreaView
              edges={["bottom"]}
              className="absolute bottom-0 left-0 right-0 flex-row justify-between px-6 pb-4"
            >
              <TouchableOpacity
                onPress={() => setPhotoUri(null)}
                className="h-12 px-6 rounded-full bg-[#2C2C30] flex-row items-center gap-2"
              >
                <Ionicons name="refresh" size={20} color="white" />
                <Text className="text-white font-semibold">Retake</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={send}
                className="h-12 px-6 rounded-full bg-[#EE7F3A] flex-row items-center gap-2"
              >
                <Text className="text-white font-semibold">Send</Text>
                <Ionicons name="send" size={18} color="white" />
              </TouchableOpacity>
            </SafeAreaView>
          </>
        ) : (
          // Camera
          <>
            <CameraView
              ref={cameraRef}
              style={{ flex: 1 }}
              facing={facing}
              mode="picture"
              onCameraReady={() => setReady(true)}
            />
            <SafeAreaView
              edges={["top"]}
              className="absolute top-0 left-0 px-5 pt-2"
            >
              <TouchableOpacity
                onPress={onClose}
                className="bg-[#2C2C30] p-3 rounded-full"
              >
                <Ionicons name="close" size={26} color="white" />
              </TouchableOpacity>
            </SafeAreaView>
            <SafeAreaView
              edges={["bottom"]}
              className="absolute bottom-0 left-0 right-0 flex-row justify-around items-center pb-6"
            >
              <TouchableOpacity
                onPress={pickFromGallery}
                className="bg-[#2C2C30] p-3 rounded-full"
              >
                <Ionicons name="images" size={26} color="white" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={capture}
                disabled={!ready || capturing}
                className={`w-20 h-20 rounded-full border-4 border-white justify-center items-center ${
                  ready ? "" : "opacity-50"
                }`}
              >
                <View className="w-16 h-16 rounded-full bg-white" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  setFacing((f) => (f === "back" ? "front" : "back"))
                }
                className="bg-[#2C2C30] p-3 rounded-full"
              >
                <Ionicons name="camera-reverse" size={26} color="white" />
              </TouchableOpacity>
            </SafeAreaView>
          </>
        )}
      </View>
    </Modal>
  );
}
