import { FontAwesome, Ionicons } from "@expo/vector-icons";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export const IMAGES = {
  riderBikePizza: require("./images/rider_bike_pizza.jpg"),
  riderManTransit: require("./images/rider_man_transit.jpg"),
  riderWithPizza: require("./images/rider_with_pizza.jpg"),
  map_rider: require("./images/map_rider.png"),
  profile_img: require("./images/profile.png"),
  wallet: require("./images/wallet.png"),
  dummy_map: require("./images/dummy_map.png"),
  icon: require("./images/icon.png"),
  splashIcon: require("./images/splash-icon.png"),
  indomie_package: require("./images/indomie_package.jpg"),
  no_package_image: require("./images/no_package_image.jpg"),
  // 👉 add more images here if needed
};

// 🎨 Centralized Icons
export const MY_ICONS = {
  home: (color: string, size = 28) => (
    <MaterialIcons name="home" size={size} color={color} />
  ),
  explore: (color: string, size = 28) => (
    <MaterialIcons name="explore" size={size} color={color} />
  ),
  activity: (color: string, size = 28) => (
    <MaterialIcons name="history" size={size} color={color} />
  ),
  account: (color: string, size = 28) => (
    <MaterialIcons name="person" size={size} color={color} />
  ),
  location: (color: string, size = 28) => (
    <MaterialIcons name="location-on" size={size} color={color} />
  ),
  message: (color: string, size = 28) => (
    <MaterialIcons name="chat-bubble-outline" size={size} color={color} />
  ),
  circle: (color: string, size = 28) => (
    <MaterialIcons name="circle" size={size} color={color} />
  ),
  arrowRight: (color: string, size = 20) => (
    <MaterialIcons name="keyboard-arrow-right" size={size} color={color} />
  ),
  arrowLeft: (color: string, size = 20) => (
    <MaterialIcons name="keyboard-arrow-left" size={size} color={color} />
  ),
  map: (color: string, size = 28) => (
    <MaterialIcons name="map" size={size} color={color} />
  ), // ✅ Added map icon
  marker: (color: string, size = 28) => (
    <MaterialIcons name="place" size={size} color={color} />
  ), // ✅ Added marker icon
  delivery: (color: string, size = 28) => (
    <Ionicons name={"cube"} size={size} color={color} />
  ),
  clock: (color: string, size = 28) => (
    <FontAwesome name="clock-o" size={size} color={color} />
  ),
  calendar: (color: string, size = 28) => (
    <FontAwesome name="calendar" size={size} color={color} />
  ),
  cancel: (color: string, size = 28) => (
    <MaterialIcons name="delete" size={size} color={color} />
  ),
  phone: (color: string, size = 28) => (
    <Ionicons name="call" size={size} color={color} />
  ),
};
