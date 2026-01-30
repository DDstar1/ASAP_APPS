import Constants from "expo-constants";
import { Coordinates, FitAllParams } from "./my_types";

const GOOGLE_MAPS_API_KEY = Constants.expoConfig?.extra?.googleMapsApiKey ?? "";

// Fake fare calculation
export const calculateFare = async () => {
  await new Promise((resolve) => setTimeout(resolve, 2000)); // simulate API
  const distanceKm = Math.random() * 10 + 2;
  const fare = 500 + distanceKm * 100;
  return Math.round(fare);
};

export const getDistanceAndETAByRoad = async (
  origin: Coordinates,
  destination: Coordinates,
) => {
  const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin.latitude},${origin.longitude}&destination=${destination.latitude},${destination.longitude}&key=${GOOGLE_MAPS_API_KEY}&mode=driving`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.error("Network error:", res.status, res.statusText);
      return null;
    }

    const data = await res.json();
    console.log("Directions API response:", data);
    const route = data.routes?.[0];

    if (!route) return null;

    const distanceMeters = route.legs[0].distance.value; // in meters
    const durationSeconds = route.legs[0].duration.value; // in seconds

    return {
      distanceKm: distanceMeters / 1000,
      durationMin: durationSeconds / 60,
    };
  } catch (error) {
    console.error("Google Directions API error:", error);
    return null;
  }
};

export const fitAll = ({
  mapRef,
  pickup,
  destination,
  selectedRider,
}: FitAllParams) => {
  const coords: Coordinates[] = [];

  if (pickup) coords.push(pickup);
  if (destination) coords.push(destination);
  if (selectedRider) coords.push(selectedRider);

  if (coords.length && mapRef.current) {
    mapRef.current.fitToCoordinates(coords, {
      edgePadding: { top: 100, right: 100, bottom: 100, left: 100 },
      animated: true,
    });
  }
};

export const reverseGeocode = async (lat: number, lng: number) => {
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`,
  );

  const data = await res.json();
  const result = data.results?.[0];

  if (!result) return null;

  return result.formatted_address;
};
