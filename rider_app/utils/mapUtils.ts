import { AnimatedRegion } from "react-native-maps";
import { RIDERS } from "./dummyData";

// Calculate bearing between two coordinates
export const getBearing = (
  start: { latitude: number; longitude: number },
  end: { latitude: number; longitude: number }
) => {
  const lat1 = (start.latitude * Math.PI) / 180;
  const lon1 = (start.longitude * Math.PI) / 180;
  const lat2 = (end.latitude * Math.PI) / 180;
  const lon2 = (end.longitude * Math.PI) / 180;

  const dLon = lon2 - lon1;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  const brng = Math.atan2(y, x);
  return ((brng * 180) / Math.PI + 360) % 360; // degrees
};

// Generate fake riders
export const generateRidersWithCoords = (baseLocation: {
  latitude: number;
  longitude: number;
}) => {
  return RIDERS.map((rider) => {
    const offsetLat = (Math.random() - 0.5) * 0.02; // ±0.01 ~ about 1km
    const offsetLng = (Math.random() - 0.5) * 0.02;
    const lat = baseLocation.latitude + offsetLat;
    const lng = baseLocation.longitude + offsetLng;

    return {
      ...rider,
      coordinate: new AnimatedRegion({
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }),
      lastPosition: { latitude: lat, longitude: lng },
      heading: 0,
    };
  });
};

// Move riders smoothly
export const moveRiders = (riders: any[], getBearingFn = getBearing) => {
  return riders.map((rider) => {
    const current = rider.coordinate.__getValue();
    const moveLat = (Math.random() - 0.5) * 0.02;
    const moveLng = (Math.random() - 0.5) * 0.02;
    const newPos = {
      latitude: current.latitude + moveLat,
      longitude: current.longitude + moveLng,
    };

    const heading = getBearingFn(current, newPos);
    rider.heading = heading;
    rider.lastPosition = newPos;

    rider.coordinate
      .timing({
        ...newPos,
        duration: 1500,
        useNativeDriver: false,
      })
      .start();

    return { ...rider };
  });
};

// Fake fare calculation
export const calculateFare = async () => {
  await new Promise((resolve) => setTimeout(resolve, 2000)); // simulate API
  const distanceKm = Math.random() * 10 + 2;
  const fare = 500 + distanceKm * 100;
  return Math.round(fare);
};

type Location = { latitude: number; longitude: number };

function getDistanceKm(loc1: Location, loc2: Location) {
  const R = 6371; // km radius of Earth
  const dLat = ((loc2.latitude - loc1.latitude) * Math.PI) / 180;
  const dLon = ((loc2.longitude - loc1.longitude) * Math.PI) / 180;
  const lat1 = (loc1.latitude * Math.PI) / 180;
  const lat2 = (loc2.latitude * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // distance in km
}

/**
 * Get rider's current live position
 */
function getRiderPosition(rider: any): Location {
  if (rider.coordinate && rider.coordinate.__getValue) {
    return rider.coordinate.__getValue(); // live animated position
  }
  return rider.lastPosition; // fallback
}

/**
 * Assign nearest rider to a given location
 * @param userLocation user lat/lng
 * @param riders list of riders with AnimatedRegion coordinates
 * @returns nearest rider object with live distance
 */
export function assignNearestRider(userLocation: any, riders: any[]) {
  if (!riders || riders.length === 0) {
    return null;
  }

  // Ensure userLocation is normalized
  const userPos = {
    latitude: userLocation.latitude ?? userLocation.coordinates?.latitude,
    longitude: userLocation.longitude ?? userLocation.coordinates?.longitude,
  };

  if (!userPos.latitude || !userPos.longitude) {
    return null;
  }

  let nearest: any = null;
  let minDist = Infinity;

  for (const rider of riders) {
    const pos = getRiderPosition(rider);

    if (!pos?.latitude || !pos?.longitude) {
      continue;
    }

    const dist = getDistanceKm(userPos, pos);

    if (dist < minDist) {
      minDist = dist;
      nearest = rider;
    }
  }

  if (!nearest) {
    return null;
  }

  return {
    ...nearest,
    distanceKm: Number(minDist.toFixed(2)),
  };
}
