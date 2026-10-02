// Target of asaprider://view-location?lat=..&lng=.. (shared from the website's
// /sharelocation page).
import { Stack, useLocalSearchParams } from "expo-router";
import React from "react";
import { Linking, Platform, Text, TouchableOpacity, View } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ViewLocationScreen() {
  const params = useLocalSearchParams<{ lat?: string; lng?: string }>();
  const latitude = Number(params.lat);
  const longitude = Number(params.lng);
  const valid = Number.isFinite(latitude) && Number.isFinite(longitude);

  // Google Maps on both platforms: the app if installed, otherwise the browser.
  const openNavigation = () => {
    const appUrl =
      Platform.OS === "ios"
        ? `comgooglemaps://?daddr=${latitude},${longitude}&directionsmode=driving`
        : `google.navigation:q=${latitude},${longitude}`;
    const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;
    Linking.openURL(appUrl).catch(() => Linking.openURL(webUrl));
  };

  return (
    <SafeAreaView edges={["bottom"]} className="flex-1 bg-[#111827]">
      <Stack.Screen
        options={{
          headerShown: true,
          title: "Shared Location",
          headerStyle: { backgroundColor: "#111827" },
          headerTintColor: "#FFFFFF",
        }}
      />
      {valid ? (
        <>
          <MapView
            provider={PROVIDER_GOOGLE}
            style={{ flex: 1 }}
            showsUserLocation
            initialRegion={{
              latitude,
              longitude,
              latitudeDelta: 0.01,
              longitudeDelta: 0.01,
            }}
          >
            <Marker
              coordinate={{ latitude, longitude }}
              title="Shared location"
              pinColor="#FB923C"
            />
          </MapView>
          <TouchableOpacity
            onPress={openNavigation}
            className="m-4 py-4 rounded-full bg-[#f97316] items-center"
          >
            <Text className="text-white font-semibold text-base">
              Navigate with Google Maps
            </Text>
          </TouchableOpacity>
        </>
      ) : (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-white text-base text-center">
            This location link is invalid.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}
