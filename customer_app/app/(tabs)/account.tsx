import { IMAGES } from "@/assets/assetsData";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AccountScreen() {
  return (
    <SafeAreaView className="flex-1 bg-[#1c1c1e]">
      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        {/* Profile Header */}
        <View className="items-center mt-6">
          <Image
            source={IMAGES.profile_img}
            className="w-28 h-28 rounded-full bg-gray-700"
          />
          <View className="flex-row items-center mt-2">
            <MaterialIcons name="star" size={18} color="limegreen" />
            <Text className="text-white ml-1">5.00</Text>
          </View>
          <Text className="text-white text-xl font-bold mt-1">
            Marcus Corleone
          </Text>
        </View>

        {/* Menu Section 1 */}
        <View className="mt-8 mx-4 rounded-2xl bg-[#2c2c2e]">
          <MenuItem title="Personal Info" />
          <MenuItem title="Login & security" />
          <MenuItem title="Privacy" border={false} />
        </View>

        {/* Menu Section 2 */}
        <View className="mt-4 mx-4 rounded-2xl bg-[#2c2c2e]">
          <MenuItem title="Settings" />
          <MenuItem title="Messages" />
          <MenuItem title="Become a driver" border={false} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function MenuItem({ title, border = true }) {
  return (
    <TouchableOpacity
      className={`flex-row justify-between items-center px-4 py-4 ${
        border ? "border-b border-gray-600/50" : ""
      }`}
    >
      <Text className="text-white text-base">{title}</Text>
      <MaterialIcons name="chevron-right" size={22} color="#999" />
    </TouchableOpacity>
  );
}
