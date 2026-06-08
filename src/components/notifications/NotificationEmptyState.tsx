import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import type { NotificationCategory } from "../../api/notifications.api";

type Props = {
  category: NotificationCategory;
};

function emptyCopy(category: NotificationCategory): { title: string; body: string; icon: string } {
  switch (category) {
    case "MESSAGES":
      return {
        title: "No messages yet",
        body: "When someone messages you, it will show up here.",
        icon: "chatbubbles-outline"
      };
    case "MATRIMONY":
      return {
        title: "No matrimony updates",
        body: "Interests, matches, and profile news will appear here.",
        icon: "heart-outline"
      };
    case "SOCIAL":
      return {
        title: "No social activity",
        body: "Likes, comments, and mentions will land here.",
        icon: "people-outline"
      };
    case "COMMUNITY":
      return {
        title: "No community news",
        body: "Announcements and events from Digital House show here.",
        icon: "megaphone-outline"
      };
    case "SYSTEM":
      return {
        title: "No system notices",
        body: "Account and platform updates appear in this tab.",
        icon: "shield-outline"
      };
    default:
      return {
        title: "You're all caught up",
        body: "No new notifications right now. Check back later for updates.",
        icon: "sparkles-outline"
      };
  }
}

export function NotificationEmptyState({ category }: Props) {
  const { colors } = useTheme();
  const copy = emptyCopy(category);

  const s = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          alignItems: "center",
          paddingHorizontal: spacing.xxl,
          paddingTop: 56,
          paddingBottom: spacing.xxxl
        },
        ring: {
          width: 96,
          height: 96,
          borderRadius: 48,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.surfaceElevated,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          marginBottom: spacing.lg
        },
        title: {
          fontSize: 20,
          fontWeight: "800",
          color: colors.text,
          textAlign: "center",
          letterSpacing: -0.2
        },
        body: {
          marginTop: spacing.sm,
          fontSize: 15,
          lineHeight: 22,
          color: colors.textSecondary,
          textAlign: "center"
        }
      }),
    [colors]
  );

  return (
    <View style={s.wrap}>
      <View style={s.ring}>
        <Ionicons name={copy.icon as any} size={40} color={colors.primary} />
      </View>
      <Text style={s.title}>{copy.title}</Text>
      <Text style={s.body}>{copy.body}</Text>
    </View>
  );
}
