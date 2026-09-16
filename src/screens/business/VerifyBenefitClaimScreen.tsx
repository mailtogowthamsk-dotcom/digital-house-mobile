import React, { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, TextInput, ScrollView } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import {
  lookupBenefitClaimCode,
  markBenefitClaimUsed,
  type BenefitClaim
} from "../../api/business.api";
import { getAuthErrorMessage } from "../../api/client";
import { appAlert } from "../../utils/appAlert";

function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

export function VerifyBenefitClaimScreen() {
  const { colors } = useTheme();
  const [code, setCode] = useState("");
  const [lookingUp, setLookingUp] = useState(false);
  const [marking, setMarking] = useState(false);
  const [found, setFound] = useState<BenefitClaim | null>(null);

  const onLookup = useCallback(async () => {
    if (lookingUp || marking) return;
    setLookingUp(true);
    setFound(null);
    try {
      const claim = await lookupBenefitClaimCode(code.trim().toUpperCase());
      setFound(claim);
    } catch (e: unknown) {
      appAlert("Error", getAuthErrorMessage(e));
    } finally {
      setLookingUp(false);
    }
  }, [code, lookingUp, marking]);

  const onMarkUsed = useCallback(async () => {
    if (!found || marking || lookingUp) return;
    if (found.status !== "CLAIMED") {
      appAlert("Unavailable", "Only CLAIMED codes can be marked as used.");
      return;
    }
    setMarking(true);
    try {
      const claim = await markBenefitClaimUsed(found.claimCode);
      setFound(claim);
      appAlert("Marked as Used", "This claim has been redeemed successfully.");
      setCode("");
    } catch (e: unknown) {
      appAlert("Error", getAuthErrorMessage(e));
    } finally {
      setMarking(false);
    }
  }, [found, lookingUp, marking]);

  const s = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        pad: { padding: spacing.lg, paddingBottom: 48 },
        label: {
          ...typography.caption,
          color: colors.textMuted,
          fontWeight: "700",
          marginBottom: 8
        },
        input: {
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          borderRadius: radius.md,
          padding: spacing.md,
          color: colors.text,
          backgroundColor: colors.surface,
          ...typography.body,
          letterSpacing: 1,
          marginBottom: spacing.lg
        },
        hint: { ...typography.bodySmall, color: colors.textSecondary, marginBottom: spacing.lg },
        result: {
          marginTop: spacing.lg,
          padding: spacing.lg,
          borderRadius: radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          backgroundColor: colors.surface
        },
        resultTitle: {
          ...typography.caption,
          color: colors.primary,
          fontWeight: "800",
          textTransform: "uppercase",
          marginBottom: spacing.md
        },
        fieldLabel: {
          ...typography.caption,
          color: colors.textMuted,
          fontWeight: "700",
          marginTop: spacing.sm
        },
        fieldValue: { ...typography.body, color: colors.text, fontWeight: "600", marginTop: 2 },
        code: {
          fontSize: 22,
          fontWeight: "800",
          letterSpacing: 1.2,
          color: colors.text,
          marginTop: spacing.xs
        },
        actions: { marginTop: spacing.lg, gap: spacing.sm }
      }),
    [colors]
  );

  const canMark = found?.status === "CLAIMED";

  return (
    <ScrollView style={s.container} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <Text style={s.hint}>
        Enter the member’s claim code to look it up. Confirm only when they redeem the offer at your
        business.
      </Text>
      <Text style={s.label}>Claim code</Text>
      <TextInput
        style={s.input}
        value={code}
        onChangeText={(t) => {
          setCode(t);
          setFound(null);
        }}
        placeholder="DH-8K42-XP"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="characters"
        autoCorrect={false}
        editable={!lookingUp && !marking}
      />
      <PrimaryButton
        title="Look Up Claim"
        onPress={() => void onLookup()}
        loading={lookingUp}
        disabled={code.trim().length < 4 || marking}
      />

      {found ? (
        <View style={s.result}>
          <Text style={s.resultTitle}>Claim Found</Text>
          <Text style={s.fieldLabel}>Claim code</Text>
          <Text style={s.code} selectable>
            {found.claimCode}
          </Text>
          <Text style={s.fieldLabel}>Benefit</Text>
          <Text style={s.fieldValue}>
            {found.benefitValue ? `${found.benefitValue} · ` : ""}
            {found.benefitTitle ?? "Benefit"}
          </Text>
          <Text style={s.fieldLabel}>Member</Text>
          <Text style={s.fieldValue}>{found.memberName ?? "Member"}</Text>
          <Text style={s.fieldLabel}>Valid until</Text>
          <Text style={s.fieldValue}>{fmtDate(found.validUntil ?? found.expiresAt)}</Text>
          <Text style={s.fieldLabel}>Status</Text>
          <Text style={s.fieldValue}>{found.status}</Text>
          {found.terms ? (
            <>
              <Text style={s.fieldLabel}>Terms</Text>
              <Text style={[s.fieldValue, { fontWeight: "400" }]}>{found.terms}</Text>
            </>
          ) : null}

          <View style={s.actions}>
            {canMark ? (
              <PrimaryButton
                title="Mark as Used"
                onPress={() => void onMarkUsed()}
                loading={marking}
                disabled={lookingUp}
              />
            ) : (
              <Text style={{ color: colors.textMuted, fontWeight: "600" }}>
                {found.status === "USED"
                  ? "This claim is already used."
                  : `Status: ${found.status}`}
              </Text>
            )}
          </View>
        </View>
      ) : null}
    </ScrollView>
  );
}
