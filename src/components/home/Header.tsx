import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

const BAR_HEIGHT = 56;
const PADDING_HORIZONTAL = 16;
const TEXT_PRIMARY = "#111827";
const BADGE_RED = "#EF4444";

type HeaderProps = {
  notificationCount?: number;
  messageCount?: number;
  onNotificationPress?: () => void;
  onMessagePress?: () => void;
};

/**
 * Single top app bar: Left = logo, Center = title "Digital House", Right = notification + message icons.
 * flexDirection: row, alignItems: center, justifyContent: space-between.
 * Title centered via flex: 1 center column (no duplicate text, no absolute positioning needed).
 */
export function Header({
  notificationCount = 0,
  messageCount = 0,
  onNotificationPress,
  onMessagePress
}: HeaderProps) {
  return (
    <View style={s.bar}>
      <View style={s.left}>
        <View style={s.logoIconWrap}>
          <Ionicons name="home" size={24} color="#2563EB" />
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
          <Ionicons name="notifications-outline" size={24} color={TEXT_PRIMARY} />
          {notificationCount > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeText}>
                {notificationCount > 99 ? "99+" : notificationCount}
              </Text>
            </View>
          )}
        </Pressable>
        <Pressable
          style={({ pressed }) => [s.iconBtn, pressed && s.iconBtnPressed]}
          onPress={onMessagePress}
          hitSlop={8}
        >
          <Ionicons name="chatbubble-outline" size={22} color={TEXT_PRIMARY} />
          {messageCount > 0 && (
            <View style={s.badge}>
              <Text style={s.badgeText}>
                {messageCount > 99 ? "99+" : messageCount}
              </Text>
            </View>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    height: BAR_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: PADDING_HORIZONTAL,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
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
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center"
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: TEXT_PRIMARY
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    minWidth: 88
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
    backgroundColor: BADGE_RED,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FFFFFF"
  }
});
