import React, { useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Shimmer } from "../ui/Shimmer";
import { useTheme } from "../../theme/ThemeContext";
import type { HighlightsResponse, HighlightItem } from "../../api/home.api";

export function hasHighlightsData(highlights: HighlightsResponse | null | undefined): boolean {
  if (!highlights) return false;
  return (
    (highlights.pinnedAnnouncements?.length ?? 0) > 0 ||
    (highlights.upcomingMeetups?.length ?? 0) > 0 ||
    (highlights.urgentHelpRequests?.length ?? 0) > 0
  );
}

const CARD_RADIUS = 12;
const CARD_PADDING = 14;

type HighlightSectionProps = {
  highlights: HighlightsResponse | null;
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  onItemPress?: (item: HighlightItem) => void;
};

export function HighlightSection({
  highlights,
  loading = false,
  error = null,
  onRetry,
  onItemPress
}: HighlightSectionProps) {
  const { colors } = useTheme();
  const s = useMemo(
    () =>
      StyleSheet.create({
        section: { marginBottom: 24 },
        sectionTitle: {
          fontSize: 17,
          fontWeight: "600",
          color: colors.text,
          marginBottom: 12
        },
        horizontalList: {
          flexDirection: "row",
          gap: 12,
          paddingRight: 16
        },
        card: {
          width: 200,
          backgroundColor: colors.surface,
          borderRadius: CARD_RADIUS,
          padding: CARD_PADDING,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 2
        },
        cardPressed: { opacity: 0.95 },
        badge: {
          flexDirection: "row",
          alignItems: "center",
          alignSelf: "flex-start",
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 8,
          gap: 4,
          marginBottom: 8
        },
        badgeText: { fontSize: 11, fontWeight: "600" },
        title: {
          fontSize: 15,
          fontWeight: "600",
          color: colors.text,
          marginBottom: 4
        },
        desc: {
          fontSize: 13,
          color: colors.textSecondary,
          lineHeight: 18
        },
        skeletonCard: {
          width: 200,
          height: 120,
          borderRadius: CARD_RADIUS,
          overflow: "hidden"
        },
        stateCard: {
          paddingVertical: 20,
          paddingHorizontal: 16,
          backgroundColor: colors.surface,
          borderRadius: CARD_RADIUS,
          alignItems: "center",
          gap: 10
        },
        stateText: { fontSize: 14, color: colors.textSecondary, textAlign: "center" },
        retryBtn: {
          paddingHorizontal: 16,
          paddingVertical: 8,
          backgroundColor: colors.primary,
          borderRadius: 8
        },
        retryText: { fontSize: 14, fontWeight: "600", color: colors.white }
      }),
    [colors]
  );

  if (loading) {
    return (
      <View style={s.section}>
        <Text style={s.sectionTitle}>Highlights</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.horizontalList}>
          <View style={s.skeletonCard}>
            <Shimmer width={200} height={120} borderRadius={CARD_RADIUS} />
          </View>
          <View style={s.skeletonCard}>
            <Shimmer width={200} height={120} borderRadius={CARD_RADIUS} />
          </View>
        </ScrollView>
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.section}>
        <Text style={s.sectionTitle}>Highlights</Text>
        <View style={s.stateCard}>
          <Ionicons name="cloud-offline-outline" size={28} color={colors.textSecondary} />
          <Text style={s.stateText}>Could not load highlights</Text>
          {onRetry ? (
            <Pressable style={s.retryBtn} onPress={onRetry}>
              <Text style={s.retryText}>Retry</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  if (!hasHighlightsData(highlights)) {
    return null;
  }

  const hasPinned = highlights!.pinnedAnnouncements?.length;
  const hasMeetups = highlights!.upcomingMeetups?.length;
  const hasUrgent = highlights!.urgentHelpRequests?.length;

  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Highlights</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.horizontalList}>
        {hasPinned
          ? highlights!.pinnedAnnouncements.map((item, index) => (
              <HighlightCard
                key={`pinned-${item.postId}-${index}`}
                item={item}
                label="Pinned"
                icon="pin"
                color={colors.primary}
                onPress={() => onItemPress?.(item)}
                styles={s}
              />
            ))
          : null}
        {hasMeetups
          ? highlights!.upcomingMeetups.map((item, index) => (
              <HighlightCard
                key={`meetup-${item.postId}-${index}`}
                item={item}
                label="Meetup"
                icon="calendar"
                color={colors.primary}
                onPress={() => onItemPress?.(item)}
                styles={s}
              />
            ))
          : null}
        {hasUrgent
          ? highlights!.urgentHelpRequests.map((item, index) => (
              <HighlightCard
                key={`urgent-${item.postId}-${index}`}
                item={item}
                label="Urgent"
                icon="alert-circle"
                color={colors.accent}
                onPress={() => onItemPress?.(item)}
                styles={s}
              />
            ))
          : null}
      </ScrollView>
    </View>
  );
}

function HighlightCard({
  item,
  label,
  icon,
  color,
  onPress,
  styles
}: {
  item: HighlightItem;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress?: () => void;
  styles: ReturnType<typeof StyleSheet.create>;
}) {
  return (
    <Pressable style={({ pressed }) => [styles.card, pressed ? styles.cardPressed : null]} onPress={onPress}>
      <View style={[styles.badge, { backgroundColor: color + "20" }]}>
        <Ionicons name={icon} size={14} color={color} />
        <Text style={[styles.badgeText, { color }]}>{label}</Text>
      </View>
      <Text style={styles.title} numberOfLines={2}>
        {item.title}
      </Text>
      {item.description ? (
        <Text style={styles.desc} numberOfLines={2}>
          {item.description}
        </Text>
      ) : null}
    </Pressable>
  );
}
