import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CameraType, CameraView, useCameraPermissions } from "expo-camera";
import { Directory, File, Paths } from "expo-file-system";
import React, { useEffect, useRef, useState } from "react";
import { Alert, Modal, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {uploadDeliveryImage} from "@/lib/supabase-functions"

export default function CameraModal({
  visible,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (uri: string) => void;
}) {
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const [isReady, setIsReady] = useState(false);
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    if (visible && !permission?.granted) {
      requestPermission();
    }
  }, [visible, permission]);

  const onCameraReady = () => {
    console.log("📹 Camera is ready");
    setIsReady(true);
  };

  if (!permission) return null;

  if (!permission.granted) {
    return (
      <Modal
        animationType="slide"
        transparent={false}
        visible={visible}
        onRequestClose={onClose}
      >
        <View className="flex-1 items-center justify-center bg-black">
          <View className="items-center p-6">
            <Ionicons name="camera" size={64} color="white" className="mb-4" />
            <Text className="text-white text-xl font-semibold mb-2 text-center">
              Camera Permission Required
            </Text>
            <Text className="text-gray-300 text-center mb-6">
              We need access to your camera to take package photos
            </Text>
            <TouchableOpacity
              className="bg-orange-500 px-6 py-3 rounded-full"
              onPress={requestPermission}
            >
              <Text className="text-white font-semibold">Grant Permission</Text>
            </TouchableOpacity>
            <TouchableOpacity className="mt-4 px-6 py-3" onPress={onClose}>
              <Text className="text-gray-400">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  const takePicture = async () => {
    if (!isReady) {
      Alert.alert(
        "Camera not ready",
        "Please wait for the camera to initialize"
      );
      return;
    }

    if (!cameraRef.current) return;

    try {
        // Take the picture
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
        skipProcessing: false,
      });
      console.log("📸 Picture taken:", photo.uri);

      // Define app folder using the new Directory API
      const appFolder = new Directory(Paths.document, "MyAppName");

      // Ensure the folder exists
      if (!appFolder.exists) {
        appFolder.create();
      }

      // Move file into app folder
      const filename = photo.uri.split("/").pop() || `photo_${Date.now()}.jpg`;
      const newFile = new File(appFolder, filename);

      const imageBlob = await fetch(newFile.uri).then(res => res.blob());
      const { publicUrl } = await uploadDeliveryImage(imageBlob, "deliveries");
      console.log("🌐 Uploaded to Supabase:", publicUrl);

      // Move the file using the File class
      const tempFile = new File(photo.uri);
      tempFile.move(newFile);

      console.log("✅ File moved to:", newFile.uri);

      // Save path in AsyncStorage
      await AsyncStorage.multiSet([
      ["lastPhoto", newFile.uri],
      ["lastPhotoUrl", publicUrl],
    ]);
    
      console.log("💾 Saved path to AsyncStorage");

      // Pass safe URI to parent
      onConfirm(newFile.uri);
      onClose();
    } catch (error) {
      console.error("Error taking picture:", error);
      Alert.alert("Error", "Failed to take picture. Please try again.");
    }
  };

  const toggleCameraFacing = () => {
    setFacing((current) => (current === "back" ? "front" : "back"));
  };

  return (
    <Modal
      animationType="slide"
      transparent={false}
      visible={visible}
      onRequestClose={onClose}
    >
      <SafeAreaView className="flex-1 bg-black">
        {visible && permission.granted && (
          <CameraView
            ref={cameraRef}
            style={{ flex: 1 }}
            facing={facing}
            onCameraReady={onCameraReady}
            mode="picture"
          />
        )}

        {/* Header */}
        <SafeAreaView className="absolute top-0 rounded-b-[50px] bg-gray-900 p-3 w-full items-center z-10">
          <Text className="text-white text-lg font-semibold text-center px-4">
            Take a picture of the package
          </Text>
        </SafeAreaView>

        {/* Camera not ready overlay */}
        {!isReady && (
          <View className="absolute inset-0 bg-black bg-opacity-50 items-center justify-center z-20">
            <Text className="text-white text-lg">Initializing camera...</Text>
          </View>
        )}

        {/* Controls */}
        <SafeAreaView className="absolute bottom-10 w-full flex-row justify-around items-center px-6 z-10">
          <TouchableOpacity
            className="bg-gray-800 p-3 rounded-full"
            onPress={onClose}
          >
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>

          <TouchableOpacity
            className={`w-16 h-16 rounded-full border-4 ${
              isReady
                ? "bg-white border-gray-400"
                : "bg-gray-600 border-gray-600"
            }`}
            onPress={takePicture}
            disabled={!isReady}
          />

          <TouchableOpacity
            className="bg-gray-800 p-3 rounded-full"
            onPress={toggleCameraFacing}
          >
            <Ionicons name="camera-reverse" size={28} color="white" />
          </TouchableOpacity>
        </SafeAreaView>
      </SafeAreaView>
    </Modal>
  );
}
