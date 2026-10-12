import { IMAGES } from "@/assets/assetsData";
import SavedLocationsModal from "@/components/SavedLocationsModal";
import ShareScreenModal from "@/components/ShareScreenModal";
import { getRecentPlaces, type RecentPlace } from "@/lib/recent-places";
import { openWebsite } from "@/utils/website";
import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const ORANGE = "#EE7F3A";

type IoniconName = keyof typeof Ionicons.glyphMap;

// Square tile in the bottom panel
function ActionTile({
  icon,
  label,
  onPress,
}: {
  icon: IoniconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="flex-1 aspect-square rounded-2xl bg-[#212126] justify-center items-center gap-2"
    >
      <Ionicons name={icon} size={26} color="white" />
      <Text className="text-white text-sm font-medium">{label}</Text>
    </TouchableOpacity>
  );
}

// Half-width card that opens a page on the website
function WebsiteCard({
  icon,
  title,
  subtitle,
  path,
}: {
  icon: IoniconName;
  title: string;
  subtitle: string;
  path: string;
}) {
  return (
    <TouchableOpacity
      onPress={() => openWebsite(path)}
      accessibilityRole="link"
      accessibilityLabel={`${title}. ${subtitle}. Opens the website`}
      className="flex-1 bg-[#3C3C43] rounded-3xl p-4 gap-3"
    >
      <View className="w-11 h-11 rounded-full bg-[#212126] justify-center items-center">
        <Ionicons name={icon} size={20} color={ORANGE} />
      </View>
      <View>
        <Text className="text-white text-base font-bold">{title}</Text>
        <Text className="text-gray-400 text-xs mt-0.5">{subtitle}</Text>
      </View>
      <View className="flex-row items-center gap-1">
        <Text className="text-[#EE7F3A] text-xs font-semibold">Learn more</Text>
        <Ionicons name="open-outline" size={12} color={ORANGE} />
      </View>
    </TouchableOpacity>
  );
}

const HomeScreen = () => {
  const [shareVisible, setShareVisible] = useState(false);
  const [savedVisible, setSavedVisible] = useState(false);
  const [recents, setRecents] = useState<RecentPlace[]>([]);

  // 🧭 Deep link params
  const { modal, edit, lat, lng } = useLocalSearchParams();

  // 🧱 Shared location state (syncs with params)
  const [SharedlocationDetails, setSharedlocationDetailsParam] = useState<any>({
    modal: null,
    edit: null,
    lat: null,
    lng: null,
  });

  // 🧹 Function to clear shared location
  const handleClearSharedDetails = () => {
    setSharedlocationDetailsParam({
      modal: null,
      edit: null,
      lat: null,
      lng: null,
    });
    router.replace("/(tabs)/home");
  };

  //  Whenever params change, sync to state
  useEffect(() => {
    if (modal || edit || lat || lng) {
      setSharedlocationDetailsParam({
        modal,
        edit,
        lat: lat ? parseFloat(lat as string) : null,
        lng: lng ? parseFloat(lng as string) : null,
      });
    }
  }, [modal, edit, lat, lng]);

  //  Auto-open Saved Locations modal when deep link triggers
  useEffect(() => {
    if (
      SharedlocationDetails &&
      SharedlocationDetails.modal === "sharedlocation" &&
      SharedlocationDetails.edit === "true"
    ) {
      setSavedVisible(true);
    }
  }, [SharedlocationDetails]);

  // Recents change whenever a search is made on the map
  useFocusEffect(
    useCallback(() => {
      getRecentPlaces().then(setRecents);
    }, []),
  );

  const openSearch = () =>
    router.push({ pathname: "/map", params: { search: "to" } });

  const bookToRecent = (place: RecentPlace) =>
    router.push({
      pathname: "/map",
      params: {
        dest_name: place.name,
        dest_address: place.address ?? "",
        dest_lat: String(place.coordinates.latitude),
        dest_lng: String(place.coordinates.longitude),
      },
    });

  return (
    <SafeAreaView edges={["top"]} className="flex-1 bg-[#212126]">
      <StatusBar barStyle="light-content" backgroundColor="#212126" />

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1 }}
      >
        {/* Search + chats */}
        <View className="flex-row items-center gap-3 px-4 pt-3 pb-4">
          <TouchableOpacity
            onPress={openSearch}
            accessibilityRole="search"
            accessibilityLabel="Where to? Search for a destination"
            className="flex-1 h-14 rounded-full bg-[#3C3C43] flex-row items-center pl-2 pr-5 gap-3"
          >
            <View className="w-10 h-10 rounded-full bg-[#212126] justify-center items-center">
              <Ionicons name="search" size={18} color="white" />
            </View>
            <Text className="text-gray-300 text-base">Where to?</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push("/all_chats")}
            accessibilityRole="button"
            accessibilityLabel="Messages"
            className="w-14 h-14 rounded-full bg-[#3C3C43] justify-center items-center"
          >
            <Ionicons name="chatbubble-ellipses-outline" size={22} color="white" />
          </TouchableOpacity>
        </View>

        {/* Promo: send a package */}
        <View className="mx-4 bg-[#3C3C43] rounded-3xl overflow-hidden flex-row min-h-[160px]">
          <View className="flex-1 p-5 justify-between z-10">
            <View>
              <Text className="text-white text-xl font-bold leading-7">
                Send a package{"\n"}across town
              </Text>
              <Text className="text-gray-300 text-xs mt-1">
                A nearby rider picks it up in minutes.
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push("/map")}
              accessibilityRole="button"
              className="self-start bg-[#EE7F3A] rounded-full px-5 h-11 justify-center mt-4"
            >
              <Text className="text-white text-sm font-bold">Book Ride</Text>
            </TouchableOpacity>
          </View>
          <Image
            source={IMAGES.map_lines}
            className="absolute -right-6 top-0 bottom-0 w-1/2 h-full"
            style={{ opacity: 0.9 }}
            resizeMode="cover"
            accessibilityIgnoresInvertColors
          />
        </View>

        {/* Become a vendor / Invest: both on the website */}
        <View className="flex-row gap-3 mx-4 mt-4">
          <WebsiteCard
            icon="storefront-outline"
            title="Become a vendor"
            subtitle="Sell and deliver with ASAP"
            path="/become-vendor"
          />
          <WebsiteCard
            icon="trending-up"
            title="Invest"
            subtitle="Own a part of ASAP"
            path="/invest"
          />
        </View>

        {/* Bottom panel */}
        <View className="flex-1 bg-[#3C3C43] rounded-t-[32px] mt-6 px-4 pt-5 pb-8">
          <View className="flex-row gap-3">
            <ActionTile icon="location" label="Location" onPress={openSearch} />
            <ActionTile
              icon="navigate-outline"
              label="Share"
              onPress={() => setShareVisible(true)}
            />
            <ActionTile
              icon="bookmark-outline"
              label="Saved"
              onPress={() => setSavedVisible(true)}
            />
          </View>

          <Text className="text-white text-lg font-bold mt-6 mb-1">Recent</Text>

          {recents.length === 0 ? (
            <TouchableOpacity
              onPress={openSearch}
              accessibilityRole="button"
              className="flex-row items-center gap-4 py-3"
            >
              <View className="w-11 h-11 rounded-xl bg-[#212126] justify-center items-center">
                <Ionicons name="search" size={18} color="#9CA3AF" />
              </View>
              <Text className="text-gray-400 text-sm flex-1">
                Places you search for will show up here.
              </Text>
            </TouchableOpacity>
          ) : (
            recents.slice(0, 4).map((place, i) => (
              <TouchableOpacity
                key={`${place.name}-${i}`}
                onPress={() => bookToRecent(place)}
                accessibilityRole="button"
                accessibilityLabel={`Send to ${place.name}`}
                className={`flex-row items-center gap-4 py-3 ${
                  i > 0 ? "border-t border-white/10" : ""
                }`}
              >
                <View className="w-11 h-11 rounded-xl bg-[#212126] justify-center items-center">
                  <Ionicons name="time-outline" size={20} color="white" />
                </View>
                <View className="flex-1">
                  <Text
                    className="text-white text-base font-semibold"
                    numberOfLines={1}
                  >
                    {place.name}
                  </Text>
                  {!!place.address && (
                    <Text className="text-gray-400 text-sm" numberOfLines={1}>
                      {place.address}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Share Modal */}
      <ShareScreenModal
        visible={shareVisible}
        onClose={() => setShareVisible(false)}
      />

      {/* Saved Locations Modal */}
      <SavedLocationsModal
        visible={savedVisible}
        onClose={() => setSavedVisible(false)}
        SharedlocationDetails={SharedlocationDetails}
        onClearSharedDetails={handleClearSharedDetails}
      />
    </SafeAreaView>
  );
};

export default HomeScreen;
