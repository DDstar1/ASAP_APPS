import { Ionicons } from "@expo/vector-icons";
import { router, Tabs } from "expo-router";
import React, { useEffect } from "react";

import { HapticTab } from "@/components/haptic-tab";
import TabBarBackground from "@/components/ui/TabBarBackground";
import { useUserStore } from "@/store/useUserStore";
import { hasAcceptedGuidelines } from "@/utils/riderGuidelines";

export default function TabLayout() {
  const userId = useUserStore((s) => s.user?.id);

  // Every route into the tabs passes here, so new riders see the guidelines first
  useEffect(() => {
    if (!userId) return;
    hasAcceptedGuidelines(userId).then((accepted) => {
      if (!accepted) router.replace("/guidelines");
    });
  }, [userId]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        sceneStyle: { backgroundColor: "#000000" },
        tabBarStyle: {
          backgroundColor: "#000000",
          borderTopColor: "transparent",
        },
        tabBarActiveTintColor: "#FFFFFF",
        tabBarInactiveTintColor: "#6B6B70",
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "600",
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="deliveries"
        options={{
          title: "Activity",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "cube" : "cube-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="chats"
        options={{
          title: "Chat",
          href: null, // 👈 hides from tab bar

          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "chatbubble" : "chatbubble-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "person" : "person-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="test"
        options={{
          title: "Debug",
          href: __DEV__ ? undefined : null, // location debug screen, dev builds only
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              name={focused ? "bug" : "bug-outline"}
              size={24}
              color={color}
            />
          ),
        }}
      />
    </Tabs>
  );
}
