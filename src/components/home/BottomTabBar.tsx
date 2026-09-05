/**
 * Floating glass bottom navigation — visual polish only.
 * Tab ids / handlers unchanged.
 */

import React, { memo, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";

export type TabId = "home" | "explore" | "create" | "messages" | "profile";

type TabItem = {
  id: TabId;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconActive?: keyof typeof Ionicons.glyphMap;
  badge?: number;
};

const TABS: TabItem[] = [
  { id: "home", label: "Home", icon: "home-outline", iconActive: "home" },
  { id: "explore", label: "Explore", icon: "compass-outline", iconActive: "compass" },
  { id: "create", label: "Create", icon: "add" },
  { id: "messages", label: "Messages", icon: "chatbubble-outline", iconActive: "chatbubble" },
  { id: "profile", label: "Profile", icon: "person-outline", iconActive: "person" }
];

const BAR_HEIGHT = 58;
const CREATE_SIZE = 32;
const DOCK_H_PAD = 16;

type BottomTabBarProps = {
  activeTab: TabId;
  onTabPress: (tab: TabId) => void;
  messageCount?: number;
  bottomInset?: number;
};

function BottomTabBarInner({
  activeTab,
  onTabPress,
  messageCount = 0,
  bottomInset = 0
}: BottomTabBarProps) {
  const { colors, mode } = useTheme();
  const tabsWithBadge = useMemo(
    () =>
      TABS.map((tab) =>
        tab.id === "messages" && messageCount > 0 ? { ...tab, badge: messageCount } : tab
      ),
    [messageCount]
  );

  const s = useMemo(
    () =>
      StyleSheet.create({
        dock: {
          position: "absolute",
          left: DOCK_H_PAD,
          right: DOCK_H_PAD,
          bottom: Math.max(bottomInset, 10),
          zIndex: 50,
          height: BAR_HEIGHT
        },
        shell: {
          flex: 1,
          borderRadius: BAR_HEIGHT / 2,
          overflow: "hidden",
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.7)",
          ...Platform.select({
            ios: {
              shadowColor: "#0F172A",
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: mode === "dark" ? 0.4 : 0.1,
              shadowRadius: 20
            },
            android: { elevation: 12 },
            default: {}
          })
        },
        blurFill: { ...StyleSheet.absoluteFill },
        tint: {
          ...StyleSheet.absoluteFill,
          backgroundColor:
            mode === "dark" ? "rgba(20,28,43,0.82)" : "rgba(255,255,255,0.78)"
        },
        bar: {
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 4
        },
        tab: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
          gap: 3,
          paddingTop: 2
        },
        pressed: { opacity: 0.65 },
        iconWrap: {
          width: 36,
          height: 28,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 14
        },
        iconWrapActive: {
          backgroundColor: mode === "dark" ? "rgba(37,99,235,0.22)" : "rgba(37,99,235,0.12)"
        },
        label: {
          fontSize: 10,
          fontWeight: "500",
          color: colors.textMuted,
          letterSpacing: 0.1
        },
        labelActive: {
          color: colors.primary,
          fontWeight: "700"
        },
        createBtn: {
          width: CREATE_SIZE,
          height: CREATE_SIZE,
          borderRadius: CREATE_SIZE / 2,
          alignItems: "center",
          justifyContent: "center"
        },
        badge: {
          position: "absolute",
          top: -2,
          right: -4,
          minWidth: 15,
          height: 15,
          borderRadius: 8,
          backgroundColor: colors.error,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 3,
          borderWidth: 1.5,
          borderColor: mode === "dark" ? colors.surface : "#FFFFFF"
        },
        badgeText: {
          fontSize: 8,
          fontWeight: "800",
          color: colors.white
        }
      }),
    [bottomInset, colors, mode]
  );

  return (
    <View style={s.dock} pointerEvents="box-none">
      <View style={s.shell}>
        <BlurView
          intensity={Platform.OS === "ios" ? 64 : 42}
          tint={mode === "dark" ? "dark" : "light"}
          style={s.blurFill}
        />
        <View style={s.tint} pointerEvents="none" />
        <View style={s.bar}>
          {tabsWithBadge.map((tab) => {
            const isActive = activeTab === tab.id;
            const isCreate = tab.id === "create";

            if (isCreate) {
              return (
                <Pressable
                  key={tab.id}
                  style={({ pressed }) => [s.tab, pressed && s.pressed]}
                  onPress={() => onTabPress("create")}
                  accessibilityRole="button"
                  accessibilityLabel="Create post"
                >
                  <View style={s.iconWrap}>
                    <LinearGradient
                      colors={[colors.primary, colors.secondary]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={s.createBtn}
                    >
                      <Ionicons name="add" size={20} color={colors.white} />
                    </LinearGradient>
                  </View>
                  <Text style={s.label} numberOfLines={1}>
                    {tab.label}
                  </Text>
                </Pressable>
              );
            }

            return (
              <Pressable
                key={tab.id}
                style={({ pressed }) => [s.tab, pressed && s.pressed]}
                onPress={() => onTabPress(tab.id)}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
              >
                <View style={[s.iconWrap, isActive && s.iconWrapActive]}>
                  <Ionicons
                    name={(isActive ? tab.iconActive : tab.icon) as keyof typeof Ionicons.glyphMap}
                    size={22}
                    color={isActive ? colors.primary : colors.textMuted}
                  />
                  {tab.badge != null && tab.badge > 0 ? (
                    <View style={s.badge}>
                      <Text style={s.badgeText}>{tab.badge > 99 ? "99+" : tab.badge}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={[s.label, isActive && s.labelActive]} numberOfLines={1}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    </View>
  );
}

export const BottomTabBar = memo(BottomTabBarInner);
export const FLOATING_TAB_BAR_HEIGHT = BAR_HEIGHT + 12;
