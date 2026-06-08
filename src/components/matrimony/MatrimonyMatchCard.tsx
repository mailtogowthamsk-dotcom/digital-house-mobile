import React from "react";
import { View, Text, Image, Pressable, StyleSheet } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { MatrimonyChipRow } from "./MatrimonyChip";
import { getImageUrl } from "../../api/client";
import type { DiscoverCard } from "../../api/matrimony.api";

type Props = {
  item: DiscoverCard;
  chips: string[];
  onPress: () => void;
};

export function MatrimonyMatchCard({ item, chips, onPress }: Props) {
  const { colors } = useTheme();
  const lockedPhoto = item.photoBlurred || item.photoPlaceholder;
  const uri =
    !lockedPhoto && item.photoUrl ? getImageUrl(item.photoUrl) ?? item.photoUrl : null;
  const meta = [item.district, item.occupation].filter(Boolean).join(" · ");
  const footer =
    item.interestSent ? "Interest sent" : item.interestReceived ? "Interest received" : null;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      <View style={styles.top}>
        <View style={styles.photoWrap}>
          {uri ? (
            <Image source={{ uri }} style={styles.photo} />
          ) : (
            <View style={[styles.photo, styles.photoPh, { backgroundColor: colors.border }]}>
              <Text style={{ fontSize: 28 }}>👤</Text>
            </View>
          )}
        </View>
        <View style={styles.body}>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {item.name}
              {item.age != null ? ` · ${item.age} yrs` : ""}
            </Text>
            <View style={[styles.starBadge, item.starLevel === 2 && styles.starPlat]}>
              <Text style={[styles.starText, item.starLevel === 2 && styles.starTextPlat]}>
                {item.starLabel}
              </Text>
            </View>
          </View>
          {meta ? (
            <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
              {meta}
            </Text>
          ) : null}
          {item.education ? (
            <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
              {item.education}
            </Text>
          ) : null}
          <MatrimonyChipRow labels={chips} />
        </View>
      </View>
      <View style={[styles.footer, { borderTopColor: colors.border }]}>
        <Text style={[styles.footerNote, { color: colors.textMuted }]}>
          {item.photoBlurred
            ? item.openRequiresPlan === "PLATINUM"
              ? "Platinum to open"
              : item.canOpen
                ? "Tap to open profile"
                : "Upgrade to open"
            : footer ?? (item.horoscopeAvailable ? "Horoscope on file" : "")}
        </Text>
        <Text style={{ color: colors.primary, fontSize: 12, fontWeight: "700" }}>
          {item.profileOpened ? "View →" : item.canOpen ? "Open →" : "Upgrade"}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2
  },
  top: { flexDirection: "row", padding: spacing.md, gap: spacing.sm },
  photoWrap: { width: 72, height: 88, borderRadius: radius.md, overflow: "hidden" },
  photo: { width: 72, height: 88, borderRadius: radius.md },
  androidBlur: { backgroundColor: "rgba(255,255,255,0.65)" },
  photoPh: { alignItems: "center", justifyContent: "center" },
  body: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  name: { fontSize: 15, fontWeight: "800", flex: 1 },
  starBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12
  },
  starPlat: { backgroundColor: "#EDE9FE" },
  starText: { fontSize: 11, fontWeight: "800", color: "#B45309" },
  starTextPlat: { color: "#5B21B6" },
  meta: { fontSize: 12, marginTop: 2 },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth
  },
  footerNote: { fontSize: 11 }
});
