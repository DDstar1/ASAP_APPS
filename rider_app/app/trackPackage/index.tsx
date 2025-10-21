import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Image, View } from "react-native";
import MapView, { Marker, Polyline } from "react-native-maps";

export default function RiderTrackingScreen() {
  const router = useRouter();
  const { destinationLat, destinationLng, riderImage } = useLocalSearchParams();

  const destination = {
    latitude: parseFloat(destinationLat as string),
    longitude: parseFloat(destinationLng as string),
  };

  // Mock rider starting point
  const [riderLocation, setRiderLocation] = useState({
    latitude: destination.latitude - 0.05,
    longitude: destination.longitude - 0.05,
  });

  // Simulate rider movement toward destination
  useEffect(() => {
    const interval = setInterval(() => {
      setRiderLocation((prev) => {
        const step = 0.001;
        return {
          latitude:
            prev.latitude + (destination.latitude - prev.latitude) * step,
          longitude:
            prev.longitude + (destination.longitude - prev.longitude) * step,
        };
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [destination]);

  return (
    <View className="flex-1">
      {/* Header */}

      <MapView
        style={{ flex: 1 }}
        initialRegion={{
          latitude: destination.latitude,
          longitude: destination.longitude,
          latitudeDelta: 0.1,
          longitudeDelta: 0.1,
        }}
      >
        {/* Rider Marker */}
        <Marker coordinate={riderLocation} title="Rider">
          <Image
            source={{ uri: riderImage as string }}
            style={{ width: 40, height: 40 }}
          />
        </Marker>

        {/* Destination Marker */}
        <Marker coordinate={destination} title="Destination" pinColor="green" />

        {/* Path between Rider and Destination */}
        <Polyline
          coordinates={[riderLocation, destination]}
          strokeColor="orange"
          strokeWidth={4}
        />
      </MapView>
    </View>
  );
}
