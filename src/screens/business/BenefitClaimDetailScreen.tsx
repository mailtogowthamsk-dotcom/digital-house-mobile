import React, { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from "react-native";
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { getBenefitClaim, type BenefitClaim } from "../../api/business.api";
import { getAuthErrorMessage } from "../../api/client";
import type { RootStackParamList } from "../../navigation/types";

type Route = RouteProp<RootStackParamList, "BenefitClaimDetail">;

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

export function BenefitClaimDetailScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<Route>();
  const justClaimed = !!route.params.justClaimed;
  const [claim, setClaim] = useState<BenefitClaim | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setClaim(await getBenefitClaim(route.params.claimId));
    } catch (e: unknown) {
      setError(getAuthErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }, [route.params.claimId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load])
  );

  const s = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        pad: { padding: spacing.lg, paddingBottom: 48 },
        centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.lg },
        box: {
          borderRadius: radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          backgroundColor: colors.surface,
          padding: spacing.xl,
          alignItems: "center"
        },
        label: {
          ...typography.caption,
          color: colors.primary,
          fontWeight: "800",
          textTransform: "uppercase"
        },
        code: {
          fontSize: 28,
          fontWeight: "800",
          letterSpacing: 1.5,
          color: colors.text,
          marginVertical: spacing.md
        },
        title: { ...typography.body, fontWeight: "700", color: colors.text, textAlign: "center" },
        meta: {
          ...typography.bodySmall,
          color: colors.textSecondary,
          textAlign: "center",
          marginTop: 6
        },
        field: { alignSelf: "stretch", marginTop: spacing.md },
        fieldLabel: {
          ...typography.caption,
          color: colors.textMuted,
          fontWeight: "700",
          textAlign: "left"
        },
        fieldValue: {
          ...typography.bodySmall,
          color: colors.text,
          marginTop: 2,
          textAlign: "left"
        },
        actions: { marginTop: spacing.xl, gap: spacing.sm },
        error: { ...typography.body, color: colors.error, textAlign: "center", marginBottom: spacing.md }
      }),
    [colors]
  );

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error || !claim) {
    return (
      <View style={s.centered}>
        <Text style={s.error}>{error || "Unable to load claim."}</Text>
        <PrimaryButton title="Try Again" variant="outline" onPress={() => void load()} />
      </View>
    );
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.pad}>
      <View style={s.box}>
        <Text style={s.label}>{justClaimed ? "Benefit Claimed" : "Claim Code"}</Text>
        <Text style={s.code} selectable>
          {claim.claimCode}
        </Text>
        <Text style={s.title}>{claim.benefitTitle}</Text>
        <Text style={s.meta}>{claim.businessName}</Text>
        <Text style={s.meta}>{claim.benefitValue}</Text>

        <View style={s.field}>
          <Text style={s.fieldLabel}>Status</Text>
          <Text style={s.fieldValue}>{claim.status}</Text>
        </View>
        <View style={s.field}>
          <Text style={s.fieldLabel}>Valid until</Text>
          <Text style={s.fieldValue}>{fmtDate(claim.validUntil ?? claim.expiresAt)}</Text>
        </View>
        {claim.terms ? (
          <View style={s.field}>
            <Text style={s.fieldLabel}>Terms</Text>
            <Text style={s.fieldValue}>{claim.terms}</Text>
          </View>
        ) : null}
        {claim.businessAvailable === false ? (
          <View style={s.field}>
            <Text style={[s.fieldValue, { color: colors.textMuted, marginTop: spacing.md }]}>
              This business is no longer publicly active. Your claim history is kept, but the offer
              may no longer be redeemable.
            </Text>
          </View>
        ) : null}
      </View>

      <View style={s.actions}>
        {claim.businessAvailable !== false ? (
          <PrimaryButton
            title="View Benefit"
            onPress={() =>
              navigation.navigate("BusinessBenefitDetail", { benefitId: claim.benefitId })
            }
          />
        ) : null}
        <PrimaryButton
          title="My Claims"
          variant="outline"
          onPress={() => navigation.navigate("MyBenefitClaims")}
        />
      </View>
    </ScrollView>
  );
}
