import React, { useCallback, useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { listOwnerPublicBenefits, type PublicBenefit } from "../../api/business.api";
import { BenefitCard, publicBenefitToCardProps } from "../business/BenefitCard";

type Props = {
  businessOwnerId: number;
  /** When true, this is the viewer's own profile — show manage CTAs. */
  isOwner?: boolean;
};

export function MemberBenefitsProfileSection({ businessOwnerId, isOwner }: Props) {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<PublicBenefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      if (isOwner) {
        setItems([]);
        return;
      }
      setItems(await listOwnerPublicBenefits(businessOwnerId));
    } catch {
      setError(true);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [businessOwnerId, isOwner]);

  useEffect(() => {
    void load();
  }, [load]);

  const s = useMemo(
    () =>
      StyleSheet.create({
        card: {
          borderRadius: radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          padding: spacing.lg,
          marginTop: spacing.md
        },
        title: { fontSize: 15, fontWeight: "800", color: colors.text, marginBottom: spacing.sm },
        linkRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
          paddingVertical: spacing.sm,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border
        },
        link: { fontSize: 14, fontWeight: "700", color: colors.primary, flex: 1 },
        hint: { fontSize: 12, color: colors.textMuted, marginBottom: spacing.sm }
      }),
    [colors]
  );

  if (isOwner) {
    return (
      <View style={s.card}>
        <Text style={s.title}>Member Benefits</Text>
        <Text style={s.hint}>Create offers for community members and verify claim codes.</Text>
        <Pressable
          style={s.linkRow}
          onPress={() => navigation.navigate("MyBusinessBenefits")}
          accessibilityRole="button"
        >
          <Ionicons name="list-outline" size={18} color={colors.primary} />
          <Text style={s.link}>Manage Benefits</Text>
        </Pressable>
        <Pressable
          style={s.linkRow}
          onPress={() => navigation.navigate("CreateBusinessBenefit")}
          accessibilityRole="button"
        >
          <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
          <Text style={s.link}>Create Benefit</Text>
        </Pressable>
        <Pressable
          style={s.linkRow}
          onPress={() => navigation.navigate("VerifyBenefitClaim")}
          accessibilityRole="button"
        >
          <Ionicons name="checkmark-done-outline" size={18} color={colors.primary} />
          <Text style={s.link}>Verify Claim Code</Text>
        </Pressable>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={s.card}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.card}>
        <Text style={s.title}>Member Benefits</Text>
        <Pressable onPress={() => void load()}>
          <Text style={s.link}>Unable to load · Try Again</Text>
        </Pressable>
      </View>
    );
  }

  if (!items.length) return null;

  return (
    <View style={{ marginTop: spacing.md }}>
      <Text style={[s.title, { marginBottom: spacing.sm, marginLeft: 2 }]}>Member Benefits</Text>
      {items.slice(0, 5).map((b) => (
        <BenefitCard
          key={b.id}
          {...publicBenefitToCardProps(b)}
          onPress={() => navigation.navigate("BusinessBenefitDetail", { benefitId: b.id })}
          ctaLabel={b.myClaim ? (b.myClaim.status === "USED" ? "Used" : "View Claim") : "View Benefit"}
        />
      ))}
    </View>
  );
}
