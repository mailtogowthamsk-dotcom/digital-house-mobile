import React, { memo, useMemo, useRef } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Swipeable } from "react-native-gesture-handler";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import type { NotificationItem } from "../../api/notifications.api";
import { getImageUrl } from "../../api/client";
import { appAlert } from "../../utils/appAlert";
import {
  formatNotificationCount,
  formatNotificationTime,
  getNotificationPreview,
  getNotificationSummary,
  getNotificationVisual,
  isMatrimonyHighlight,
  isMessageNotificationType
} from "../../features/notifications/notificationPresentation";

export type NotificationListItemProps = {
  item: NotificationItem;
  onPress: () => void;
  onMarkRead: () => void;
  onDelete: () => void;
};

function NotificationListItemInner({ item, onPress, onMarkRead, onDelete }: NotificationListItemProps) {
  const { colors } = useTheme();
  const swipeRef = useRef<Swipeable>(null);

  const unread = !item.isRead;
  const highlight = isMatrimonyHighlight(item);
  const visual = getNotificationVisual(item.type, item.category);
  const avatarUri = item.image ? getImageUrl(item.image) : null;
  const timeLabel = formatNotificationTime(item.createdAt);
  const isMessage = isMessageNotificationType(item.type);
  const summary = getNotificationSummary(item);
  const preview = getNotificationPreview(item);
  const countLabel =
    isMessage && (item.groupCount ?? 1) > 1
      ? formatNotificationCount(item.groupCount)
      : item.groupCount > 1
        ? `${item.groupCount} updates`
        : null;

  const onLongPress = () => {
    appAlert(item.title, undefined, [
      ...(unread
        ? [{ text: "Mark as read", onPress: () => { swipeRef.current?.close(); onMarkRead(); } }]
        : []),
      {
        text: "Delete",
        style: "destructive" as const,
        onPress: () => {
          swipeRef.current?.close();
          onDelete();
        }
      },
      { text: "Cancel", style: "cancel" as const }
    ]);
  };

  const renderRightActions = () => (
    <View style={{ flexDirection: "row" }}>
      {unread ? (
        <Pressable
          onPress={() => {
            swipeRef.current?.close();
            onMarkRead();
          }}
          style={{
            width: 88,
            marginRight: 4,
            borderRadius: radius.lg,
            backgroundColor: colors.primary,
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <Ionicons name="checkmark-done" size={22} color={colors.white} />
          <Text style={{ color: colors.white, fontSize: 11, fontWeight: "700", marginTop: 4 }}>
            Read
          </Text>
        </Pressable>
      ) : null}
      <Pressable
        onPress={() => {
          swipeRef.current?.close();
          onDelete();
        }}
        style={{
          width: 80,
          borderRadius: radius.lg,
          backgroundColor: colors.error,
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <Ionicons name="trash-outline" size={22} color={colors.white} />
        <Text style={{ color: colors.white, fontSize: 11, fontWeight: "700", marginTop: 4 }}>
          Delete
        </Text>
      </Pressable>
    </View>
  );

  const s = useMemo(
    () =>
      StyleSheet.create({
        card: {
          flexDirection: "row",
          alignItems: "flex-start",
          minHeight: 58,
          gap: spacing.sm,
          paddingVertical: 8,
          paddingHorizontal: spacing.md,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
          backgroundColor: unread ? (highlight ? "#7C3AED10" : colors.primary + "08") : colors.surface,
          borderLeftWidth: 2,
          borderLeftColor: unread ? (highlight ? "#7C3AED" : colors.primary) : "transparent"
        },
        pressed: { backgroundColor: colors.surfaceElevated },
        avatarWrap: { position: "relative" },
        avatar: { width: 38, height: 38, borderRadius: 19 },
        iconBadge: {
          position: "absolute",
          right: -2,
          bottom: -2,
          width: 22,
          height: 22,
          borderRadius: 11,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 2,
          borderColor: colors.surface,
          backgroundColor: visual.accent
        },
        content: { flex: 1, minWidth: 0 },
        title: {
          fontSize: 14,
          lineHeight: 19,
          color: colors.text,
          fontWeight: unread ? "800" : "600"
        },
        body: {
          marginTop: 2,
          fontSize: 12,
          lineHeight: 17,
          color: colors.textSecondary
        },
        preview: {
          marginTop: 2,
          fontSize: 12,
          lineHeight: 17,
          color: colors.textMuted,
          fontWeight: "500"
        },
        meta: {
          alignItems: "flex-end",
          maxWidth: "28%",
          gap: 4
        },
        time: { fontSize: 11, fontWeight: "600", textAlign: "right", color: colors.textMuted },
        groupPill: {
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: radius.full,
          backgroundColor: visual.accentSoft
        },
        groupText: { fontSize: 10, fontWeight: "700", color: visual.accent, textAlign: "center" },
        countBadge: {
          minWidth: 22,
          height: 22,
          paddingHorizontal: 6,
          borderRadius: 11,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: visual.accent
        },
        countBadgeText: {
          fontSize: 11,
          fontWeight: "800",
          color: "#fff"
        },
        iconCircle: {
          width: 38,
          height: 38,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: visual.accentSoft
        }
      }),
    [colors, highlight, unread, visual]
  );

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={renderRightActions}
      overshootRight={false}
      friction={2}
    >
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityHint={unread ? "Unread notification" : undefined}
        onLongPress={onLongPress}
        style={({ pressed }) => [s.card, pressed && s.pressed]}
      >
        <View style={s.avatarWrap}>
          {avatarUri ? (
            <Image
              source={{ uri: avatarUri }}
              style={s.avatar}
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey={avatarUri}
            />
          ) : (
            <View style={s.iconCircle}>
              <Ionicons name={visual.icon as any} size={22} color={visual.accent} />
            </View>
          )}
          {avatarUri ? (
            <View style={s.iconBadge}>
              <Ionicons name={visual.icon as any} size={11} color="#fff" />
            </View>
          ) : null}
        </View>
        <View style={s.content}>
          <Text style={s.title} numberOfLines={2}>
            {item.title}
          </Text>
          {summary ? (
            <Text style={s.body} numberOfLines={2}>
              {summary}
            </Text>
          ) : null}
          {preview && isMessage ? (
            <Text style={s.preview} numberOfLines={1}>
              {preview}
            </Text>
          ) : null}
        </View>
        <View style={s.meta}>
          <Text style={s.time}>{timeLabel}</Text>
          {countLabel && !isMessage ? (
            <View style={s.groupPill}>
              <Text style={s.groupText}>{countLabel}</Text>
            </View>
          ) : null}
          {countLabel && isMessage ? (
            <View style={s.countBadge}>
              <Text style={s.countBadgeText}>{countLabel}</Text>
            </View>
          ) : null}
        </View>
      </Pressable>
    </Swipeable>
  );
}

export const NotificationListItem = memo(NotificationListItemInner);
