import { IMAGES } from "@/assets/assetsData";
import { useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useLayoutEffect, useRef, useState } from "react";
import { ImageBackground } from "react-native";

import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

const slides = [
  {
    id: "1",
    title: "Send Packages with Ease, Anywhere in India",
    description:
      "Select your package, choose pickup and drop locations, and we’ll handle the rest—all with minimal steps.",
    image: IMAGES.riderBikePizza,
  },
  {
    id: "2",
    title: "Personal or Business, We’ve Got You Covered",
    description:
      "Send packages from home or manage bulk shipments with business discounts—all in one app.",
    image: IMAGES.riderManTransit,
  },
  {
    id: "3",
    title: "Track Every Step, Every Mile with Full Control",
    description:
      "From pickup to delivery, know exactly where your package is, anytime, anywhere.",
    image: IMAGES.riderWithPizza,
  },
];

export default function Onboarding() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);
  const router = useRouter();
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, []);

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
    } else {
      router.replace("/home"); // Go to main tabs after onboarding
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    setCurrentIndex(index);
  };

  const renderItem = ({ item }: any) => (
    <ImageBackground
      source={item.image}
      style={{ width, height }}
      resizeMode="cover"
    >
      <View className="flex-1 bg-black/40 justify-center items-center px-6">
        <Text className="text-3xl font-bold text-white mb-3 text-center">
          {item.title}
        </Text>
        <Text className="text-base text-white text-center">
          {item.description}
        </Text>
      </View>
    </ImageBackground>
  );

  return (
    <SafeAreaView className="flex-1 bg-white">
      <FlatList
        data={slides}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        ref={flatListRef}
      />

      {/* Footer */}
      <View className="flex-row absolute bottom-10 left-0 right-0 justify-between items-center px-6 py-4">
        {/* Dots */}
        <View className="flex-row">
          {slides.map((_, index) => (
            <View
              key={index}
              className={`h-2 w-2 rounded-full mx-1 bg-black ${
                currentIndex === index ? "opacity-100" : "opacity-30"
              }`}
            />
          ))}
        </View>

        {/* Next / Get Started button */}
        <TouchableOpacity
          onPress={handleNext}
          className="bg-black px-6 py-2 rounded-full"
        >
          <Text className="text-white font-semibold">
            {currentIndex === slides.length - 1 ? "Get Started" : "Next"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
