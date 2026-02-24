import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
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
  { id: "explore", label: "Explore", icon: "search-outline", iconActive: "search" },
  { id: "create", label: "Create", icon: "add" },
  { id: "messages", label: "Messages", icon: "chatbubble-outline", iconActive: "chatbubble" },
  { id: "profile", label: "Profile", icon: "person-outline", iconActive: "person" }
];

const BAR_HEIGHT = 64;
const CREATE_BTN_SIZE = 56;
const ICON_SIZE = 24;
const ICON_ROW_HEIGHT = 36;
const LABEL_GAP = 6;

type BottomTabBarProps = {
  activeTab: TabId;
  onTabPress: (tab: TabId) => void;
  /** Unread message count for the Messages tab badge */
  messageCount?: number;
};

/**
 * Bottom tab bar: 64px, themed surface, subtle top border.
 */
export function BottomTabBar({ activeTab, onTabPress, messageCount = 0 }: BottomTabBarProps) {
  const { colors } = useTheme();
  const tabsWithBadge = useMemo(
    () =>
      TABS.map((tab) =>
        tab.id === "messages" && messageCount > 0
          ? { ...tab, badge: messageCount }
          : tab
      ),
    [messageCount]
  );
  const s = useMemo(
    () =>
      StyleSheet.create({
        container: {
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderTopColor: colors.border
        },
        bar: {
          height: BAR_HEIGHT,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-around",
          paddingHorizontal: 8
        },
        tab: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          minWidth: 0
        },
        pressed: { opacity: 0.8 },
        iconRow: {
          height: ICON_ROW_HEIGHT,
          alignItems: "center",
          justifyContent: "center"
        },
        iconWrap: {
          width: 32,
          height: 32,
          alignItems: "center",
          justifyContent: "center"
        },
        labelSpacer: { height: LABEL_GAP },
        label: {
          fontSize: 11,
          fontWeight: "500",
          color: colors.textSecondary
        },
        labelActive: {
          color: colors.primary,
          fontWeight: "600"
        },
        createBtnOuter: {
          width: CREATE_BTN_SIZE + 10,
          height: CREATE_BTN_SIZE + 10,
          borderRadius: (CREATE_BTN_SIZE + 10) / 2,
          backgroundColor: colors.surface,
          alignItems: "center",
          justifyContent: "center",
          marginTop: -14,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.1,
          shadowRadius: 10,
          elevation: 6
        },
        createBtn: {
          width: CREATE_BTN_SIZE,
          height: CREATE_BTN_SIZE,
          borderRadius: CREATE_BTN_SIZE / 2,
          alignItems: "center",
          justifyContent: "center"
        },
        badge: {
          position: "absolute",
          top: -4,
          right: -8,
          minWidth: 16,
          height: 16,
          borderRadius: 8,
          backgroundColor: colors.error,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 4
        },
        badgeText: {
          fontSize: 10,
          fontWeight: "700",
          color: colors.white
        }
      }),
    [colors]
  );

  return (
    <View style={s.container}>
      <View style={s.bar}>
        {tabsWithBadge.map((tab) => {
          const isActive = activeTab === tab.id;
          const isCreate = tab.id === "create";

          if (isCreate) {
            return (
              <Pressable
                key={tab.id}
                style={({ pressed }) => [s.tab, pressed && s.pressed]}
                onPress={() => onTabPress(tab.id)}
              >
                <View style={s.iconRow}>
                  <View style={s.createBtnOuter}>
                    <LinearGradient
                      colors={[colors.primary, colors.accent]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={s.createBtn}
                    >
                      <Ionicons name="add" size={28} color={colors.white} />
                    </LinearGradient>
                  </View>
                </View>
                <View style={s.labelSpacer} />
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
            >
              <View style={s.iconRow}>
                <View style={s.iconWrap}>
                  <Ionicons
                    name={(isActive ? tab.iconActive : tab.icon) as any}
                    size={ICON_SIZE}
                    color={isActive ? colors.primary : colors.textSecondary}
                  />
                  {tab.badge != null && tab.badge > 0 && (
                    <View style={s.badge}>
                      <Text style={s.badgeText}>
                        {tab.badge > 99 ? "99+" : tab.badge}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              <View style={s.labelSpacer} />
              <Text
                style={[s.label, isActive && s.labelActive]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
