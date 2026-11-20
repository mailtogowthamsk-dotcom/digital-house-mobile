/**
 * Floating glass bottom navigation — visual polish only.
 * Tab ids / handlers unchanged.
 */

import React, { memo, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { BlurView } from "expo-blur";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { fonts } from "../../theme/fonts";
import { navShadow } from "../../theme/shadows";

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

const BAR_HEIGHT = 60;
const CREATE_SIZE = 32;
const DOCK_H_PAD = 12;

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
          height: BAR_HEIGHT,
          borderRadius: 22,
          backgroundColor: colors.surface,
          ...navShadow(mode)
        },
        shell: {
          flex: 1,
          borderRadius: 22,
          overflow: "hidden",
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border
        },
        blurFill: { ...StyleSheet.absoluteFill },
        tint: {
          ...StyleSheet.absoluteFill,
          backgroundColor:
            mode === "dark" ? "rgba(20,28,43,0.92)" : "rgba(255,255,255,0.94)"
        },
        bar: {
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 5
        },
        tab: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          minHeight: 44,
          height: "100%",
          gap: 3
        },
        pressed: { opacity: 0.65 },
        iconWrap: {
          width: 44,
          height: 32,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 16
        },
        iconWrapActive: {
          backgroundColor: mode === "dark" ? "rgba(34,197,94,0.16)" : "rgba(22,128,60,0.10)"
        },
        label: {
          fontFamily: fonts.medium,
          fontSize: 11,
          fontWeight: "500",
          color: colors.textSecondary,
          letterSpacing: 0
        },
        labelActive: {
          fontFamily: fonts.semiBold,
          color: colors.primary,
          fontWeight: "600"
        },
        createBtn: {
          width: CREATE_SIZE,
          height: CREATE_SIZE,
          borderRadius: CREATE_SIZE / 2,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.primary,
          ...Platform.select({
            ios: {
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.28,
              shadowRadius: 4
            },
            android: { elevation: 3 },
            default: {}
          })
        },
        badge: {
          position: "absolute",
          top: -2,
          right: -4,
          minWidth: 16,
          height: 16,
          borderRadius: 8,
          backgroundColor: colors.error,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 3,
          borderWidth: 1.5,
          borderColor: mode === "dark" ? colors.surface : "#FFFFFF"
        },
        badgeText: {
          fontFamily: fonts.bold,
          fontSize: 9,
          fontWeight: "700",
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
          pointerEvents="none"
        />
        <View style={s.tint} pointerEvents="none" />
        <View style={s.bar} accessibilityRole="tablist">
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
                  <View style={s.createBtn}>
                    <Ionicons name="add" size={22} color={colors.white} />
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
                accessibilityLabel={tab.badge ? `${tab.label}, ${tab.badge} unread` : tab.label}
              >
                <View style={[s.iconWrap, isActive && s.iconWrapActive]}>
                  <Ionicons
                    name={isActive ? tab.iconActive ?? tab.icon : tab.icon}
                    size={22}
                    color={isActive ? colors.primary : colors.textSecondary}
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

export { BAR_HEIGHT as BOTTOM_TAB_BAR_HEIGHT };
