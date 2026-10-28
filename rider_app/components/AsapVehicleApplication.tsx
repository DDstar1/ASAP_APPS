import { useState } from "react";
import { View, Text, TouchableOpacity, Alert, ActivityIndicator } from "react-native";
import { TextInput } from "react-native-paper";
import {
  submitDriverApplication,
  DriverApplication,
} from "@/lib/supabase-app-functions";
import { normalizePhone } from "@/lib/phone";

const inputTheme = {
  colors: {
    onSurfaceVariant: "#e0e5f9",
    outline: "rgba(255,255,255,0.08)",
    surfaceVariant: "#1C1C21",
    primary: "#FF7518",
  },
};

const inputStyle = {
  backgroundColor: "#1C1C21",
  marginBottom: 16,
  borderRadius: 12,
};

const inputProps = {
  mode: "outlined" as const,
  textColor: "#e0e5f9",
  outlineColor: "rgba(255,255,255,0.08)",
  activeOutlineColor: "#FF7518",
  style: inputStyle,
  theme: inputTheme,
};

type Props = {
  defaultName: string;
  savedPhone: string | null;
  application: DriverApplication | null;
  onSubmitted: (application: DriverApplication) => void;
};

export function ApplicationStatus({ application }: { application: DriverApplication }) {
  const view =
    application.status === "contacted"
      ? {
          title: "We've reached out",
          body: "Check your phone and email to book your in-person visit.",
        }
      : {
          title: "Application received",
          body: "The ASAP team will call or email you to book an in-person visit. Bring your NIN slip" +
            (application.asset_type === "ev" ? " and driver's licence." : "."),
        };
  return (
    <View className="w-full p-5 rounded-2xl bg-[#1C1C21] border border-[#FF7518]/35 mb-6">
      <Text className="text-lg font-bold text-[#e0e5f9] mb-1.5">{view.title}</Text>
      <Text className="text-sm text-[#a5abbd] leading-relaxed">{view.body}</Text>
    </View>
  );
}

export default function AsapVehicleApplication({
  defaultName,
  savedPhone,
  application,
  onSubmitted,
}: Props) {
  const [assetType, setAssetType] = useState<"ev" | "bicycle">("ev");
  const [fullName, setFullName] = useState(defaultName);
  const [phone, setPhone] = useState("");
  const [nin, setNin] = useState("");
  const [area, setArea] = useState("");
  const [licence, setLicence] = useState("");
  const [experience, setExperience] = useState("");
  const [guarantorName, setGuarantorName] = useState("");
  const [guarantorPhone, setGuarantorPhone] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    const finalPhone = savedPhone ?? normalizePhone(phone);
    const finalGuarantorPhone = guarantorPhone.trim() ? normalizePhone(guarantorPhone) : null;
    const finalLicence = licence.replace(/[\s-]/g, "").toUpperCase();
    if (fullName.trim().length < 2) return Alert.alert("Error", "Enter your full name");
    if (!finalPhone) return Alert.alert("Error", "Enter a valid phone number, e.g. 08012345678");
    if (!/^\d{11}$/.test(nin)) return Alert.alert("Check Your NIN", "Your NIN is 11 digits");
    if (!area.trim()) return Alert.alert("Error", "Tell us where you live or want to ride");
    if (assetType === "ev" && !/^[A-Z0-9]{12}$/.test(finalLicence))
      return Alert.alert(
        "Check Your Licence Number",
        "A licence number is 12 characters, letters and numbers only",
      );
    if (guarantorPhone.trim() && !finalGuarantorPhone)
      return Alert.alert("Error", "Enter a valid phone number for your guarantor");

    setSaving(true);
    try {
      const created = await submitDriverApplication({
        asset_type: assetType,
        full_name: fullName.trim(),
        phone: finalPhone,
        area: area.trim(),
        nin,
        license_number: assetType === "ev" ? finalLicence : null,
        experience: experience.trim() || null,
        guarantor_name: guarantorName.trim() || null,
        guarantor_phone: finalGuarantorPhone,
      });
      onSubmitted(
        created ?? {
          id: 0,
          asset_type: assetType,
          status: "submitted",
          created_at: new Date().toISOString(),
        },
      );
    } catch (err: any) {
      console.error("Driver application failed:", err);
      // apiPost throws "API <status>: <body>"; Rust's 400/409 bodies are { error }
      const match = /^API (400|409): (.*)$/s.exec(err?.message ?? "");
      let reason: string | null = null;
      try { reason = match ? JSON.parse(match[2]).error ?? null : null; } catch {}
      Alert.alert(
        "Application Not Sent",
        reason ?? "We couldn't send your application. Check your connection and try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (application && (application.status === "submitted" || application.status === "contacted")) {
    return <ApplicationStatus application={application} />;
  }

  return (
    <View>
      <Text className="text-sm text-[#a5abbd] leading-relaxed mb-5">
        {application?.status === "rejected"
          ? "Your last application wasn't approved. You can apply again."
          : "Apply to ride one of ASAP's vehicles. We'll contact you to finish in person."}
      </Text>

      <Text className="text-xs font-semibold text-[#a5abbd] tracking-widest uppercase mb-2.5">
        Vehicle
      </Text>
      <View className="flex-row gap-3 mb-4">
        {([
          ["ev", "Electric Bike"],
          ["bicycle", "Bicycle"],
        ] as const).map(([value, label]) => {
          const selected = assetType === value;
          return (
            <TouchableOpacity
              key={value}
              onPress={() => setAssetType(value)}
              className={`flex-1 py-3.5 rounded-xl items-center border ${
                selected ? "bg-[#FF7518]/15 border-[#FF7518]" : "bg-[#1C1C21] border-white/[0.08]"
              }`}
            >
              <Text className={`text-sm font-semibold ${selected ? "text-[#FF7518]" : "text-[#e0e5f9]"}`}>
                {label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TextInput
        {...inputProps}
        label="Full Name"
        value={fullName}
        onChangeText={setFullName}
        autoComplete="name"
        left={<TextInput.Icon icon="account-outline" color="#a5abbd" />}
      />
      {!savedPhone && (
        <TextInput
          {...inputProps}
          label="Phone Number"
          placeholder="08012345678"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
          autoComplete="tel"
          left={<TextInput.Icon icon="phone-outline" color="#a5abbd" />}
        />
      )}
      <TextInput
        {...inputProps}
        label="NIN"
        placeholder="11 digits"
        value={nin}
        onChangeText={(t) => setNin(t.replace(/\D/g, "").slice(0, 11))}
        keyboardType="number-pad"
        maxLength={11}
        left={<TextInput.Icon icon="card-account-details-outline" color="#a5abbd" />}
      />
      <TextInput
        {...inputProps}
        label="Area"
        placeholder="Where you live or want to ride"
        value={area}
        onChangeText={setArea}
        left={<TextInput.Icon icon="map-marker-outline" color="#a5abbd" />}
      />
      {assetType === "ev" && (
        <TextInput
          {...inputProps}
          label="Licence Number"
          placeholder="Driver's licence number"
          value={licence}
          onChangeText={setLicence}
          autoCapitalize="characters"
          left={<TextInput.Icon icon="card-text-outline" color="#a5abbd" />}
        />
      )}
      <TextInput
        {...inputProps}
        label="Riding Experience (optional)"
        placeholder="e.g. 2 years doing deliveries"
        value={experience}
        onChangeText={setExperience}
        multiline
        left={<TextInput.Icon icon="motorbike" color="#a5abbd" />}
      />
      <TextInput
        {...inputProps}
        label="Guarantor Name (optional)"
        value={guarantorName}
        onChangeText={setGuarantorName}
        left={<TextInput.Icon icon="account-check-outline" color="#a5abbd" />}
      />
      <TextInput
        {...inputProps}
        label="Guarantor Phone (optional)"
        placeholder="08012345678"
        value={guarantorPhone}
        onChangeText={setGuarantorPhone}
        keyboardType="phone-pad"
        style={{ ...inputStyle, marginBottom: 28 }}
        left={<TextInput.Icon icon="phone-outline" color="#a5abbd" />}
      />

      <TouchableOpacity
        onPress={handleSubmit}
        disabled={saving}
        className="w-full py-4 rounded-full bg-[#FF7518] items-center mb-6"
      >
        {saving ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-white text-base font-semibold">Send Application</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
