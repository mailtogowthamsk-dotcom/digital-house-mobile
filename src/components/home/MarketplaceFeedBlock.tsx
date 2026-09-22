import React, { memo, useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import {
  formatMarketplacePrice,
  formatMarketplaceCategory,
  formatMarketplaceCondition
} from "../../constants/marketplace";

export type MarketplaceCardFields = {
  title: string;
  description?: string | null;
  marketplaceIntent?: string | null;
  marketplaceCategory?: string | null;
  marketplaceCondition?: string | null;
  marketplacePrice?: number | null;
  marketplaceNegotiable?: boolean;
  marketplaceDistrict?: string | null;
  timeAgo?: string;
};

type Props = {
  listing: MarketplaceCardFields;
  onViewListing?: () => void;
  compact?: boolean;
};

function Chip({ label }: { label: string }) {
  const { colors, mode } = useTheme();
  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: mode === "dark" ? colors.surfaceElevated : "#F1F5F9" }
      ]}
    >
      <Text style={[styles.chipText, { color: colors.textSecondary }]} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
}

function MarketplaceFeedBlockInner({ listing, onViewListing, compact }: Props) {
  const { colors, mode } = useTheme();
  const price = formatMarketplacePrice(
    listing.marketplaceIntent,
    listing.marketplacePrice,
    listing.marketplaceNegotiable
  );
  const category = formatMarketplaceCategory(listing.marketplaceCategory);
  const condition = formatMarketplaceCondition(listing.marketplaceCondition);

  const s = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          paddingHorizontal: spacing.md,
          paddingTop: spacing.sm,
          paddingBottom: spacing.sm,
          gap: 6
        },
        title: { fontSize: 16, fontWeight: "800", color: colors.text, lineHeight: 21 },
        price: { fontSize: 15, fontWeight: "800", color: colors.primary },
        metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
        metaText: { fontSize: 12, color: colors.textMuted, flex: 1 },
        chips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
        desc: { fontSize: 13, lineHeight: 18, color: colors.textSecondary },
        actions: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 4
        },
        viewBtn: {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          backgroundColor: colors.primary,
          paddingHorizontal: 12,
          paddingVertical: 7,
          borderRadius: radius.md
        },
        viewBtnText: { fontSize: 12, fontWeight: "700", color: "#fff" },
        posted: { fontSize: 11, color: colors.textMuted }
      }),
    [colors, mode]
  );

  return (
    <View style={s.wrap}>
      <Text style={s.title} numberOfLines={2}>
        {listing.title}
      </Text>
      {price ? <Text style={s.price}>{price}</Text> : null}
      {listing.marketplaceDistrict ? (
        <View style={s.metaRow}>
          <Ionicons name="location-outline" size={13} color={colors.textMuted} />
          <Text style={s.metaText} numberOfLines={1}>
            {listing.marketplaceDistrict}
          </Text>
        </View>
      ) : null}
      <View style={s.chips}>
        {category ? <Chip label={category} /> : null}
        {condition ? <Chip label={condition} /> : null}
      </View>
      {listing.description && !compact ? (
        <Text style={s.desc} numberOfLines={2}>
          {listing.description}
        </Text>
      ) : null}
      <View style={s.actions}>
        <View style={{ flex: 1 }}>
          {listing.timeAgo ? <Text style={s.posted}>Posted {listing.timeAgo}</Text> : null}
        </View>
        {onViewListing ? (
          <Pressable
            onPress={onViewListing}
            style={({ pressed }) => [s.viewBtn, pressed && { opacity: 0.88 }]}
            accessibilityRole="button"
            accessibilityLabel="View listing"
          >
            <Text style={s.viewBtnText}>View Listing</Text>
            <Ionicons name="arrow-forward" size={14} color="#fff" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

export const MarketplaceFeedBlock = memo(MarketplaceFeedBlockInner);

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999
  },
  chipText: { fontSize: 11, fontWeight: "600" }
});
