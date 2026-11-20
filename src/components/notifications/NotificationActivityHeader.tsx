import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { spacing } from "../../theme/spacing";
import { HeaderBackButton } from "../ui/HeaderBackButton";

type Props = {
  unreadTotal: number;
  onBack: () => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
  onSettings: () => void;
  canMarkAll: boolean;
  canClearAll: boolean;
};

export function NotificationActivityHeader({
  unreadTotal,
  onBack,
  onMarkAllRead,
  onClearAll,
  onSettings,
  canMarkAll,
  canClearAll
}: Props) {
  const { colors } = useTheme();
  return (
    <View style={[styles.bar, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
      <HeaderBackButton onPress={onBack} />
      <View style={styles.heading}>
        <Text style={[styles.title, { color: colors.text }]} accessibilityRole="header">Activity</Text>
        {unreadTotal > 0 ? (
          <Text
            style={[styles.unread, { color: colors.primary, backgroundColor: colors.primary + "14" }]}
            accessibilityLabel={`${unreadTotal} unread notifications`}
          >
            {unreadTotal > 99 ? "99+" : unreadTotal} unread
          </Text>
        ) : null}
      </View>
      <Pressable
        style={({ pressed }) => [styles.iconButton, pressed && { backgroundColor: colors.surfaceElevated }]}
        onPress={onSettings}
        accessibilityRole="button"
        accessibilityLabel="Notification settings"
      >
        <Ionicons name="settings-outline" size={21} color={colors.textSecondary} />
      </Pressable>
      {canMarkAll ? (
        <Pressable
          style={({ pressed }) => [styles.iconButton, pressed && { backgroundColor: colors.surfaceElevated }]}
          onPress={onMarkAllRead}
          accessibilityRole="button"
          accessibilityLabel="Mark all as read"
        >
          <Ionicons name="checkmark-done-outline" size={21} color={colors.primary} />
        </Pressable>
      ) : null}
      {canClearAll ? (
        <Pressable
          style={({ pressed }) => [styles.clearButton, pressed && { backgroundColor: colors.surfaceElevated }]}
          onPress={onClearAll}
          accessibilityRole="button"
          accessibilityLabel="Clear all notifications"
        >
          <Text style={[styles.clearLabel, { color: colors.error }]}>Clear all</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  heading: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4
  },
  title: { fontSize: 17, fontWeight: "700" },
  unread: {
    fontSize: 11,
    fontWeight: "700",
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    overflow: "hidden"
  },
  iconButton: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  clearButton: {
    minHeight: 44,
    paddingHorizontal: spacing.xs,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  clearLabel: { fontSize: 12, fontWeight: "700" }
});
