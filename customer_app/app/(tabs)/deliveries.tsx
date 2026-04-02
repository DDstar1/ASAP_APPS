// app/(tabs)/orders.tsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  FlatList,
  SectionList,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { MY_ICONS } from "@/assets/assetsData";
import IncompleteDeliveryCard from "@/components/IncompleteDeliveryCard";
import CompletedOrderCards from "@/components/CompletedOrderCards";
import CompletedOrderSkeleton from "@/components/ui/skeletons/CompletedOrderSkeleton";
import IncompleteDeliverySkeleton from "@/components/ui/skeletons/IncompleteDeliverySkeleton";
import ActiveDeliveriesEmptyState from "@/components/ActiveDeliveriesEmptyState";
import CompletedOrdersEmptyState from "@/components/CompletedOrdersEmptyState";
import { useCustomerDeliveryStore } from "@/store/useCustomerDeliveriesStore";
import { router } from "expo-router";
import SelectItemTypeScreen from "@/components/SelectItemTypeScreen";

// ─── Kinetic Noir tokens ───────────────────────────────────────────────────
// primary:           #ff923e
// surface (base):    #080e1c
// surface-container-low:     #0d1424
// surface-container-high:    #111827
// surface-container-highest: #1a2235
// on-surface:        #e0e5f9
// on-surface-variant:#a5abbd
// ---------------------------------------------------------------------------

const OrdersPage = () => {
  const { width } = Dimensions.get("window");
  const [ItemTypeVisible, setItemTypeVisible] = useState(false);
  const { AllDeliveries, loading, fetchAllDeliveries } =
    useCustomerDeliveryStore();

  useEffect(() => {
    fetchAllDeliveries();
  }, []);

  const activeDeliveries = useMemo(
    () =>
      AllDeliveries.filter(
        (item) =>
          item.status === "pending" ||
          item.status === "arriving_pickup" ||
          item.status === "in_transit",
      ),
    [AllDeliveries],
  );

  const completedDeliveries = useMemo(
    () => AllDeliveries.filter((item) => item.status === "delivered"),

    [AllDeliveries],
  );

  console.log("Active Deliveries:", activeDeliveries?.length);
  console.log("Completed Deliveries:", completedDeliveries?.length);
  // ─── Sub-components ────────────────────────────────────────────────────────

  /**
   * SectionLabel
   * "ACTIVE  [2]" — uppercase label with optional count badge.
   * Matches the design-system's editorial hierarchy: small label + count pill.
   */
  const SectionLabel = ({
    title,
    count,
  }: {
    title: string;
    count?: number;
  }) => (
    <View className="flex-row items-center gap-2">
      <Text className="text-[11px] font-bold tracking-widest text-[#a5abbd] uppercase">
        {title}
      </Text>
      {count !== undefined && (
        // Surface-container-highest pill — no hard border (No-Line rule),
        // tonal contrast defines the boundary.
        <View className="bg-[#1a2235] rounded-lg px-2 py-0.5">
          <Text className="text-[11px] font-semibold text-[#a5abbd]">
            {count}
          </Text>
        </View>
      )}
    </View>
  );

  /**
   * Divider
   * "2px vertical gap of the base surface color" — design-system rule.
   * Very low opacity so it never reads as a hard 1px line.
   */
  const Divider = () => <View className="h-px bg-[#e0e5f9]/[0.06] mx-6 my-2" />;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    // Surface base: #080e1c — the deep saturated navy-black foundation
    <SafeAreaView edges={["top"]} className="flex-1 bg-[#080e1c]">
      {/* ── Header ── */}
      <View className="flex-row items-center justify-between px-6 pt-3 pb-5">
        {/* Display-lg title — editorial scale difference vs section labels */}
        <Text className="text-[28px] font-extrabold text-[#e0e5f9] -tracking-wide">
          My Orders
        </Text>

        {/*
          Message icon button — surface-container-highest bg.
          Ghost border at outline-variant opacity (No full-opacity border rule).
          Primary tint on the border to tie to brand.
        */}
        <View className="w-11 h-11 rounded-2xl bg-[#1a2235] items-center justify-center border border-[#ff923e]/20">
          {MY_ICONS.message("#ff923e", 20)}
        </View>
      </View>

      <Divider />

      {/* ── Active Deliveries ── */}
      <View className="px-6 pt-3 pb-2">
        <SectionLabel
          title="Active"
          count={loading ? undefined : activeDeliveries.length}
        />
      </View>

      {/* maxHeight caps the horizontal scroll area at roughly one card height */}
      <View style={{ maxHeight: 240 }}>
        {loading ? (
          <FlatList
            horizontal
            data={[1, 2, 3]}
            keyExtractor={(item) => item.toString()}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 24,
              alignItems: "center",
            }}
            renderItem={() => <IncompleteDeliverySkeleton width={width} />}
          />
        ) : (
          <FlatList
            data={activeDeliveries}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 24,
              alignItems: "center",
            }}
            ItemSeparatorComponent={() => <View className="w-3" />}
            keyExtractor={(item, index) => `${item.order_code}-${index}`}
            renderItem={({ item }) => (
              <IncompleteDeliveryCard item={item} width={width} />
            )}
            ListEmptyComponent={() => (
              <ActiveDeliveriesEmptyState width={width} />
            )}
          />
        )}
      </View>

      <Divider />

      {/* ── Completed Orders ── */}
      <View className="px-6 pt-3 pb-2">
        <SectionLabel
          title="Completed"
          count={loading ? undefined : completedDeliveries.length}
        />
      </View>

      {loading ? (
        // Surface-container-low background behind the skeleton list
        <View className="flex-1 px-6 gap-3">
          {[1, 2, 3, 4].map((_, i) => (
            <CompletedOrderSkeleton key={i} />
          ))}
        </View>
      ) : (
        <SectionList
          sections={
            completedDeliveries?.length
              ? [{ title: "Completed", data: completedDeliveries }]
              : []
          }
          keyExtractor={(item, index) => `${String(item.id)}-${index}`}
          renderItem={({ item }) => <CompletedOrderCards item={item} />}
          stickySectionHeadersEnabled
          className=" px-6 "
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingBottom: 32,
            flexGrow: 1, // 👈 THIS IS KEY
          }}
          // Separator: ghost divider, very low opacity — never a hard 1px line
          ItemSeparatorComponent={() => (
            <View className="h-px bg-[#e0e5f9]/[0.06]" />
          )}
          ListEmptyComponent={() => (
            <CompletedOrdersEmptyState
              activeDeliveriesCount={activeDeliveries.length}
              onSendPackage={() => {
                setItemTypeVisible(true);
              }}
            />
          )}
        />
      )}

      {/* Select Item Modal */}
      <SelectItemTypeScreen
        visible={ItemTypeVisible}
        onClose={() => setItemTypeVisible(false)}
        onConfirm={async (packageType, description) => {
          console.log("📦 Selected type:", packageType);
          console.log("📝 Description:", description);

          try {
            router.navigate({
              pathname: "/map",
              params: {
                packageType,
                packageDescription: description,
              },
            });
          } catch (error) {
            console.error("Failed to save package type:", error);
            Alert.alert("Error", "Failed to save package type");
            router.navigate("/map");
          }
        }}
      />
    </SafeAreaView>
  );
};

export default OrdersPage;
