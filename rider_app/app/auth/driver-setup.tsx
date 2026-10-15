import { useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { TextInput } from "react-native-paper";
import { useRouter } from "expo-router";
import * as Crypto from "expo-crypto";
import { supabase } from "@/lib/supabase";
import {
  createDriverAccount,
  getCusUserById,
  handleLogout,
  VehicleType,
} from "@/lib/supabase-app-functions";
import { normalizePhone } from "@/lib/phone";
import { MyKeyboardAvoidingWrapper } from "@/components/MyKeyboardAvoidingWrapper";

const inputTheme = {
  colors: {
    onSurfaceVariant: "#e0e5f9",
    outline: "rgba(255,255,255,0.08)",
    surfaceVariant: "#131a2e",
    primary: "#ff923e",
  },
};

const inputStyle = {
  backgroundColor: "#131a2e",
  marginBottom: 16,
  borderRadius: 12,
};

// No I/O/0/1 so riders can copy the ID by hand without mix-ups. 32 symbols,
// so byte % 32 has no bias.
const VEHICLE_ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * ASAP vehicle ID for bikes (and later our own fleet) that have no
 * legislative licence: "ASP-XX-XX". Stored in back_drivers.license_number.
 */
function generateVehicleId() {
  const chars = Array.from(
    Crypto.getRandomBytes(4),
    (b) => VEHICLE_ID_ALPHABET[b % VEHICLE_ID_ALPHABET.length],
  );
  return `ASP-${chars[0]}${chars[1]}-${chars[2]}${chars[3]}`;
}

/**
 * Second half of becoming a rider. Signup (here, on the website or in the
 * customer app) only creates the ASAP login + app_custom_users profile; this
 * screen adds the back_drivers row through Rust for that same user id.
 */
export default function DriverSetupScreen() {
  const router = useRouter();
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [savedPhone, setSavedPhone] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [vehicleType, setVehicleType] = useState<VehicleType | null>(null);
  const [vehicle, setVehicle] = useState("");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [vehicleId, setVehicleId] = useState<string | null>(null);
  const [vehicleIdNoted, setVehicleIdNoted] = useState(false);

  const isEV = vehicleType === "EV";

  useEffect(() => {
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/auth/login");
        return;
      }
      setEmail(user.email ?? "");
      const profile = await getCusUserById(user.id);
      setUsername(profile?.username ?? "");
      setSavedPhone(normalizePhone(profile?.phone ?? ""));
      setLoadingProfile(false);
    })();
  }, [router]);

  const handleGenerateVehicleId = () => {
    setVehicleId(generateVehicleId());
    setVehicleIdNoted(false);
  };

  const handleFinish = async () => {
    const finalPhone = savedPhone ?? normalizePhone(phone);
    if (!finalPhone)
      return Alert.alert(
        "Error",
        "Enter a valid phone number, e.g. 08012345678",
      );
    if (!vehicleType) return Alert.alert("Error", "Choose your vehicle type");
    if (isEV && (!vehicle.trim() || !licenseNumber.trim()))
      return Alert.alert(
        "Error",
        "EV riders must enter their vehicle and licence number",
      );
    if (!isEV && !vehicleId)
      return Alert.alert("Error", "Generate your ASAP vehicle ID");
    if (!isEV && !vehicleIdNoted)
      return Alert.alert(
        "Save Your Vehicle ID",
        `Write down ${vehicleId} and keep it safe, then confirm you've saved it.`,
      );

    setSaving(true);
    try {
      await createDriverAccount({
        name: username || email.split("@")[0],
        email,
        phone: finalPhone,
        vehicle_type: vehicleType,
        vehicle: vehicle.trim() || null,
        // Bikes carry the ASAP vehicle ID in place of a licence number
        license_number: isEV ? licenseNumber.trim() : vehicleId,
        account_number: null,
        bank_code: null,
      });
      router.replace("/(tabs)/home");
    } catch (err: any) {
      console.error("Rider setup failed:", err);
      Alert.alert(
        "Setup Not Finished",
        "We couldn't finish your rider setup. Check your connection and try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loadingProfile) {
    return (
      <View className="flex-1 bg-[#080e1c] items-center justify-center">
        <ActivityIndicator color="#ff923e" />
      </View>
    );
  }

  return (
    <MyKeyboardAvoidingWrapper>
      <ScrollView
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
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
          Finish Rider Setup.
        </Text>
        <Text className="text-sm text-[#a5abbd] mb-9">
          {email
            ? `Signed in as ${email}. Tell us what you ride.`
            : "Tell us what you ride."}
        </Text>

        {/* Phone — only when the profile doesn't have one yet */}
        {!savedPhone && (
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
            style={inputStyle}
            theme={inputTheme}
          />
        )}

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
          label={isEV ? "Vehicle" : "Vehicle (optional)"}
          mode="outlined"
          placeholder="Make, model and plate number"
          value={vehicle}
          onChangeText={setVehicle}
          left={<TextInput.Icon icon="car-outline" color="#a5abbd" />}
          textColor="#e0e5f9"
          outlineColor="rgba(255,255,255,0.08)"
          activeOutlineColor="#ff923e"
          style={inputStyle}
          theme={inputTheme}
        />

        {isEV ? (
          /* Licence Number — EVs have a legislative licence */
          <TextInput
            label="Licence Number"
            mode="outlined"
            placeholder="Driver's licence number"
            value={licenseNumber}
            onChangeText={setLicenseNumber}
            autoCapitalize="characters"
            left={
              <TextInput.Icon
                icon="card-account-details-outline"
                color="#a5abbd"
              />
            }
            textColor="#e0e5f9"
            outlineColor="rgba(255,255,255,0.08)"
            activeOutlineColor="#ff923e"
            style={{ ...inputStyle, marginBottom: 28 }}
            theme={inputTheme}
          />
        ) : vehicleType ? (
          /* ASAP Vehicle ID — required for everything that isn't an EV */
          <View className="mb-7">
            <Text className="text-xs font-semibold text-[#a5abbd] tracking-widest uppercase mb-2.5">
              ASAP Vehicle ID
            </Text>
            {vehicleId ? (
              <>
                <View className="w-full py-4 rounded-xl items-center bg-[#131a2e] border border-[#ff923e]/35 mb-2.5">
                  <Text
                    selectable
                    className="text-2xl font-bold text-[#ff923e] tracking-widest"
                  >
                    {vehicleId}
                  </Text>
                </View>
                <Text className="text-xs text-[#a5abbd] leading-relaxed mb-3">
                  We use this ID to trace your vehicle. Write it down and keep
                  it safe — you&apos;ll need it.
                </Text>
                <TouchableOpacity
                  onPress={() => setVehicleIdNoted(!vehicleIdNoted)}
                  className="flex-row items-center py-2"
                >
                  <View
                    className={`w-5 h-5 rounded border mr-3 items-center justify-center ${
                      vehicleIdNoted
                        ? "bg-[#ff923e] border-[#ff923e]"
                        : "border-white/30"
                    }`}
                  >
                    {vehicleIdNoted && (
                      <Text className="text-white text-xs font-bold">✓</Text>
                    )}
                  </View>
                  <Text className="text-sm text-[#e0e5f9]">
                    I&apos;ve saved my vehicle ID
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                onPress={handleGenerateVehicleId}
                className="w-full py-3.5 rounded-xl items-center border border-[#ff923e]/35 bg-[#131a2e]"
              >
                <Text className="text-sm font-semibold text-[#ff923e]">
                  Generate Vehicle ID
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View className="mb-3" />
        )}

        {/* Finish */}
        <TouchableOpacity
          onPress={handleFinish}
          disabled={saving}
          className="w-full py-4 rounded-full bg-[#ff923e] items-center mb-6"
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white text-base font-semibold">
              Start Riding
            </Text>
          )}
        </TouchableOpacity>

        {/* Wrong account — swipe back is off on this screen, so this is the way out */}
        <TouchableOpacity
          onPress={handleLogout}
          className="w-full py-4 rounded-full border border-[#ff923e]/35 items-center"
        >
          <Text className="text-base font-semibold text-[#ff923e]">
            Not you? Sign Out
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </MyKeyboardAvoidingWrapper>
  );
}
