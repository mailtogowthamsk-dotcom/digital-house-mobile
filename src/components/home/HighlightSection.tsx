import React from "react";
import { View, Text, StyleSheet, ScrollView, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { messages } from "../../theme/messages";
import type { HighlightsResponse, HighlightItem } from "../../api/home.api";

const TEXT_PRIMARY = "#111827";
const TEXT_SECONDARY = "#6B7280";
const BLUE = "#2563EB";
const ORANGE = "#F97316";
const CARD_RADIUS = 12;
const CARD_PADDING = 14;

type HighlightSectionProps = {
  highlights: HighlightsResponse | null;
  loading?: boolean;
  error?: Error | null;
  onRetry?: () => void;
  onItemPress?: (item: HighlightItem) => void;
};

/**
 * Displays pinned announcements, upcoming meetups, and urgent help requests.
 * Compact cards in vertical list; graceful empty state per subsection.
 */
export function HighlightSection({
  highlights,
  loading = false,
  error = null,
  onRetry,
  onItemPress
}: HighlightSectionProps) {
  if (error) {
    return (
      <View style={s.section}>
        <Text style={s.sectionTitle}>Highlights</Text>
        <View style={s.errorCard}>
          <Ionicons name="alert-circle-outline" size={32} color={TEXT_SECONDARY} />
          <Text style={s.errorText}>Could not load highlights</Text>
          {onRetry && (
            <Pressable style={s.retryBtn} onPress={onRetry}>
              <Text style={s.retryText}>Retry</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  if (loading && !highlights) {
    return (
      <View style={s.section}>
        <Text style={s.sectionTitle}>Highlights</Text>
        <View style={s.skeletonCard} />
        <View style={s.skeletonCard} />
      </View>
    );
  }

  const hasPinned = highlights?.pinnedAnnouncements?.length;
  const hasMeetups = highlights?.upcomingMeetups?.length;
  const hasUrgent = highlights?.urgentHelpRequests?.length;
  const hasAny = hasPinned || hasMeetups || hasUrgent;

  if (!hasAny) {
    return (
      <View style={s.section}>
        <Text style={s.sectionTitle}>Highlights</Text>
        <View style={s.emptyCard}>
          <Ionicons name="star-outline" size={28} color={TEXT_SECONDARY} />
          <Text style={s.emptyText}>{messages.empty.highlights}</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>Highlights</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.horizontalList}>
        {hasPinned &&
          highlights!.pinnedAnnouncements.map((item) => (
            <HighlightCard
              key={`pinned-${item.postId}`}
              item={item}
              label="Pinned"
              icon="pin"
              color={BLUE}
              onPress={() => onItemPress?.(item)}
            />
          ))}
        {hasMeetups &&
          highlights!.upcomingMeetups.map((item) => (
            <HighlightCard
              key={`meetup-${item.postId}`}
              item={item}
              label="Meetup"
              icon="calendar"
              color={BLUE}
              onPress={() => onItemPress?.(item)}
            />
          ))}
        {hasUrgent &&
          highlights!.urgentHelpRequests.map((item) => (
            <HighlightCard
              key={`urgent-${item.postId}`}
              item={item}
              label="Urgent"
              icon="alert-circle"
              color={ORANGE}
              onPress={() => onItemPress?.(item)}
            />
          ))}
      </ScrollView>
    </View>
  );
}

function HighlightCard({
  item,
  label,
  icon,
  color,
  onPress
}: {
  item: HighlightItem;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress?: () => void;
}) {
  return (
    <Pressable style={({ pressed }) => [s.card, pressed && s.cardPressed]} onPress={onPress}>
      <View style={[s.badge, { backgroundColor: color + "20" }]}>
        <Ionicons name={icon} size={14} color={color} />
        <Text style={[s.badgeText, { color }]}>{label}</Text>
      </View>
      <Text style={s.title} numberOfLines={2}>
        {item.title}
      </Text>
      {item.description ? (
        <Text style={s.desc} numberOfLines={2}>
          {item.description}
        </Text>
      ) : null}
    </Pressable>
  );
}

const s = StyleSheet.create({
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: TEXT_PRIMARY,
    marginBottom: 12
  },
  horizontalList: {
    flexDirection: "row",
    gap: 12,
    paddingRight: 16
  },
  card: {
    width: 200,
    backgroundColor: "#FFFFFF",
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
  title: { fontSize: 15, fontWeight: "600", color: TEXT_PRIMARY, marginBottom: 4 },
  desc: { fontSize: 13, color: TEXT_SECONDARY, lineHeight: 18 },
  errorCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: CARD_RADIUS,
    padding: 24,
    alignItems: "center",
    gap: 8
  },
  errorText: { fontSize: 14, color: TEXT_SECONDARY },
  retryBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: BLUE,
    borderRadius: 8
  },
  retryText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },
  skeletonCard: {
    height: 80,
    backgroundColor: "#F3F4F6",
    borderRadius: CARD_RADIUS,
    marginBottom: 10
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: CARD_RADIUS,
    padding: 24,
    alignItems: "center",
    gap: 8
  },
  emptyText: { fontSize: 14, color: TEXT_SECONDARY }
});
