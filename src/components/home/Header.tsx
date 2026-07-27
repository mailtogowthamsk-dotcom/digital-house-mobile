/**
 * Premium floating glass header — presentation polish only.
 */

import React, { memo, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Platform, Animated } from "react-native";
import { BlurView } from "expo-blur";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { spacing } from "../../theme/spacing";
import { useNotificationsOptional } from "../../context/NotificationContext";

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
  /** Community label from DB — shown only when present. */
  communityName?: string | null;
  /** Used when NotificationContext is unavailable (e.g. before bootstrap). */
  notificationCountFallback?: number;
  messageCount?: number;
  onNotificationPress?: () => void;
  onMessagePress?: () => void;
  onMenuPress?: () => void;
  /** 0 = fully visible, 1 = hidden (translated up). */
  hideProgress?: Animated.Value;
  topInset?: number;
};

const BAR_HEIGHT = 56;
const SIDE_WIDTH = 96;

function HeaderInner({
  communityName,
  notificationCountFallback = 0,
  onNotificationPress,
  onMenuPress,
  hideProgress,
  topInset = 0
}: HeaderProps) {
  const { colors, mode } = useTheme();
  // Isolate badge updates here so Home FlatList does not re-render on every count tick.
  const notifCtx = useNotificationsOptional();
  const notificationCount = notifCtx?.counts.total ?? notificationCountFallback;
  const travel = BAR_HEIGHT + topInset + 10;
  const community =
    typeof communityName === "string" && communityName.trim()
      ? communityName.trim()
      : null;

  const animStyle = hideProgress
    ? {
        transform: [
          {
            translateY: hideProgress.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -travel]
            })
          }
        ],
        opacity: hideProgress.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 0.12]
        })
      }
    : undefined;

  const s = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 40,
          paddingTop: topInset,
          overflow: "hidden"
        },
        glass: {
          ...StyleSheet.absoluteFillObject
        },
        tint: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: colors.glass,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.glassBorder
        },
        bar: {
          height: BAR_HEIGHT,
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: spacing.md
        },
        side: {
          width: SIDE_WIDTH,
          flexDirection: "row",
          alignItems: "center"
        },
        sideLeft: {
          justifyContent: "flex-start"
        },
        sideRight: {
          justifyContent: "flex-end",
          gap: 4
        },
        center: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: spacing.xs
        },
        logoMark: {
          width: 36,
          height: 36,
          borderRadius: 12,
          backgroundColor: mode === "dark" ? "rgba(37,99,235,0.28)" : "rgba(37,99,235,0.1)",
          alignItems: "center",
          justifyContent: "center",
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: mode === "dark" ? "rgba(37,99,235,0.35)" : "rgba(37,99,235,0.18)"
        },
        title: {
          fontSize: 19,
          fontWeight: "700",
          letterSpacing: -0.45,
          color: colors.text,
          textAlign: "center"
        },
        subtitle: {
          marginTop: 1,
          fontSize: 11,
          fontWeight: "500",
          color: colors.textMuted,
          letterSpacing: 0.2,
          textAlign: "center"
        },
        iconBtn: {
          width: 42,
          height: 42,
          borderRadius: 21,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: mode === "dark" ? "rgba(255,255,255,0.05)" : "rgba(15,23,42,0.03)"
        },
        iconBtnPressed: {
          backgroundColor: mode === "dark" ? "rgba(255,255,255,0.1)" : "rgba(15,23,42,0.07)",
          transform: [{ scale: 0.96 }]
        },
        badge: {
          position: "absolute",
          top: 6,
          right: 6,
          minWidth: 18,
          height: 18,
          borderRadius: 9,
          backgroundColor: colors.error,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 4,
          borderWidth: 2,
          borderColor: mode === "dark" ? colors.surface : "#F3F4F8"
        },
        badgeText: {
          fontSize: 10,
          fontWeight: "700",
          color: colors.white,
          letterSpacing: -0.2
        }
      }),
    [colors, mode, topInset]
  );

  return (
    <Animated.View style={[s.wrap, animStyle]} pointerEvents="box-none">
      <BlurView
        intensity={Platform.OS === "ios" ? 64 : 42}
        tint={mode === "dark" ? "dark" : "light"}
        style={s.glass}
      />
      <View style={s.tint} pointerEvents="none" />
      <View style={s.bar}>
        <View style={[s.side, s.sideLeft]}>
          <View style={s.logoMark}>
            <Ionicons name="home" size={18} color={colors.primary} />
          </View>
        </View>

        <View style={s.center} pointerEvents="none">
          <Text style={s.title} numberOfLines={1}>
            Digital House
          </Text>
          {community ? (
            <Text style={s.subtitle} numberOfLines={1}>
              {community}
            </Text>
          ) : null}
        </View>

        <View style={[s.side, s.sideRight]}>
          <Pressable
            style={({ pressed }) => [s.iconBtn, pressed && s.iconBtnPressed]}
            onPress={onNotificationPress}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={22} color={colors.text} />
            {notificationCount > 0 ? (
              <View style={s.badge}>
                <Text style={s.badgeText}>
                  {notificationCount > 99 ? "99+" : notificationCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
          <Pressable
            style={({ pressed }) => [s.iconBtn, pressed && s.iconBtnPressed]}
            onPress={onMenuPress}
            hitSlop={6}
            accessibilityRole="button"
            accessibilityLabel="Menu"
          >
            <Ionicons name="menu-outline" size={23} color={colors.text} />
          </Pressable>
        </View>
      </View>
    </Animated.View>
  );
}

export const Header = memo(HeaderInner);
export { BAR_HEIGHT as FLOATING_HEADER_HEIGHT };
