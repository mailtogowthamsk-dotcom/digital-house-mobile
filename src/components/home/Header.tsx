import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";

const BAR_HEIGHT = 56;
const PADDING_HORIZONTAL = 16;

export type HeaderActionId =
  | "create"
  | "posts"
  | "jobs"
  | "marketplace"
  | "matrimony"
  | "helping-hand"
  | "prominent-people"
  | "community"
  | "messages"
  | "search-members"
  | "connections"
  | "settings"
  | "help-support";

type HeaderProps = {
  notificationCount?: number;
  messageCount?: number;
  onNotificationPress?: () => void;
  onMessagePress?: () => void;
  onMenuPress?: () => void;
};

export function Header({
  notificationCount = 0,
  messageCount = 0,
  onNotificationPress,
  onMessagePress,
  onMenuPress
}: HeaderProps) {
  const { colors, mode } = useTheme();
  const s = useMemo(
    () =>
      StyleSheet.create({
        bar: {
          height: BAR_HEIGHT,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: PADDING_HORIZONTAL,
          backgroundColor: colors.surface,
          borderBottomWidth: 1,
          borderBottomColor: colors.border,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 6,
          elevation: 2
        },
        left: {
          width: 44,
          alignItems: "flex-start",
          justifyContent: "center"
        },
        logoIconWrap: {
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: mode === "dark" ? "#1E3A5F" : "#EFF6FF",
          alignItems: "center",
          justifyContent: "center"
        },
        center: {
          position: "absolute",
          left: 0,
          right: 0,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 60
        },
        title: {
          fontSize: 18,
          fontWeight: "600",
          color: colors.text
        },
        right: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "flex-end",
          minWidth: 120
        },
        iconBtn: {
          width: 40,
          height: 40,
          alignItems: "center",
          justifyContent: "center"
        },
        iconBtnPressed: { opacity: 0.7 },
        badge: {
          position: "absolute",
          top: 4,
          right: 4,
          minWidth: 18,
          height: 18,
          borderRadius: 9,
          backgroundColor: colors.error,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 4
        },
        badgeText: {
          fontSize: 11,
          fontWeight: "600",
          color: colors.white
        }
      }),
    [colors, mode]
  );

  return (
    <View style={s.bar}>
      <View style={s.left}>
        <View style={s.logoIconWrap}>
          <Ionicons name="home" size={24} color={colors.primary} />
        </View>
      </View>
      <View style={s.center}>
        <Text style={s.title} numberOfLines={1}>
          Digital House
        </Text>
      </View>
      <View style={s.right}>
        <Pressable
          style={({ pressed }) => [s.iconBtn, pressed && s.iconBtnPressed]}
          onPress={onNotificationPress}
          hitSlop={8}
        >
          <Ionicons name="notifications-outline" size={24} color={colors.text} />
          {notificationCount > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeText}>
                {notificationCount > 99 ? "99+" : notificationCount}
              </Text>
            </View>
          )}
        </Pressable>
        {/* <Pressable
          style={({ pressed }) => [s.iconBtn, pressed && s.iconBtnPressed]}
          onPress={onMessagePress}
          hitSlop={8}
        >
          <Ionicons name="chatbubble-outline" size={22} color={colors.text} />
          {messageCount > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeText}>
                {messageCount > 99 ? "99+" : messageCount}
              </Text>
            </View>
          )}
        </Pressable> */}
        <Pressable
          style={({ pressed }) => [s.iconBtn, pressed && s.iconBtnPressed]}
          onPress={onMenuPress}
          hitSlop={8}
        >
          <Ionicons name="ellipsis-vertical" size={22} color={colors.text} />
        </Pressable>
      </View>
    </View>
  );
}
