import { Tabs } from "expo-router";
import React from "react";

import { MY_ICONS } from "@/assets/assetsData";
import { HapticTab } from "@/components/HapticTab";
import TabBarBackground from "@/components/ui/TabBarBackground";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarBackground: TabBarBackground,
        tabBarStyle: {
          backgroundColor: "#111827", // same as bg-gray-900
          borderTopColor: "transparent",
        },
        tabBarActiveTintColor: "#f97316", // orange-500
        tabBarInactiveTintColor: "#9CA3AF", // gray-400
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
          tabBarIcon: ({ color }) => MY_ICONS.home(color),
        }}
      />

      <Tabs.Screen
        name="activity"
        options={{
          title: "Activity",
          tabBarIcon: ({ color }) => MY_ICONS.activity(color),
        }}
      />

      <Tabs.Screen
        name="account"
        options={{
          title: "Account",
          tabBarIcon: ({ color }) => MY_ICONS.account(color),
        }}
      />
    </Tabs>
  );
}
