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
        <SafeAreaView className="flex-1 bg-gray-900 items-center justify-center p-6">
          <Ionicons name="camera-outline" size={70} color="#f97316" />
          <Text className="text-white text-2xl font-semibold mt-4 text-center">
            Take a Picture?
          </Text>
          <Text className="text-gray-400 text-center mt-2 mb-6">
            Do you want to take a picture of the package now?
          </Text>

          <TouchableOpacity
            className="bg-orange-500 px-6 py-3 rounded-full w-60 mb-5"
            onPress={() => handleWorkflowChoice("yes")}
          >
            <Text className="text-white font-semibold text-center">
              Yes, Take Picture
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-gray-800 px-6 py-3 rounded-full w-60 mb-5"
            onPress={() => handleWorkflowChoice("no")}
          >
            <Text className="text-gray-300 font-semibold text-center">
              No, Skip
            </Text>
          </TouchableOpacity>

          <TouchableOpacity className="mt-6" onPress={onClose}>
            <Text className="text-gray-500 text-sm">Cancel</Text>
          </TouchableOpacity>
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
        <View className="flex-1 items-center justify-center bg-black">
          <View className="items-center p-6">
            <Ionicons name="camera" size={64} color="white" />
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

        {/* Header */}
        <SafeAreaView className="absolute top-0 rounded-b-[50px] bg-gray-900 p-3 w-full items-center z-10">
          <Text className="text-white text-lg font-semibold text-center px-4">
            Take a picture of the package
          </Text>
        </SafeAreaView>

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
              color="#f97316"
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

        {/* Controls */}
        <SafeAreaView className="absolute bottom-10 w-full flex-row justify-around items-center px-6 z-10">
          <TouchableOpacity
            className="bg-gray-800 p-3 rounded-full"
            onPress={onClose}
            disabled={isUploading}
          >
            <Ionicons
              name="close"
              size={28}
              color={isUploading ? "#6B7280" : "white"}
            />
          </TouchableOpacity>

          {/* Capture button */}
          <TouchableOpacity
            onPress={takePicture}
            disabled={!isReady || isUploading}
            className="bg-white p-4 rounded-full"
          >
            <Ionicons name="camera" size={36} color="#f97316" />
          </TouchableOpacity>

          <TouchableOpacity
            className="bg-gray-800 p-3 rounded-full"
            onPress={toggleCameraFacing}
            disabled={isUploading}
          >
            <Ionicons
              name="camera-reverse"
              size={28}
              color={isUploading ? "#6B7280" : "white"}
            />
          </TouchableOpacity>
        </SafeAreaView>
      </SafeAreaView>
    </Modal>
  );
}
