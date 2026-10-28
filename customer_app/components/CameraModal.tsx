import {
  addPackageImage,
  uploadDeliveryImage,
} from "@/lib/supabase-app-functions";
import { Ionicons } from "@expo/vector-icons";
import { CameraType, CameraView, useCameraPermissions } from "expo-camera";
import { Directory, File, Paths } from "expo-file-system";
import React, { useEffect, useRef, useState } from "react";
import { Alert, Modal, Text, TouchableOpacity, View } from "react-native";
import * as Progress from "react-native-progress";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CameraModal({
  visible,
  onClose,
  onConfirm,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (uri: string | null) => void; // allow null for "skip"
}) {
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const [isReady, setIsReady] = useState(false);
  const cameraRef = useRef<any>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [step, setStep] = useState<"prompt" | "camera">("prompt");

  useEffect(() => {
    if (visible) {
      setStep("prompt"); // reset to workflow prompt each time modal opens
    }
  }, [visible]);

  useEffect(() => {
    if (step === "camera" && !permission?.granted) {
      requestPermission();
    }
  }, [step, permission]);

  const onCameraReady = () => {
    console.log("📹 Camera is ready");
    setIsReady(true);
  };

  const handleWorkflowChoice = (choice: "yes" | "no") => {
    if (choice === "yes") {
      setStep("camera");
    } else {
      onConfirm(null);
      onClose();
    }
  };

  if (!permission) return null;

  if (step === "prompt") {
    return (
      <Modal
        animationType="slide"
        transparent={false}
        visible={visible}
        onRequestClose={onClose}
      >
        <SafeAreaView className="flex-1 bg-black px-6">
          <View className="flex-1 items-center justify-center">
            <View className="w-24 h-24 rounded-full bg-[#FF7518]/15 items-center justify-center">
              <Ionicons name="camera" size={44} color="#FF7518" />
            </View>
            <Text className="text-white text-2xl font-bold mt-6 text-center">
              Add a photo of your package?
            </Text>
            <Text className="text-gray-400 text-base text-center mt-2 leading-6 max-w-xs">
              It helps your rider find the right package at pickup. You can skip
              this and still book.
            </Text>
          </View>

          <View className="gap-3 pb-4">
            <TouchableOpacity
              className="h-14 rounded-full bg-[#FF7518] flex-row items-center justify-center gap-2"
              onPress={() => handleWorkflowChoice("yes")}
              accessibilityRole="button"
            >
              <Ionicons name="camera-outline" size={20} color="white" />
              <Text className="text-white text-base font-bold">Take a photo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              className="h-14 rounded-full bg-[#2C2C30] items-center justify-center"
              onPress={() => handleWorkflowChoice("no")}
              accessibilityRole="button"
            >
              <Text className="text-white text-base font-semibold">Skip for now</Text>
            </TouchableOpacity>
            <TouchableOpacity className="py-3 items-center" onPress={onClose} accessibilityRole="button">
              <Text className="text-gray-400 text-sm">Cancel</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

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
              ASAP needs your camera to photograph the package you&apos;re sending.
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
        "Please wait for the camera to initialize",
      );
      return;
    }

    if (!cameraRef.current) return;

    try {
      setIsUploading(true);
      setUploadProgress(0);

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
        await appFolder.create();
      }

      // Move file into app folder
      const filename = photo.uri.split("/").pop() || `photo_${Date.now()}.jpg`;
      const newFile = new File(appFolder, filename);

      // Copy the file using the File class
      const tempFile = new File(photo.uri);
      await tempFile.copy(newFile);

      console.log("✅ File saved to:", newFile.uri);

      // Upload to Supabase with progress tracking
      const publicUrl = await uploadDeliveryImage(
        newFile.uri,
        "package_images", // ✅ Use the correct bucket name
        (progress: any) => {
          const percent = Math.round(progress * 100);
          setUploadProgress(progress);
          console.log(`📤 Upload progress: ${percent}%`);
        },
      );

      const AddImageToTable = addPackageImage(publicUrl);

      // Pass safe URI to parent
      onConfirm(publicUrl);
      setIsUploading(false);
      setUploadProgress(null);
      onClose();
    } catch (error) {
      console.error("Error taking picture:", error);
      setIsUploading(false);
      setUploadProgress(null);
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

        {/* Header: close, title, flip */}
        <SafeAreaView edges={["top"]} className="absolute top-0 left-0 right-0 z-10">
          <View className="flex-row items-center justify-between px-4 pt-2">
            <TouchableOpacity
              className="w-11 h-11 rounded-full bg-black/60 items-center justify-center"
              onPress={onClose}
              disabled={isUploading}
              accessibilityRole="button"
              accessibilityLabel="Close camera"
            >
              <Ionicons name="close" size={24} color={isUploading ? "#6B7280" : "white"} />
            </TouchableOpacity>
            <Text className="text-white text-base font-semibold">Photograph your package</Text>
            <TouchableOpacity
              className="w-11 h-11 rounded-full bg-black/60 items-center justify-center"
              onPress={toggleCameraFacing}
              disabled={isUploading}
              accessibilityRole="button"
              accessibilityLabel="Switch camera"
            >
              <Ionicons name="camera-reverse-outline" size={22} color={isUploading ? "#6B7280" : "white"} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>

        {/* Framing guide */}
        <View pointerEvents="none" className="absolute inset-0 items-center justify-center">
          <View className="w-[78%] aspect-square rounded-3xl border-2 border-white/70" />
        </View>

        {/* Camera not ready overlay */}
        {!isReady && !isUploading && (
          <View className="absolute inset-0 bg-black/60 items-center justify-center z-20">
            <Text className="text-white text-lg">Initializing camera...</Text>
          </View>
        )}

        {/* Upload Progress Overlay */}
        {isUploading && uploadProgress !== null && (
          <View className="absolute inset-0 bg-black/70 items-center justify-center z-30">
            <Progress.Circle
              size={90}
              progress={uploadProgress}
              showsText={true}
              color="#FF7518"
              unfilledColor="#374151"
              borderWidth={0}
              fill="white"
              thickness={8}
              formatText={(progress) =>
                progress === 0 ? "" : `${Math.round(progress * 100)}%`
              }
              textStyle={{ color: "black", fontSize: 18, fontWeight: "bold" }}
            />
            <Text className="text-white text-base mt-4">
              Uploading image...
            </Text>
          </View>
        )}

        {/* Shutter */}
        <SafeAreaView edges={["bottom"]} className="absolute bottom-0 left-0 right-0 items-center pb-6 z-10">
          <Text className="text-white/80 text-sm mb-4">Fit the whole package inside the frame</Text>
          <TouchableOpacity
            onPress={takePicture}
            disabled={!isReady || isUploading}
            accessibilityRole="button"
            accessibilityLabel="Take photo"
            className={`w-20 h-20 rounded-full border-4 border-white items-center justify-center ${
              !isReady || isUploading ? "opacity-50" : ""
            }`}
          >
            <View className="w-16 h-16 rounded-full bg-white" />
          </TouchableOpacity>
        </SafeAreaView>
      </SafeAreaView>
    </Modal>
  );
}
