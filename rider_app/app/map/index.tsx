import MapboxGL from "@rnmapbox/maps";
import React, { useEffect, useState } from "react";
import { PermissionsAndroid, Platform, StyleSheet, View } from "react-native";

// ✅ Set your Mapbox access token
MapboxGL.setAccessToken(
  "pk.eyJ1IjoiZGRoYXZlbiIsImEiOiJjbWdrOHRzdzIwcTBpMmxzbHVod3JoMDlnIn0.LJ4i7n2HINrY_QNllddYPA"
);

export default function MapScreen() {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null
  );

  // ✅ Request location permission (Android)
  useEffect(() => {
    const requestPermission = async () => {
      if (Platform.OS === "android") {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          console.warn("Location permission denied");
        }
      }
    };
    requestPermission();
  }, []);

  return (
    <View style={styles.container}>
      <MapboxGL.MapView
        style={styles.map}
        styleURL={MapboxGL.StyleURL.Street}
        logoEnabled={false}
        compassEnabled
      >
        {/* 👇 Show the user's location */}
        <MapboxGL.UserLocation
          visible={true}
          onUpdate={(location) => {
            const { longitude, latitude } = location.coords;
            setUserLocation([longitude, latitude]);
          }}
        />

        {/* 👇 Automatically snap camera to user location */}
        {userLocation && (
          <MapboxGL.Camera
            zoomLevel={14}
            centerCoordinate={userLocation}
            animationMode="flyTo"
            animationDuration={1000}
          />
        )}
      </MapboxGL.MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
});
