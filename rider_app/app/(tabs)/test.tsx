// app/debug/LocationDebugScreen.tsx
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as TaskManager from "expo-task-manager";
import {
  BACKGROUND_LOCATION_TASK,
  TASK_DEBUG_KEY,
  TASK_ERROR_KEY,
  TASK_LAST_LOCATION_KEY,
} from "@/utils/utils_orderLocationTracking";

const ALL_KEYS = [
  "local_waypoints",
  "last_sync_time",
  "active_order_id",
  TASK_DEBUG_KEY,
  TASK_ERROR_KEY,
  TASK_LAST_LOCATION_KEY,
];

const fmt = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
};

export default function LocationDebugScreen() {
  const [data, setData] = useState<Record<string, any>>({});
  const [taskOn, setTaskOn] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    const results = await AsyncStorage.multiGet(ALL_KEYS);
    const parsed: Record<string, any> = {};
    for (const [key, val] of results) {
      try {
        parsed[key] = val ? JSON.parse(val) : null;
      } catch {
        parsed[key] = val;
      }
    }
    setData(parsed);
    setTaskOn(
      await TaskManager.isTaskRegisteredAsync(BACKGROUND_LOCATION_TASK),
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };
  const clearAll = async () => {
    await AsyncStorage.multiRemove(ALL_KEYS);
    await load();
  };

  useEffect(() => {
    load();
  }, []);
  useEffect(() => {
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, []);

  const waypoints: any[] = data["local_waypoints"] ?? [];
  const synced = waypoints.filter((w) => w.synced).length;
  const lastSync = data["last_sync_time"]
    ? new Date(Number(data["last_sync_time"])).toISOString()
    : null;
  const location = data[TASK_LAST_LOCATION_KEY];
  const debug = data[TASK_DEBUG_KEY];
  const error = data[TASK_ERROR_KEY];

  return (
    <ScrollView
      className="flex-1 bg-[#0A0A0F]"
      contentContainerClassName="p-4 gap-3 pt-14 pb-10"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#FF6C00"
        />
      }
    >
      {/* Header */}
      <Text className="text-xl font-bold text-white mb-1">Location Debug</Text>

      {/* Status pills */}
      <View className="flex-row gap-2">
        {[
          { label: "Task", ok: taskOn, text: taskOn ? "ON" : "OFF" },
          {
            label: "Order",
            ok: !!data["active_order_id"],
            text: data["active_order_id"]
              ? `#${data["active_order_id"]}`
              : "NONE",
          },
          {
            label: "Error",
            ok: !error,
            text: error ? "YES" : "NONE",
            invert: true,
          },
        ].map(({ label, ok, text, invert }) => (
          <View
            key={label}
            className="flex-1 bg-[#111118] border border-[#1E1E2E] rounded-xl p-3 items-center"
          >
            <Text className="text-[10px] text-[#4A4A6A] font-semibold uppercase mb-1">
              {label}
            </Text>
            <Text
              className={`text-xs font-bold font-mono ${(invert ? !ok : ok) ? "text-[#00E57B]" : "text-[#FF3B5C]"}`}
            >
              {text}
            </Text>
          </View>
        ))}
      </View>

      {/* Error */}
      {error && (
        <View className="bg-[#FF3B5C]/10 border border-[#FF3B5C]/30 rounded-xl p-4 gap-1">
          <Text className="text-xs text-[#FF3B5C] font-bold uppercase mb-1">
            Error
          </Text>
          <Text className="text-sm text-[#FF3B5C] font-mono">
            {error.message}
          </Text>
          <Text className="text-xs text-[#4A4A6A] font-mono">
            {fmt(error.time)}
          </Text>
        </View>
      )}

      {/* Last location */}
      <View className="bg-[#111118] border border-[#1E1E2E] rounded-xl p-4 gap-2">
        <Text className="text-xs text-[#4A4A6A] font-bold uppercase mb-1">
          📍 Last Location
        </Text>
        {location ? (
          <>
            <Row label="Lat / Lng" value={`${location.lat}, ${location.lng}`} />
            <Row label="At" value={fmt(location.timestamp)} />
          </>
        ) : (
          <Text className="text-sm text-[#4A4A6A] italic">No location yet</Text>
        )}
      </View>

      {/* Task debug */}
      <View className="bg-[#111118] border border-[#1E1E2E] rounded-xl p-4 gap-2">
        <Text className="text-xs text-[#4A4A6A] font-bold uppercase mb-1">
          🔍 Task Debug
        </Text>
        {debug ? (
          <>
            <Row label="Message" value={debug.message} />
            {debug.waypointCount != null && (
              <Row label="Count" value={String(debug.waypointCount)} />
            )}
            {debug.lastTimestamp && (
              <Row label="Last fired" value={fmt(debug.lastTimestamp)} />
            )}
          </>
        ) : (
          <Text className="text-sm text-[#4A4A6A] italic">
            Task has not fired yet
          </Text>
        )}
      </View>

      {/* Waypoint stats */}
      <View className="bg-[#111118] border border-[#1E1E2E] rounded-xl p-4">
        <Text className="text-xs text-[#4A4A6A] font-bold uppercase mb-3">
          📦 Waypoints
        </Text>
        <View className="flex-row justify-around">
          <Stat label="Total" value={waypoints.length} color="text-white" />
          <Stat label="Synced" value={synced} color="text-[#00E57B]" />
          <Stat
            label="Pending"
            value={waypoints.length - synced}
            color={
              waypoints.length - synced > 0
                ? "text-[#FF6C00]"
                : "text-[#4A4A6A]"
            }
          />
        </View>
        {lastSync && (
          <Text className="text-xs text-[#4A4A6A] font-mono text-center mt-3 pt-3 border-t border-[#1E1E2E]">
            Last synced {fmt(lastSync)}
          </Text>
        )}
      </View>

      {/* Recent waypoints */}
      {waypoints.length > 0 && (
        <View className="bg-[#111118] border border-[#1E1E2E] rounded-xl p-4 gap-0">
          <Text className="text-xs text-[#4A4A6A] font-bold uppercase mb-2">
            🗂 Recent Waypoints
          </Text>
          {[...waypoints]
            .reverse()
            .slice(0, 15)
            .map((wp, i) => (
              <View
                key={i}
                className={`flex-row justify-between items-center py-2 ${i > 0 ? "border-t border-[#1E1E2E]" : ""}`}
              >
                <View className="flex-row items-center gap-2 flex-1">
                  <View
                    className={`w-2 h-2 rounded-full ${wp.synced ? "bg-[#00E57B]" : "bg-[#FF6C00]"}`}
                  />
                  <View>
                    <Text className="text-xs text-white font-mono">
                      {wp.lat.toFixed(5)}, {wp.lng.toFixed(5)}
                    </Text>
                    <Text className="text-[10px] text-[#4A4A6A] font-mono">
                      {fmt(wp.timestamp)}
                    </Text>
                  </View>
                </View>
                <Text
                  className={`text-[10px] font-bold uppercase ${wp.synced ? "text-[#00E57B]" : "text-[#FF6C00]"}`}
                >
                  {wp.synced ? "synced" : "pending"}
                </Text>
              </View>
            ))}
          {waypoints.length > 15 && (
            <Text className="text-xs text-[#4A4A6A] text-center pt-2 border-t border-[#1E1E2E] italic">
              +{waypoints.length - 15} more
            </Text>
          )}
        </View>
      )}

      {/* Buttons */}
      <TouchableOpacity
        className="bg-[#FF6C00] rounded-xl py-3.5 items-center"
        onPress={onRefresh}
      >
        <Text className="text-white font-bold text-sm">Refresh Now</Text>
      </TouchableOpacity>

      <TouchableOpacity
        className="bg-[#FF3B5C]/10 border border-[#FF3B5C]/30 rounded-xl py-3.5 items-center"
        onPress={clearAll}
      >
        <Text className="text-[#FF3B5C] font-bold text-sm">
          🗑 Clear All Local Storage
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row justify-between items-center">
      <Text className="text-sm text-[#8888AA]">{label}</Text>
      <Text className="text-sm text-white font-mono text-right ml-3 shrink">
        {value}
      </Text>
    </View>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View className="items-center gap-1">
      <Text className={`text-3xl font-extrabold ${color}`}>{value}</Text>
      <Text className="text-[10px] text-[#4A4A6A] font-semibold uppercase">
        {label}
      </Text>
    </View>
  );
}
