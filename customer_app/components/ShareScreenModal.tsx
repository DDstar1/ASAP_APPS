// app/modals/ShareScreenModal.tsx
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Modal,
  TouchableOpacity,
  View,
  Text,
  FlatList,
  Alert,
  ActivityIndicator,
  Share,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TextInput } from "react-native-paper";
import * as Location from "expo-location";

// 🧍 Fake users (for demo)
const FAKE_USERS = [
  { id: "1", name: "Destiny", phone: "+234 801 234 5678" },
  { id: "2", name: "Rita", phone: "+234 802 345 6789" },
  { id: "3", name: "John", phone: "+234 803 456 7890" },
  { id: "4", name: "Tunde", phone: "+234 804 567 8901" },
  { id: "5", name: "Amaka", phone: "+234 805 678 9012" },
];

// 📍 Generate a fake location + Google Maps link
const generateFakeLocation = () => {
  const latitude = 6 + Math.random(); // roughly within Nigeria
  const longitude = 3 + Math.random();
  const name = "Fake Location";
  const googleMapsUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
  return { name, latitude, longitude, googleMapsUrl };
};

export default function ShareScreenModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const toggleUser = (id: string) => {
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((u) => u !== id) : [...prev, id]
    );
  };

  // 🔍 Filter users by name or phone
  const filteredUsers = FAKE_USERS.filter(
    (user) =>
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.phone.includes(searchQuery)
  );

  // 👥 Share with selected users (in-app simulation)
  const handleSendToUsers = () => {
    if (selectedUsers.length === 0) {
      Alert.alert("No Users Selected", "Please select at least one user.");
      return;
    }

    const location = generateFakeLocation();
    Alert.alert(
      "Shared Successfully ✅",
      `Location sent to ${selectedUsers.length} user(s):\n\n${location.googleMapsUrl}`
    );

    setSelectedUsers([]);
    onClose();
  };

  // 🌍 Share via system share sheet
  const handleShareViaLink = async () => {
    try {
      setLoading(true);

      // 1️⃣ Request location permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission Denied",
          "Location permission is required to share your location."
        );
        return;
      }

      // 2️⃣ Get current coordinates
      const { coords } = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = coords;

      // 3️⃣ Create your website deep link
      const webAppUrl = `https://asap-apps.vercel.app/sharelocation?lat=${latitude}&lng=${longitude}`;

      // 4️⃣ Share via system share sheet
      await Share.share({
        message: `📍 Here's my current location:\n${webAppUrl}`,
      });
    } catch (error) {
      console.error(error);
      Alert.alert("Error", "Unable to share your current location.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/80">
        <SafeAreaView
          style={{ height: 520 }}
          className="w-full bg-gray-900 rounded-t-[25px] p-4"
        >
          {/* Top indicator */}
          <View className="self-center w-12 h-1.5 bg-gray-600 rounded-full mb-3" />

          {/* Header */}
          <View className="flex-row items-center mb-4">
            <TouchableOpacity
              onPress={onClose}
              className="h-10 w-10 items-center justify-center rounded-full bg-gray-800"
            >
              <Ionicons name="close" size={22} color="#f97316" />
            </TouchableOpacity>
            <Text className="ml-3 text-lg font-semibold text-gray-100">
              Share Current Location
            </Text>
          </View>

          {/* Search bar */}
          <TextInput
            label="Search Users"
            mode="outlined"
            value={searchQuery}
            onChangeText={setSearchQuery}
            left={<TextInput.Icon icon="magnify" color="#aaa" />}
            textColor="#fff"
            outlineColor="#333"
            activeOutlineColor="#f97316"
            style={{
              backgroundColor: "#2c2c2e",
              marginBottom: 16,
              borderRadius: 12,
            }}
            theme={{
              colors: {
                placeholder: "#888",
                onSurfaceVariant: "#fff",
                outline: "#444",
                surfaceVariant: "#2c2c2e",
              },
            }}
          />
          {/* Fake user list */}
          <FlatList
            data={filteredUsers}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const selected = selectedUsers.includes(item.id);
              return (
                <TouchableOpacity
                  onPress={() => toggleUser(item.id)}
                  className={`flex-row items-center justify-between p-3 mb-2 rounded-xl ${
                    selected ? "bg-orange-600/30" : "bg-gray-800"
                  }`}
                >
                  <View className="flex-row items-center">
                    <Ionicons
                      name="person-circle-outline"
                      size={40}
                      color={selected ? "#f97316" : "#aaa"}
                    />
                    <View className="ml-2">
                      <Text className="text-gray-100 text-lg">{item.name}</Text>
                      <Text className="text-gray-400 text-xs">
                        {item.phone}
                      </Text>
                    </View>
                  </View>
                  {selected && (
                    <Ionicons
                      name="checkmark-circle"
                      size={22}
                      color="#f97316"
                    />
                  )}
                </TouchableOpacity>
              );
            }}
          />

          {/* Action Buttons */}
          <View className="mt-3 flex-row justify-between items-center gap-4">
            {/* Send Button */}
            <TouchableOpacity
              onPress={handleSendToUsers}
              className="flex-1 bg-orange-500 py-3 rounded-xl mr-2"
            >
              <Text className="text-center text-white font-semibold text-md">
                Send to Selected Users
              </Text>
            </TouchableOpacity>
            <Text className="font-medium text-lg text-white">Or</Text>
            {/* OR Share via Link */}
            <TouchableOpacity
              onPress={handleShareViaLink}
              disabled={loading}
              className="flex-1 flex-row items-center justify-center bg-gray-800 py-3 rounded-xl ml-2"
            >
              {loading ? (
                <ActivityIndicator color="#f97316" />
              ) : (
                <>
                  <Ionicons
                    name="share-social-outline"
                    size={18}
                    color="#f97316"
                  />
                  <Text className="ml-2 text-orange-500 font-medium text-md">
                    Share via Link
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}
