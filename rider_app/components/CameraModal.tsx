import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CameraType, CameraView, useCameraPermissions } from "expo-camera";
import * as FileSystem from "expo-file-system/legacy";
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useEffect, useRef, useState } from "react";
import { Alert, Modal, Text, TouchableOpacity, View } from "react-native";

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
        <SafeAreaView className="flex-1 bg-black px-6">
          <View className="flex-1 items-center justify-center">
            <View className="w-24 h-24 rounded-full bg-[#2C2C30] items-center justify-center">
              <Ionicons name="camera-outline" size={44} color="white" />
            </View>
            <Text className="text-white text-2xl font-bold mt-6 text-center">
              Allow camera access
            </Text>
            <Text className="text-gray-400 text-base text-center mt-2 leading-6 max-w-xs">
              Photos of the package at pickup and delivery are your proof of handover.
            </Text>
          </View>
          <View className="gap-3 pb-4">
            <TouchableOpacity
              className="h-14 rounded-full bg-[#FF7518] items-center justify-center"
              onPress={requestPermission}
              accessibilityRole="button"
            >
              <Text className="text-white text-base font-bold">Allow camera</Text>
            </TouchableOpacity>
            <TouchableOpacity className="py-3 items-center" onPress={onClose} accessibilityRole="button">
              <Text className="text-gray-400 text-sm">Cancel</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
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

    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false, // ✅ no base64
          skipProcessing: false,
        });

        console.log("📸 Picture taken:", photo.uri);

        // Ensure app folder exists
        const appFolder = FileSystem.documentDirectory + "MyAppName/";
        const dirInfo = await FileSystem.getInfoAsync(appFolder);
        if (!dirInfo.exists) {
          await FileSystem.makeDirectoryAsync(appFolder, {
            intermediates: true,
          });
        }

        // Move file into app folder
        const filename = photo.uri.split("/").pop();
        const newPath = appFolder + filename;

        await FileSystem.moveAsync({
          from: photo.uri,
          to: newPath,
        });

        console.log("✅ File moved to:", newPath);

        // Save path in AsyncStorage
        await AsyncStorage.setItem("lastPhoto", newPath);
        console.log("💾 Saved path to AsyncStorage");

        // Pass safe URI to parent
        onConfirm(newPath);
        onClose();
      } catch (error) {
        console.error("Error taking picture:", error);
        Alert.alert("Error", "Failed to take picture. Please try again.");
      }
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
      <View className="flex-1 bg-black">
        {visible && permission.granted && (
          <CameraView
            ref={cameraRef}
            style={{ flex: 1 }}
            facing={facing}
            onCameraReady={onCameraReady}
            mode="picture"
          />
        )}

        {/* Header: close, title, flip */}
        <SafeAreaView edges={["top"]} className="absolute top-0 left-0 right-0 z-10">
          <View className="flex-row items-center justify-between px-4 pt-2">
            <TouchableOpacity
              className="w-11 h-11 rounded-full bg-black/60 items-center justify-center"
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Close camera"
            >
              <Ionicons name="close" size={24} color="white" />
            </TouchableOpacity>
            <Text className="text-white text-base font-semibold">Photograph the package</Text>
            <TouchableOpacity
              className="w-11 h-11 rounded-full bg-black/60 items-center justify-center"
              onPress={toggleCameraFacing}
              accessibilityRole="button"
              accessibilityLabel="Switch camera"
            >
              <Ionicons name="camera-reverse-outline" size={22} color="white" />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* Framing guide */}
        <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
          <View className="w-[78%] aspect-square rounded-3xl border-2 border-white/70" />
        </View>

        {/* Camera not ready overlay */}
        {!isReady && (
          <View className="absolute inset-0 bg-black/60 items-center justify-center z-20">
            <Text className="text-white text-lg">Starting camera…</Text>
          </View>
        )}

        {/* Shutter */}
        <SafeAreaView edges={["bottom"]} className="absolute bottom-0 left-0 right-0 items-center pb-6 z-10">
          <Text className="text-white/80 text-sm mb-4">Fit the whole package inside the frame</Text>
          <TouchableOpacity
            onPress={takePicture}
            disabled={!isReady}
            accessibilityRole="button"
            accessibilityLabel="Take photo"
            className={`w-20 h-20 rounded-full border-4 border-white items-center justify-center ${
              isReady ? "" : "opacity-50"
            }`}
          >
            <View className="w-16 h-16 rounded-full bg-white" />
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
