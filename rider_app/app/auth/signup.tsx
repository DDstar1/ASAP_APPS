import { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { TextInput } from "react-native-paper";
import { supabase } from "@/lib/supabase";
import { useRouter } from "expo-router";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import * as Linking from "expo-linking";
import {
  createDriverAccount,
  signUpUser,
  VehicleType,
} from "@/lib/supabase-app-functions";
import { normalizePhone } from "@/lib/phone";
import { MyKeyboardAvoidingWrapper } from "@/components/MyKeyboardAvoidingWrapper";

const createSessionFromUrl = async (url: string) => {
  const { params } = QueryParams.getQueryParams(url);
  const { access_token, refresh_token } = params;
  if (access_token) {
    const { error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });
    if (error) console.error(error);
  }
};

const inputTheme = {
  colors: {
    onSurfaceVariant: "#e0e5f9",
    outline: "rgba(255,255,255,0.08)",
    surfaceVariant: "#131a2e",
    primary: "#ff923e",
  },
};

export default function SignUpScreen() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [vehicleType, setVehicleType] = useState<VehicleType | null>(null);
  const [vehicle, setVehicle] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  // Set once the Supabase account exists, so a retry after the Rust step
  // fails doesn't try to sign up the same email again
  const accountCreated = useRef(false);

  const vehicleDetailsRequired = vehicleType === "EV";

  const url = Linking.useURL();
  useEffect(() => {
    if (url) {
      createSessionFromUrl(url);
      router.replace("/(tabs)/home");
    }
  }, [url]);

  const handleSignUp = async () => {
    if (!username || !email || !phone || !password || !confirmPassword)
      return Alert.alert("Error", "All fields are required");
    if (!normalizePhone(phone))
      return Alert.alert(
        "Error",
        "Enter a valid phone number, e.g. 08012345678",
      );
    if (password !== confirmPassword)
      return Alert.alert("Error", "Passwords do not match");
    if (!vehicleType)
      return Alert.alert("Error", "Choose your vehicle type");
    if (vehicleDetailsRequired && (!vehicle.trim() || !licenseNumber.trim()))
      return Alert.alert(
        "Error",
        "EV riders must enter their vehicle and licence number",
      );

    setLoading(true);
    try {
      if (!accountCreated.current) {
        await signUpUser(email, password, username, phone);
        accountCreated.current = true;
      }

      try {
        await createDriverAccount({
          name: username,
          email,
          phone: normalizePhone(phone)!,
          vehicle_type: vehicleType,
          vehicle: vehicle.trim() || null,
          license_number: licenseNumber.trim() || null,
          account_number: null,
          bank_code: null,
        });
      } catch (err: any) {
        console.error("Rider setup failed:", err);
        return Alert.alert(
          "Setup Not Finished",
          "Your account was created but rider setup didn't finish. Tap Create Account to try again.",
        );
      }

      Alert.alert(
        "Verify Your Email",
        "A verification link has been sent to your inbox.",
      );
      router.navigate("/(tabs)/home");
    } catch (err: any) {
      Alert.alert("Signup Failed", err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MyKeyboardAvoidingWrapper>
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center", // ← centers content vertically
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        className="bg-[#080e1c] px-6"
      >
        {/* Logo Row */}
        <View className="flex-row items-center mb-8">
          <View className="w-2.5 h-2.5 rounded-full bg-[#ff923e] mr-2.5" />
          <Text className="text-xs font-semibold text-[#a5abbd] tracking-widest uppercase">
            ASAP Delivery
          </Text>
        </View>

        {/* Heading */}
        <Text className="text-[34px] font-bold text-[#e0e5f9] leading-tight mb-1.5">
          Create an Account.
        </Text>
        <Text className="text-sm text-[#a5abbd] mb-9">
          Sign up to start sending your packages
        </Text>

        {/* Username */}
        <TextInput
          label="Username"
          mode="outlined"
          placeholder="yourname"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          left={<TextInput.Icon icon="account-outline" color="#a5abbd" />}
          textColor="#e0e5f9"
          outlineColor="rgba(255,255,255,0.08)"
          activeOutlineColor="#ff923e"
          style={{
            backgroundColor: "#131a2e",
            marginBottom: 16,
            borderRadius: 12,
          }}
          theme={inputTheme}
        />

        {/* Email */}
        <TextInput
          label="Email"
          mode="outlined"
          placeholder="your@email.com"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          left={<TextInput.Icon icon="email-outline" color="#a5abbd" />}
          textColor="#e0e5f9"
          outlineColor="rgba(255,255,255,0.08)"
          activeOutlineColor="#ff923e"
          style={{
            backgroundColor: "#131a2e",
            marginBottom: 16,
            borderRadius: 12,
          }}
          theme={inputTheme}
        />

        {/* Phone */}
        <TextInput
          label="Phone Number"
          mode="outlined"
          placeholder="08012345678"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoComplete="tel"
          textContentType="telephoneNumber"
          left={<TextInput.Icon icon="phone-outline" color="#a5abbd" />}
          textColor="#e0e5f9"
          outlineColor="rgba(255,255,255,0.08)"
          activeOutlineColor="#ff923e"
          style={{
            backgroundColor: "#131a2e",
            marginBottom: 16,
            borderRadius: 12,
          }}
          theme={inputTheme}
        />

        {/* Vehicle Type */}
        <Text className="text-xs font-semibold text-[#a5abbd] tracking-widest uppercase mb-2.5">
          Vehicle Type
        </Text>
        <View className="flex-row gap-3 mb-4">
          {(["Bike", "EV"] as VehicleType[]).map((type) => {
            const selected = vehicleType === type;
            return (
              <TouchableOpacity
                key={type}
                onPress={() => setVehicleType(type)}
                className={`flex-1 py-3.5 rounded-xl items-center border ${
                  selected
                    ? "bg-[#ff923e]/15 border-[#ff923e]"
                    : "bg-[#131a2e] border-white/[0.08]"
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    selected ? "text-[#ff923e]" : "text-[#e0e5f9]"
                  }`}
                >
                  {type}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Vehicle */}
        <TextInput
          label={vehicleDetailsRequired ? "Vehicle" : "Vehicle (optional)"}
          mode="outlined"
          placeholder="Make, model and plate number"
          value={vehicle}
          onChangeText={setVehicle}
          left={<TextInput.Icon icon="car-outline" color="#a5abbd" />}
          textColor="#e0e5f9"
          outlineColor="rgba(255,255,255,0.08)"
          activeOutlineColor="#ff923e"
          style={{
            backgroundColor: "#131a2e",
            marginBottom: 16,
            borderRadius: 12,
          }}
          theme={inputTheme}
        />

        {/* Licence Number */}
        <TextInput
          label={
            vehicleDetailsRequired
              ? "Licence Number"
              : "Licence Number (optional)"
          }
          mode="outlined"
          placeholder="Driver's licence number"
          value={licenseNumber}
          onChangeText={setLicenseNumber}
          autoCapitalize="characters"
          left={<TextInput.Icon icon="card-account-details-outline" color="#a5abbd" />}
          textColor="#e0e5f9"
          outlineColor="rgba(255,255,255,0.08)"
          activeOutlineColor="#ff923e"
          style={{
            backgroundColor: "#131a2e",
            marginBottom: 16,
            borderRadius: 12,
          }}
          theme={inputTheme}
        />

        {/* Password */}
        <TextInput
          label="Password"
          mode="outlined"
          placeholder="••••••••"
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          left={<TextInput.Icon icon="lock-outline" color="#a5abbd" />}
          right={
            <TextInput.Icon
              icon={showPassword ? "eye-off-outline" : "eye-outline"}
              onPress={() => setShowPassword(!showPassword)}
              color="#a5abbd"
            />
          }
          textColor="#e0e5f9"
          outlineColor="rgba(255,255,255,0.08)"
          activeOutlineColor="#ff923e"
          style={{
            backgroundColor: "#131a2e",
            marginBottom: 16,
            borderRadius: 12,
          }}
          theme={inputTheme}
        />

        {/* Confirm Password */}
        <TextInput
          label="Confirm Password"
          mode="outlined"
          placeholder="••••••••"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry={!showConfirm}
          left={<TextInput.Icon icon="lock-check-outline" color="#a5abbd" />}
          right={
            <TextInput.Icon
              icon={showConfirm ? "eye-off-outline" : "eye-outline"}
              onPress={() => setShowConfirm(!showConfirm)}
              color="#a5abbd"
            />
          }
          textColor="#e0e5f9"
          outlineColor="rgba(255,255,255,0.08)"
          activeOutlineColor="#ff923e"
          style={{
            backgroundColor: "#131a2e",
            marginBottom: 28,
            borderRadius: 12,
          }}
          theme={inputTheme}
        />

        {/* Create Account Button */}
        <TouchableOpacity
          onPress={handleSignUp}
          disabled={loading}
          className="w-full py-4 rounded-full bg-[#ff923e] items-center mb-6"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-base font-semibold">
              Create Account
            </Text>
          )}
        </TouchableOpacity>

        {/* OR Divider */}
        <View className="flex-row items-center mb-4">
          <View className="flex-1 h-px bg-white/[0.07]" />
          <Text className="text-xs text-[#3d4560] mx-3">OR</Text>
          <View className="flex-1 h-px bg-white/[0.07]" />
        </View>

        {/* Sign In — full width outlined pill */}
        <TouchableOpacity
          onPress={() => router.navigate("/auth/login")}
          className="w-full py-4 rounded-full border border-[#ff923e]/35 items-center"
        >
          <Text className="text-base font-semibold text-[#ff923e]">
            Already have an account? Sign In
          </Text>
        </TouchableOpacity>

        <Text className="text-[11px] text-[#3d4560] text-center mt-6 leading-relaxed">
          By signing up, you agree to our Terms &amp; Privacy Policy.
        </Text>
      </ScrollView>
    </MyKeyboardAvoidingWrapper>
  );
}
