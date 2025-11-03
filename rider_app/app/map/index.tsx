import React, { useEffect, useState } from "react";
import { StyleSheet, View, ActivityIndicator } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE } from "react-native-maps";
import * as Location from "expo-location";

export default function MapScreen() {
  const [region, setRegion] = useState(null);
  const [loading, setLoading] = useState(true);

  // ✅ Request location permission and get user's current position
  useEffect(() => {
    const getLocation = async () => {
      try {
        // Ask for permission
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== "granted") {
          console.warn("Location permission denied");
          setLoading(false);
          return;
        }

        // Get current location
        const location = await Location.getCurrentPositionAsync({});
        const { latitude, longitude } = location.coords;

        setRegion({
          latitude,
          longitude,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      } catch (err) {
        console.error("Error getting location:", err);
      } finally {
        setLoading(false);
      }
    };

    getLocation();
  }, []);

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {region && (
        <MapView
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          region={region}
          showsUserLocation={true}
          showsCompass={true}
          showsMyLocationButton={true}
          onRegionChangeComplete={(newRegion) => setRegion(newRegion)}
        >
          {/* 👇 Optional marker at user location */}
          <Marker coordinate={region} title="You are here" />
        </MapView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "black",
  },
});
