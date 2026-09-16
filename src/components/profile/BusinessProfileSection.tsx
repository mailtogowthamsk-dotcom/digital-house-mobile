import React, { useCallback, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Linking } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { typography } from "../../theme/typography";
import { spacing, radius } from "../../theme/spacing";
import { AccordionSection } from "./AccordionSection";
import { normalizeAdvertisementUrl } from "../../utils/advertisementUi";
import { telHref } from "../../utils/advertisementCopy";

export type PublicBusinessProfile = {
  businessName?: string | null;
  businessType?: string | null;
  businessDescription?: string | null;
  businessAddress?: string | null;
  businessPhone?: string | null;
  businessWebsite?: string | null;
};

type BusinessProfileSectionProps = {
  business: PublicBusinessProfile | null | undefined;
  /** When false, hide the whole section (e.g. show_business === false). */
  visible?: boolean;
};

function trimValue(v: string | null | undefined): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

export function hasPublicBusinessContent(business: PublicBusinessProfile | null | undefined): boolean {
  if (!business) return false;
  return Boolean(
    trimValue(business.businessName) ||
      trimValue(business.businessType) ||
      trimValue(business.businessDescription) ||
      trimValue(business.businessAddress) ||
      trimValue(business.businessPhone) ||
      trimValue(business.businessWebsite)
  );
}

/**
 * Public Business card — approved + active data only.
 * No pending/rejected/admin remarks.
 */
export function BusinessProfileSection({ business, visible = true }: BusinessProfileSectionProps) {
  const { colors } = useTheme();

  const name = trimValue(business?.businessName);
  const type = trimValue(business?.businessType);
  const description = trimValue(business?.businessDescription);
  const address = trimValue(business?.businessAddress);
  const phone = trimValue(business?.businessPhone);
  const website = trimValue(business?.businessWebsite);
  const websiteHref = website ? normalizeAdvertisementUrl(website) : null;
  const phoneHref = phone ? telHref(phone) : null;

  const s = useMemo(
    () =>
      StyleSheet.create({
        name: {
          ...typography.h3,
          fontSize: 17,
          color: colors.text,
          fontWeight: "700"
        },
        badgeRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          marginTop: spacing.xs,
          marginBottom: spacing.sm
        },
        badgeText: {
          ...typography.caption,
          color: colors.primary,
          fontWeight: "700"
        },
        type: {
          ...typography.bodySmall,
          color: colors.textSecondary,
          fontWeight: "600",
          marginBottom: spacing.sm
        },
        description: {
          ...typography.bodySmall,
          color: colors.text,
          lineHeight: 20,
          marginBottom: spacing.md
        },
        row: {
          flexDirection: "row",
          alignItems: "flex-start",
          gap: spacing.sm,
          paddingVertical: spacing.sm,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border
        },
        rowIcon: { marginTop: 2 },
        rowText: {
          ...typography.bodySmall,
          color: colors.text,
          flex: 1,
          fontWeight: "500"
        },
        linkText: {
          ...typography.bodySmall,
          color: colors.primary,
          flex: 1,
          fontWeight: "600"
        }
      }),
    [colors]
  );

  const onPhone = useCallback(() => {
    if (!phoneHref) return;
    void Linking.openURL(phoneHref);
  }, [phoneHref]);

  const onWebsite = useCallback(() => {
    if (!websiteHref) return;
    void Linking.openURL(websiteHref);
  }, [websiteHref]);

  if (!visible || !hasPublicBusinessContent(business)) return null;

  return (
    <AccordionSection title="Business" icon="storefront-outline" defaultExpanded>
      {name ? <Text style={s.name}>{name}</Text> : null}
      <View style={s.badgeRow}>
        <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
        <Text style={s.badgeText}>Business Profile Approved</Text>
      </View>
      {type ? <Text style={s.type}>{type}</Text> : null}
      {description ? <Text style={s.description}>{description}</Text> : null}

      {address ? (
        <View style={s.row}>
          <Ionicons name="location-outline" size={18} color={colors.textMuted} style={s.rowIcon} />
          <Text style={s.rowText}>{address}</Text>
        </View>
      ) : null}

      {phone ? (
        <Pressable
          style={s.row}
          onPress={phoneHref ? onPhone : undefined}
          disabled={!phoneHref}
          accessibilityRole={phoneHref ? "button" : "text"}
          accessibilityLabel={phoneHref ? `Call ${phone}` : phone}
        >
          <Ionicons name="call-outline" size={18} color={colors.textMuted} style={s.rowIcon} />
          <Text style={phoneHref ? s.linkText : s.rowText}>{phone}</Text>
        </Pressable>
      ) : null}

      {website ? (
        <Pressable
          style={s.row}
          onPress={websiteHref ? onWebsite : undefined}
          disabled={!websiteHref}
          accessibilityRole={websiteHref ? "link" : "text"}
          accessibilityLabel={websiteHref ? `Open website ${website}` : website}
        >
          <Ionicons name="globe-outline" size={18} color={colors.textMuted} style={s.rowIcon} />
          <Text style={websiteHref ? s.linkText : s.rowText} numberOfLines={2}>
            {website}
          </Text>
        </Pressable>
      ) : null}
    </AccordionSection>
  );
}

/** Card variant for MemberProfileScreen (matches community card layout). */
export function BusinessProfileCard({
  business,
  onContactBusiness
}: {
  business: PublicBusinessProfile | null | undefined;
  /** Shown only for another member's approved+active business (caller decides). */
  onContactBusiness?: () => void;
}) {
  const { colors } = useTheme();

  const name = trimValue(business?.businessName);
  const type = trimValue(business?.businessType);
  const description = trimValue(business?.businessDescription);
  const address = trimValue(business?.businessAddress);
  const phone = trimValue(business?.businessPhone);
  const website = trimValue(business?.businessWebsite);
  const websiteHref = website ? normalizeAdvertisementUrl(website) : null;
  const phoneHref = phone ? telHref(phone) : null;

  const s = useMemo(
    () =>
      StyleSheet.create({
        card: {
          borderRadius: radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          padding: spacing.lg,
          marginTop: spacing.md,
          alignItems: "stretch"
        },
        sectionTitle: {
          fontSize: 15,
          fontWeight: "800",
          marginBottom: spacing.sm,
          color: colors.text
        },
        name: {
          fontSize: 17,
          fontWeight: "700",
          color: colors.text
        },
        badgeRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          marginTop: spacing.xs,
          marginBottom: spacing.sm
        },
        badgeText: {
          fontSize: 12,
          fontWeight: "700",
          color: colors.primary
        },
        type: {
          fontSize: 13,
          fontWeight: "600",
          color: colors.textSecondary,
          marginBottom: spacing.sm
        },
        description: {
          fontSize: 13,
          lineHeight: 19,
          color: colors.text,
          marginBottom: spacing.sm
        },
        row: {
          flexDirection: "row",
          alignItems: "flex-start",
          gap: spacing.sm,
          paddingVertical: 8
        },
        rowText: { flex: 1, fontSize: 13, fontWeight: "500", color: colors.text },
        linkText: { flex: 1, fontSize: 13, fontWeight: "600", color: colors.primary },
        contactBtn: {
          marginTop: spacing.md,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: spacing.sm,
          paddingVertical: 12,
          borderRadius: radius.button,
          backgroundColor: colors.primary
        },
        contactBtnText: {
          fontSize: 15,
          fontWeight: "700",
          color: colors.white
        }
      }),
    [colors]
  );

  if (!hasPublicBusinessContent(business)) return null;

  return (
    <View style={[s.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={s.sectionTitle}>Business</Text>
      {name ? <Text style={s.name}>{name}</Text> : null}
      <View style={s.badgeRow}>
        <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
        <Text style={s.badgeText}>Business Profile Approved</Text>
      </View>
      {type ? <Text style={s.type}>{type}</Text> : null}
      {description ? <Text style={s.description}>{description}</Text> : null}
      {address ? (
        <View style={s.row}>
          <Ionicons name="location-outline" size={18} color={colors.textMuted} />
          <Text style={s.rowText}>{address}</Text>
        </View>
      ) : null}
      {phone ? (
        <Pressable
          style={s.row}
          onPress={phoneHref ? () => void Linking.openURL(phoneHref) : undefined}
          disabled={!phoneHref}
        >
          <Ionicons name="call-outline" size={18} color={colors.textMuted} />
          <Text style={phoneHref ? s.linkText : s.rowText}>{phone}</Text>
        </Pressable>
      ) : null}
      {website ? (
        <Pressable
          style={s.row}
          onPress={websiteHref ? () => void Linking.openURL(websiteHref) : undefined}
          disabled={!websiteHref}
        >
          <Ionicons name="globe-outline" size={18} color={colors.textMuted} />
          <Text style={websiteHref ? s.linkText : s.rowText} numberOfLines={2}>
            {website}
          </Text>
        </Pressable>
      ) : null}

      {onContactBusiness ? (
        <Pressable
          style={s.contactBtn}
          onPress={onContactBusiness}
          accessibilityRole="button"
          accessibilityLabel="Contact Business"
        >
          <Ionicons name="chatbubbles-outline" size={18} color={colors.white} />
          <Text style={s.contactBtnText}>Contact Business</Text>
        </Pressable>
      ) : null}
    </View>
  );
}
