import React, { memo, useMemo, useRef } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Image,
  Animated,
  Alert
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import type { NotificationItem } from "../../api/notifications.api";
import { getImageUrl } from "../../api/client";
import {
  formatNotificationTime,
  getNotificationVisual,
  isMatrimonyHighlight
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
  const pressScale = useRef(new Animated.Value(1)).current;

  const unread = !item.isRead;
  const highlight = isMatrimonyHighlight(item);
  const visual = getNotificationVisual(item.type, item.category);
  const avatarUri = item.image ? getImageUrl(item.image) : null;
  const timeLabel = formatNotificationTime(item.createdAt);

  const onLongPress = () => {
    Alert.alert(item.title, undefined, [
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
    <View style={{ flexDirection: "row", marginBottom: spacing.sm }}>
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
        outer: {
          marginHorizontal: spacing.lg,
          marginBottom: spacing.sm
        },
        card: {
          flexDirection: "row",
          alignItems: "flex-start",
          gap: spacing.md,
          padding: spacing.md,
          borderRadius: radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: highlight ? "rgba(124, 58, 237, 0.35)" : colors.border,
          backgroundColor: unread
            ? highlight
              ? "rgba(124, 58, 237, 0.06)"
              : colors.surface
            : colors.surface,
          borderLeftWidth: highlight ? 3 : StyleSheet.hairlineWidth,
          borderLeftColor: highlight ? "#7C3AED" : colors.border
        },
        unreadWash: {
          ...StyleSheet.absoluteFillObject,
          borderRadius: radius.lg,
          backgroundColor: unread ? "rgba(37, 99, 235, 0.04)" : "transparent"
        },
        avatarWrap: { position: "relative" },
        avatar: { width: 48, height: 48, borderRadius: 24 },
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
          fontSize: 15,
          lineHeight: 20,
          color: colors.text,
          fontWeight: unread ? "800" : "600"
        },
        body: {
          marginTop: 4,
          fontSize: 13,
          lineHeight: 18,
          color: colors.textSecondary
        },
        meta: {
          marginTop: 8,
          flexDirection: "row",
          alignItems: "center",
          gap: 8
        },
        time: { fontSize: 12, fontWeight: "600", color: colors.textMuted },
        groupPill: {
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: radius.full,
          backgroundColor: visual.accentSoft
        },
        groupText: { fontSize: 10, fontWeight: "700", color: visual.accent },
        dot: {
          width: 9,
          height: 9,
          borderRadius: 5,
          backgroundColor: colors.primary,
          marginTop: 6
        },
        iconCircle: {
          width: 48,
          height: 48,
          borderRadius: 24,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: visual.accentSoft
        }
      }),
    [colors, highlight, unread, visual]
  );

  return (
    <View style={s.outer}>
      <Swipeable
        ref={swipeRef}
        renderRightActions={renderRightActions}
        overshootRight={false}
        friction={2}
      >
        <Pressable
          onPress={onPress}
          onLongPress={onLongPress}
          onPressIn={() =>
            Animated.spring(pressScale, { toValue: 0.98, useNativeDriver: true, speed: 80 }).start()
          }
          onPressOut={() =>
            Animated.spring(pressScale, { toValue: 1, useNativeDriver: true, speed: 80 }).start()
          }
        >
          <Animated.View style={[s.card, { transform: [{ scale: pressScale }] }]}>
            <View style={s.unreadWash} pointerEvents="none" />
            <View style={s.avatarWrap}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={s.avatar} />
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
              {item.body ? (
                <Text style={s.body} numberOfLines={2}>
                  {item.body}
                </Text>
              ) : null}
              <View style={s.meta}>
                <Text style={s.time}>{timeLabel}</Text>
                {item.groupCount > 1 ? (
                  <View style={s.groupPill}>
                    <Text style={s.groupText}>{item.groupCount} updates</Text>
                  </View>
                ) : null}
              </View>
            </View>
            {unread ? <View style={s.dot} /> : null}
          </Animated.View>
        </Pressable>
      </Swipeable>
    </View>
  );
}

export const NotificationListItem = memo(NotificationListItemInner);
