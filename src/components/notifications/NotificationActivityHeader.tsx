import React, { useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";

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

  const s = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.md,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border
        },
        row: { flexDirection: "row", alignItems: "center" },
        back: {
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.surfaceElevated
        },
        center: { flex: 1, marginHorizontal: spacing.md },
        title: { fontSize: 22, fontWeight: "800", letterSpacing: -0.3, color: colors.text },
        subtitle: { marginTop: 2, fontSize: 13, color: colors.textSecondary, fontWeight: "500" },
        badge: {
          marginTop: 6,
          alignSelf: "flex-start",
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: radius.full,
          backgroundColor: unreadTotal > 0 ? "rgba(37, 99, 235, 0.12)" : colors.surfaceElevated
        },
        badgeText: {
          fontSize: 12,
          fontWeight: "700",
          color: unreadTotal > 0 ? colors.primary : colors.textMuted
        },
        actions: { flexDirection: "row", alignItems: "center", gap: 4 },
        iconBtn: {
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: "center",
          justifyContent: "center"
        },
        markAll: {
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: radius.full,
          backgroundColor: colors.surfaceElevated
        },
        markAllText: {
          fontSize: 13,
          fontWeight: "700",
          color: colors.primary
        },
        clearAll: {
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: radius.full,
          backgroundColor: "rgba(225, 29, 72, 0.1)"
        },
        clearAllText: {
          fontSize: 13,
          fontWeight: "700",
          color: "#E11D48"
        },
        actionRow: {
          marginTop: spacing.sm,
          flexDirection: "row",
          justifyContent: "flex-end",
          gap: 8
        }
      }),
    [colors, unreadTotal]
  );

  return (
    <View style={s.wrap}>
      <View style={s.row}>
        <Pressable style={s.back} onPress={onBack} accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <View style={s.center}>
          <Text style={s.title}>Activity</Text>
          <Text style={s.subtitle}>Your notification center</Text>
          <View style={s.badge}>
            <Ionicons
              name={unreadTotal > 0 ? "notifications" : "notifications-outline"}
              size={14}
              color={unreadTotal > 0 ? colors.primary : colors.textMuted}
            />
            <Text style={s.badgeText}>
              {unreadTotal > 0
                ? `${unreadTotal > 99 ? "99+" : unreadTotal} unread`
                : "All caught up"}
            </Text>
          </View>
        </View>
        <View style={s.actions}>
          <Pressable
            style={s.iconBtn}
            onPress={onSettings}
            accessibilityLabel="Notification settings"
          >
            <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>
      </View>
      {canMarkAll || canClearAll ? (
        <View style={s.actionRow}>
          {canMarkAll ? (
            <Pressable style={s.markAll} onPress={onMarkAllRead} accessibilityLabel="Mark all as read">
              <Text style={s.markAllText}>Mark all as read</Text>
            </Pressable>
          ) : null}
          {canClearAll ? (
            <Pressable style={s.clearAll} onPress={onClearAll} accessibilityLabel="Clear all notifications">
              <Text style={s.clearAllText}>Clear all</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}
