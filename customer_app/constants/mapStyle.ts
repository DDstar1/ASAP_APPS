// Google map styles with orange roads, shared by the booking and tracking
// maps. mapStyleFor picks one from the system colour scheme.
export const DARK_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#1d1d1f" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8a8a8f" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1d1d1f" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#5a3a26" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#7a4a2c" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#a85f30" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0e0e10" }] },
];

export const LIGHT_MAP_STYLE = [
  { elementType: "geometry", stylers: [{ color: "#f4f4f5" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#6b6b70" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f4f4f5" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#f6d3bb" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#f2b48a" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#FF7518" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#cfd8e3" }] },
];

export const mapStyleFor = (scheme: string | null | undefined) =>
  scheme === "light" ? LIGHT_MAP_STYLE : DARK_MAP_STYLE;
