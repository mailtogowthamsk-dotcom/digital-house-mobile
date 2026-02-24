import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable, useWindowDimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme, type ThemeColors } from "../../theme/ThemeContext";

const GAP = 12;
const HORIZONTAL_PADDING = 16;
const CARD_RADIUS = 15;
const CARD_PADDING = 12;
const ICON_BOX_SIZE = 48;
const ICON_SIZE = 28;
const LABEL_FONT_SIZE = 12;
const ICON_LABEL_GAP = 8;

export type QuickActionItem = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  badgeCount?: number;
  isPrimary?: boolean;
};

const DEFAULT_ACTIONS: QuickActionItem[] = [
  { id: "posts", label: "Posts", icon: "megaphone-outline" },
  { id: "jobs", label: "Jobs", icon: "briefcase-outline" },
  { id: "marketplace", label: "Marketplace", icon: "cart-outline" },
  { id: "matrimony", label: "Matrimony", icon: "heart-outline" },
  { id: "helping-hand", label: "Helping Hand", icon: "hand-left-outline" },
  { id: "community", label: "Community Updates", icon: "newspaper-outline" },
  { id: "messages", label: "Messages", icon: "chatbubble-outline", badgeCount: 2 },
  { id: "create", label: "Create Post", icon: "add", isPrimary: true }
];

type QuickActionGridProps = {
  items?: QuickActionItem[];
  onItemPress?: (item: QuickActionItem) => void;
};

export function QuickActionGrid({ items = DEFAULT_ACTIONS, onItemPress }: QuickActionGridProps) {
  const { width } = useWindowDimensions();
  const { colors } = useTheme();
  const contentWidth = width - HORIZONTAL_PADDING * 2;
  const cellWidth = (contentWidth - GAP * 3) / 4;

  const s = useMemo(
    () =>
      StyleSheet.create({
        grid: { flexDirection: "row", flexWrap: "wrap", gap: GAP },
        cell: {
          backgroundColor: colors.surface,
          borderRadius: CARD_RADIUS,
          padding: CARD_PADDING,
          minHeight: 92,
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 2
        },
        cellPrimary: { overflow: "hidden" },
        cellInner: {
          flex: 1,
          width: "100%",
          minHeight: 92,
          borderRadius: CARD_RADIUS,
          padding: CARD_PADDING,
          alignItems: "center",
          justifyContent: "center"
        },
        cellPressed: { opacity: 0.92 },
        iconBox: {
          width: ICON_BOX_SIZE,
          height: ICON_BOX_SIZE,
          borderRadius: 12,
          backgroundColor: colors.surfaceElevated,
          alignItems: "center",
          justifyContent: "center"
        },
        iconBoxPrimary: { backgroundColor: "transparent" },
        labelGap: { height: ICON_LABEL_GAP },
        badge: {
          position: "absolute",
          top: -2,
          right: -2,
          minWidth: 18,
          height: 18,
          borderRadius: 9,
          backgroundColor: colors.error,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 4
        },
        badgeText: {
          fontSize: 10,
          fontWeight: "700",
          color: colors.white
        },
        label: {
          fontSize: LABEL_FONT_SIZE,
          fontWeight: "500",
          color: colors.textSecondary,
          textAlign: "center"
        },
        labelPrimary: {
          fontSize: LABEL_FONT_SIZE,
          fontWeight: "600",
          color: colors.white,
          textAlign: "center"
        }
      }),
    [colors]
  );

  return (
    <View style={s.grid}>
      {items.map((item) => (
        <QuickActionCell
          key={item.id}
          item={item}
          cellWidth={cellWidth}
          styles={s}
          colors={colors}
          onPress={() => onItemPress?.(item)}
        />
      ))}
    </View>
  );
}

function QuickActionCell({
  item,
  cellWidth,
  styles: s,
  colors,
  onPress
}: {
  item: QuickActionItem;
  cellWidth: number;
  styles: ReturnType<typeof StyleSheet.create>;
  colors: ThemeColors;
  onPress: () => void;
}) {
  const isPrimary = item.isPrimary === true;
  const iconColor =
    item.id === "marketplace" || item.id === "matrimony" ? colors.accent : colors.primary;

  if (isPrimary) {
    return (
      <Pressable
        style={({ pressed }) => [
          s.cell,
          s.cellPrimary,
          { width: cellWidth },
          pressed && s.cellPressed
        ]}
        onPress={onPress}
      >
        <LinearGradient
          colors={[colors.primary, colors.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={s.cellInner}
        >
          <View style={[s.iconBox, s.iconBoxPrimary]}>
            <Ionicons name="add" size={32} color={colors.white} />
          </View>
          <View style={s.labelGap} />
          <Text style={s.labelPrimary} numberOfLines={2}>
            {item.label}
          </Text>
        </LinearGradient>
      </Pressable>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => [s.cell, { width: cellWidth }, pressed && s.cellPressed]}
      onPress={onPress}
    >
      <View style={s.iconBox}>
        <Ionicons name={item.icon as any} size={ICON_SIZE} color={iconColor} />
        {item.badgeCount != null && item.badgeCount > 0 && (
          <View style={s.badge}>
            <Text style={s.badgeText}>
              {item.badgeCount > 99 ? "99+" : item.badgeCount}
            </Text>
          </View>
        )}
      </View>
      <View style={s.labelGap} />
      <Text style={s.label} numberOfLines={2}>
        {item.label}
      </Text>
    </Pressable>
  );
}
