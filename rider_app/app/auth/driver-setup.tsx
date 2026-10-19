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
  getMyDriverApplication,
  handleLogout,
  DriverApplication,
  VehicleType,
} from "@/lib/supabase-app-functions";
import { normalizePhone } from "@/lib/phone";
import { MyKeyboardAvoidingWrapper } from "@/components/MyKeyboardAvoidingWrapper";
import AsapVehicleApplication from "@/components/AsapVehicleApplication";

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

// No I/O so riders can copy the ID by hand without mix-ups
const PLATE_LETTERS = "ABCDEFGHJKLMNPQRSTUVWXYZ";
const PLATE_DIGITS = "0123456789";

const LICENSE_NO_ALPHABET = "0123456789";

const pick = (alphabet: string, n: number) =>
  Array.from(Crypto.getRandomBytes(n), (b) => alphabet[b % alphabet.length]).join("");

/**
 * Bikes (and later our own fleet) have no legislative plate or licence, so
 * ASAP issues both. The vehicle ID follows the plate format, 3 letters -
 * 3 digits + 2 letters ("ASP-123AB"), and goes in back_drivers.plate_number.
 */
function generateVehicleId() {
  return `ASP-${pick(PLATE_DIGITS, 3)}${pick(PLATE_LETTERS, 2)}`;
}


// 12 characters: "ASP" + 9 digits, e.g. "ASP482019376". Goes in
// back_drivers.license_number.
function generateLicenseNo() {
  return `ASP${pick(LICENSE_NO_ALPHABET, 9)}`;
}

// Typed values: spaces and dashes are optional, case doesn't matter.
// Plate: 3 letters, 3 digits, 2 letters -> "ABC-123XY", or null if invalid.
function normalizePlate(input: string) {
  const raw = input.replace(/[\s-]/g, "").toUpperCase();
  if (!/^[A-Z]{3}\d{3}[A-Z]{2}$/.test(raw)) return null;
  return `${raw.slice(0, 3)}-${raw.slice(3)}`;
}

// Licence: 12 letters or digits, or null if invalid
function normalizeLicense(input: string) {
  const raw = input.replace(/[\s-]/g, "").toUpperCase();
  return /^[A-Z0-9]{12}$/.test(raw) ? raw : null;
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
  // EV: typed by the rider. Bike: generated together below.
  const [licenseNumber, setLicenseNumber] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [idsNoted, setIdsNoted] = useState(false);
  // "asap" = applying to ride an ASAP-owned vehicle instead of their own
  const [path, setPath] = useState<"own" | "asap">("own");
  const [application, setApplication] = useState<DriverApplication | null>(null);

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
      const [profile, existing] = await Promise.all([
        getCusUserById(user.id),
        getMyDriverApplication(user.id).catch(() => null),
      ]);
      setUsername(profile?.username ?? "");
      setSavedPhone(normalizePhone(profile?.phone ?? ""));
      setApplication(existing);
      if (existing && existing.status !== "withdrawn") setPath("asap");
      setLoadingProfile(false);
    })();
  }, [router]);

  // Switching type clears the IDs so a generated one never ends up in the
  // EV fields (or a typed one under "ASAP IDs")
  const selectVehicleType = (type: VehicleType) => {
    if (type === vehicleType) return;
    setVehicleType(type);
    setLicenseNumber("");
    setPlateNumber("");
    setIdsNoted(false);
  };

  const handleGenerateIds = () => {
    setPlateNumber(generateVehicleId());
    setLicenseNumber(generateLicenseNo());
    setIdsNoted(false);
  };

  const handleFinish = async () => {
    const finalPhone = savedPhone ?? normalizePhone(phone);
    if (!finalPhone)
      return Alert.alert(
        "Error",
        "Enter a valid phone number, e.g. 08012345678",
      );
    if (!vehicleType) return Alert.alert("Error", "Choose your vehicle type");
    if (isEV && (!vehicle.trim() || !plateNumber.trim() || !licenseNumber.trim()))
      return Alert.alert(
        "Error",
        "EV riders must enter their vehicle, plate number and licence number",
      );
    // Generated IDs are already in shape; typed ones are checked here
    const plate = isEV ? normalizePlate(plateNumber) : plateNumber;
    const license = isEV ? normalizeLicense(licenseNumber) : licenseNumber;
    if (isEV && !plate)
      return Alert.alert(
        "Check Your Plate Number",
        "A plate number is 3 letters, 3 numbers and 2 letters, e.g. ABC-123XY",
      );
    if (isEV && !license)
      return Alert.alert(
        "Check Your Licence Number",
        "A licence number is 12 characters, letters and numbers only",
      );
    if (!isEV && !plateNumber)
      return Alert.alert("Error", "Generate your ASAP IDs");
    if (!isEV && !idsNoted)
      return Alert.alert(
        "Save Your IDs",
        `Write down vehicle ID ${plateNumber} and licence number ${licenseNumber}, then confirm you've saved them.`,
      );

    setSaving(true);
    try {
      await createDriverAccount({
        name: username || email.split("@")[0],
        email,
        phone: finalPhone,
        vehicle_type: vehicleType,
        vehicle: vehicle.trim() || null,
        license_number: license!,
        plate_number: plate!,
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
        <Text className="text-sm text-[#a5abbd] mb-7">
          {email
            ? `Signed in as ${email}. Tell us what you ride.`
            : "Tell us what you ride."}
        </Text>

        <View className="flex-row gap-3 mb-7">
          {([
            ["own", "My Own Vehicle"],
            ["asap", "Ride an ASAP Vehicle"],
          ] as const).map(([value, label]) => {
            const selected = path === value;
            return (
              <TouchableOpacity
                key={value}
                onPress={() => setPath(value)}
                className={`flex-1 py-3.5 px-2 rounded-xl items-center border ${
                  selected
                    ? "bg-[#ff923e]/15 border-[#ff923e]"
                    : "bg-[#131a2e] border-white/[0.08]"
                }`}
              >
                <Text
                  className={`text-sm font-semibold text-center ${
                    selected ? "text-[#ff923e]" : "text-[#e0e5f9]"
                  }`}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {path === "asap" ? (
          <AsapVehicleApplication
            defaultName={username}
            savedPhone={savedPhone}
            application={application}
            onSubmitted={setApplication}
          />
        ) : (
        <>
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
                onPress={() => selectVehicleType(type)}
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
          placeholder="Make and model"
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
          /* EVs have a legislative plate and the rider a licence */
          <>
          <TextInput
            label="Plate Number"
            mode="outlined"
            placeholder="e.g. LSR-123AB"
            value={plateNumber}
            onChangeText={setPlateNumber}
            autoCapitalize="characters"
            left={<TextInput.Icon icon="card-text-outline" color="#a5abbd" />}
            textColor="#e0e5f9"
            outlineColor="rgba(255,255,255,0.08)"
            activeOutlineColor="#ff923e"
            style={inputStyle}
            theme={inputTheme}
          />
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
          </>
        ) : vehicleType ? (
          /* ASAP IDs — bikes have no legislative plate or licence */
          <View className="mb-7">
            <Text className="text-xs font-semibold text-[#a5abbd] tracking-widest uppercase mb-2.5">
              ASAP IDs
            </Text>
            {plateNumber ? (
              <>
                {[
                  { label: "Vehicle ID", value: plateNumber },
                  { label: "Licence Number", value: licenseNumber },
                ].map(({ label, value }) => (
                  <View
                    key={label}
                    className="w-full py-3.5 rounded-xl items-center bg-[#131a2e] border border-[#ff923e]/35 mb-2.5"
                  >
                    <Text className="text-[11px] font-semibold text-[#a5abbd] tracking-widest uppercase mb-1">
                      {label}
                    </Text>
                    <Text
                      selectable
                      className="text-2xl font-bold text-[#ff923e] tracking-widest"
                    >
                      {value}
                    </Text>
                  </View>
                ))}
                <Text className="text-xs text-[#a5abbd] leading-relaxed mb-3">
                  We use the vehicle ID to trace your bike and the licence
                  number to identify you. Write both down and keep them safe —
                  you&apos;ll need them.
                </Text>
                <TouchableOpacity
                  onPress={() => setIdsNoted(!idsNoted)}
                  className="flex-row items-center py-2"
                >
                  <View
                    className={`w-5 h-5 rounded border mr-3 items-center justify-center ${
                      idsNoted
                        ? "bg-[#ff923e] border-[#ff923e]"
                        : "border-white/30"
                    }`}
                  >
                    {idsNoted && (
                      <Text className="text-white text-xs font-bold">✓</Text>
                    )}
                  </View>
                  <Text className="text-sm text-[#e0e5f9]">
                    I&apos;ve saved both IDs
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                onPress={handleGenerateIds}
                className="w-full py-3.5 rounded-xl items-center border border-[#ff923e]/35 bg-[#131a2e]"
              >
                <Text className="text-sm font-semibold text-[#ff923e]">
                  Generate My IDs
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
        </>
        )}

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
