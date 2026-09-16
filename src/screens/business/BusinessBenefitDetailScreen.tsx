import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Pressable
} from "react-native";
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import {
  BUSINESS_BENEFIT_TYPE_LABELS,
  claimBusinessBenefit,
  getBusinessBenefit,
  type BenefitClaim,
  type BusinessBenefitType,
  type PublicBenefit
} from "../../api/business.api";
import { getAuthErrorMessage } from "../../api/client";
import { appAlert } from "../../utils/appAlert";
import type { RootStackParamList } from "../../navigation/types";
import { BusinessEnquiryModal } from "../../components/profile/BusinessEnquiryModal";

type Route = RouteProp<RootStackParamList, "BusinessBenefitDetail">;

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

export function BusinessBenefitDetailScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<Route>();
  const benefitId = route.params.benefitId;

  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [benefit, setBenefit] = useState<PublicBenefit | null>(null);
  const [claim, setClaim] = useState<BenefitClaim | null>(null);
  const [enquiryOpen, setEnquiryOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const { benefit: b, scope } = await getBusinessBenefit(benefitId);
      if (scope === "owner") {
        navigation.replace("CreateBusinessBenefit", { benefitId, mode: "edit" });
        return;
      }
      const pub = b as PublicBenefit;
      setBenefit(pub);
      setClaim(pub.myClaim);
    } catch (e: unknown) {
      setError(getAuthErrorMessage(e));
      setBenefit(null);
    } finally {
      setLoading(false);
    }
  }, [benefitId, navigation]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load])
  );

  const onClaim = useCallback(async () => {
    if (claiming || !benefit || claim) return;
    setClaiming(true);
    try {
      const c = await claimBusinessBenefit(benefit.id);
      setClaim(c);
      navigation.navigate("BenefitClaimDetail", {
        claimId: c.id,
        justClaimed: true
      });
    } catch (e: unknown) {
      appAlert("Error", getAuthErrorMessage(e));
      void load();
    } finally {
      setClaiming(false);
    }
  }, [benefit, claim, claiming, load, navigation]);

  const s = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        pad: { padding: spacing.lg, paddingBottom: 48 },
        centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.lg },
        business: { ...typography.h3, color: colors.text, fontWeight: "800" },
        badgeRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          marginTop: spacing.xs,
          marginBottom: spacing.lg
        },
        badgeText: { ...typography.caption, color: colors.primary, fontWeight: "700" },
        title: { ...typography.h3, color: colors.text, fontWeight: "700", marginBottom: spacing.sm },
        value: {
          ...typography.body,
          color: colors.primary,
          fontWeight: "700",
          marginBottom: spacing.md
        },
        label: {
          ...typography.caption,
          color: colors.textMuted,
          fontWeight: "700",
          textTransform: "uppercase",
          marginTop: spacing.md,
          marginBottom: 4
        },
        body: { ...typography.bodySmall, color: colors.text, lineHeight: 20 },
        codeBox: {
          marginTop: spacing.lg,
          padding: spacing.lg,
          borderRadius: radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          backgroundColor: colors.surface
        },
        code: {
          fontSize: 22,
          fontWeight: "800",
          letterSpacing: 1,
          color: colors.text,
          marginTop: spacing.sm
        },
        actions: { marginTop: spacing.xl, gap: spacing.sm },
        error: { ...typography.body, color: colors.error, textAlign: "center", marginBottom: spacing.md },
        already: {
          ...typography.bodySmall,
          color: colors.textSecondary,
          fontWeight: "600",
          textAlign: "center"
        }
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

  if (error || !benefit) {
    return (
      <View style={s.centered}>
        <Text style={s.error}>{error || "Unable to load this benefit."}</Text>
        <PrimaryButton title="Try Again" variant="outline" onPress={() => void load()} />
      </View>
    );
  }

  const typeLabel =
    BUSINESS_BENEFIT_TYPE_LABELS[benefit.benefitType as BusinessBenefitType] ??
    benefit.benefitType;

  const claimStatus = claim?.status;
  const alreadyClaimed = !!claim;
  const isUsed = claimStatus === "USED";
  const isExpiredClaim = claimStatus === "EXPIRED";

  return (
    <>
      <ScrollView style={s.container} contentContainerStyle={s.pad}>
        <Text style={s.business}>{benefit.businessName}</Text>
        <View style={s.badgeRow}>
          <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
          <Text style={s.badgeText}>Business Profile Approved</Text>
        </View>

        <Text style={s.title}>{benefit.title}</Text>
        <Text style={s.value}>
          {benefit.value} · {typeLabel}
        </Text>

        <Text style={s.label}>Description</Text>
        <Text style={s.body}>{benefit.description}</Text>

        <Text style={s.label}>Validity</Text>
        <Text style={s.body}>
          {fmtDate(benefit.validFrom)} → {fmtDate(benefit.validUntil)}
        </Text>

        {benefit.terms ? (
          <>
            <Text style={s.label}>Terms</Text>
            <Text style={s.body}>{benefit.terms}</Text>
          </>
        ) : null}

        {benefit.remainingClaims != null ? (
          <>
            <Text style={s.label}>Available</Text>
            <Text style={s.body}>{benefit.remainingClaims} remaining</Text>
          </>
        ) : null}

        {claim ? (
          <View style={s.codeBox}>
            <Text style={s.label}>
              {isUsed ? "Used" : isExpiredClaim ? "Expired" : "Already Claimed"}
            </Text>
            <Text style={s.body}>Your claim code</Text>
            <Text style={s.code} selectable>
              {claim.claimCode}
            </Text>
            <Pressable
              onPress={() => navigation.navigate("BenefitClaimDetail", { claimId: claim.id })}
              style={{ marginTop: spacing.md }}
            >
              <Text style={{ color: colors.primary, fontWeight: "700" }}>View Claim</Text>
            </Pressable>
          </View>
        ) : null}

        <View style={s.actions}>
          {!alreadyClaimed ? (
            <PrimaryButton title="Claim Benefit" onPress={() => void onClaim()} loading={claiming} />
          ) : isUsed ? (
            <Text style={s.already}>Used</Text>
          ) : isExpiredClaim ? (
            <Text style={s.already}>Expired</Text>
          ) : (
            <PrimaryButton
              title="View Claim"
              onPress={() => navigation.navigate("BenefitClaimDetail", { claimId: claim!.id })}
            />
          )}
          <PrimaryButton
            title="Contact Business"
            variant="outline"
            onPress={() => setEnquiryOpen(true)}
          />
          <PrimaryButton
            title="View Business Profile"
            variant="secondary"
            onPress={() =>
              navigation.navigate("MemberProfile", { userId: benefit.businessOwnerId })
            }
          />
        </View>
      </ScrollView>

      <BusinessEnquiryModal
        visible={enquiryOpen}
        onClose={() => setEnquiryOpen(false)}
        businessOwnerId={benefit.businessOwnerId}
        business={{ businessName: benefit.businessName }}
        ownerName={benefit.businessName}
        onSent={({ otherUserId, ownerName }) => {
          navigation.navigate("Chat", {
            otherUserId,
            name: ownerName,
            profileImage: null
          });
        }}
      />
    </>
  );
}
