import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator
} from "react-native";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import {
  BUSINESS_BENEFIT_TYPES,
  BUSINESS_BENEFIT_TYPE_LABELS,
  createBusinessBenefit,
  disableBusinessBenefit,
  getBusinessBenefit,
  updateBusinessBenefit,
  type BusinessBenefitType,
  type OwnerBenefit
} from "../../api/business.api";
import { getAuthErrorMessage } from "../../api/client";
import { appAlert } from "../../utils/appAlert";
import type { RootStackParamList } from "../../navigation/types";

type Route = RouteProp<RootStackParamList, "CreateBusinessBenefit">;

export function CreateBusinessBenefitScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const route = useRoute<Route>();
  const benefitId = route.params?.benefitId;
  const isEdit = !!benefitId;

  const [loading, setLoading] = useState(!!benefitId);
  const [saving, setSaving] = useState(false);
  const [existing, setExisting] = useState<OwnerBenefit | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [benefitType, setBenefitType] = useState<BusinessBenefitType>("PERCENTAGE_DISCOUNT");
  const [value, setValue] = useState("");
  const [terms, setTerms] = useState("");
  const [validFrom, setValidFrom] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [usageLimit, setUsageLimit] = useState("");

  useEffect(() => {
    if (!benefitId) return;
    void (async () => {
      try {
        const { benefit, scope } = await getBusinessBenefit(benefitId);
        if (scope !== "owner") {
          appAlert("Error", "You can only edit your own benefits.");
          navigation.goBack();
          return;
        }
        const b = benefit as OwnerBenefit;
        setExisting(b);
        setTitle(b.title);
        setDescription(b.description);
        setBenefitType(b.benefitType as BusinessBenefitType);
        setValue(b.value);
        setTerms(b.terms ?? "");
        setValidFrom(b.validFrom ? b.validFrom.slice(0, 10) : "");
        setValidUntil(b.validUntil ? b.validUntil.slice(0, 10) : "");
        setUsageLimit(b.usageLimit != null ? String(b.usageLimit) : "");
      } catch (e: unknown) {
        appAlert("Error", getAuthErrorMessage(e));
        navigation.goBack();
      } finally {
        setLoading(false);
      }
    })();
  }, [benefitId, navigation]);

  const onSave = useCallback(async () => {
    if (saving) return;
    setSaving(true);
    try {
      const payload = {
        title: title.trim(),
        description: description.trim(),
        benefitType,
        value: value.trim(),
        terms: terms.trim() || null,
        validFrom: validFrom.trim() || null,
        validUntil: validUntil.trim() || null,
        usageLimit: usageLimit.trim() ? Number(usageLimit.trim()) : null
      };
      if (isEdit && benefitId) {
        await updateBusinessBenefit(benefitId, payload);
        appAlert("Submitted", "Your benefit was updated and sent for admin approval.");
      } else {
        await createBusinessBenefit(payload);
        appAlert("Submitted", "Your benefit was submitted for admin approval.");
      }
      navigation.goBack();
    } catch (e: unknown) {
      appAlert("Error", getAuthErrorMessage(e));
    } finally {
      setSaving(false);
    }
  }, [
    benefitId,
    benefitType,
    description,
    isEdit,
    navigation,
    saving,
    terms,
    title,
    usageLimit,
    validFrom,
    validUntil,
    value
  ]);

  const onDisable = useCallback(() => {
    if (!benefitId) return;
    appAlert("Disable benefit?", "Members will no longer be able to claim this benefit.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Disable",
        style: "destructive",
        onPress: () => {
          void (async () => {
            try {
              await disableBusinessBenefit(benefitId);
              appAlert("Disabled", "Benefit disabled.");
              navigation.goBack();
            } catch (e: unknown) {
              appAlert("Error", getAuthErrorMessage(e));
            }
          })();
        }
      }
    ]);
  }, [benefitId, navigation]);

  const s = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        pad: { padding: spacing.lg, paddingBottom: 48 },
        label: {
          ...typography.caption,
          color: colors.textMuted,
          fontWeight: "700",
          marginBottom: 6,
          marginTop: spacing.md
        },
        input: {
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          borderRadius: radius.md,
          padding: spacing.md,
          color: colors.text,
          backgroundColor: colors.surface,
          ...typography.bodySmall
        },
        area: { minHeight: 90, textAlignVertical: "top" as const },
        chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
        chip: {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: radius.full,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          backgroundColor: colors.surfaceElevated
        },
        chipOn: { borderColor: colors.primary, backgroundColor: colors.primary + "18" },
        chipText: { ...typography.caption, color: colors.textSecondary, fontWeight: "600" },
        chipTextOn: { color: colors.primary, fontWeight: "700" },
        hint: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm },
        footer: { marginTop: spacing.xl, gap: spacing.sm }
      }),
    [colors]
  );

  if (loading) {
    return (
      <View style={[s.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={s.container} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      {existing?.status === "REJECTED" && existing.adminNote ? (
        <Text style={[s.hint, { color: colors.error }]}>Rejected: {existing.adminNote}</Text>
      ) : null}
      {isEdit ? (
        <Text style={s.hint}>Editing resubmits the benefit for admin approval.</Text>
      ) : null}

      <Text style={s.label}>Title</Text>
      <TextInput
        style={s.input}
        value={title}
        onChangeText={setTitle}
        placeholder="10% Off on All Services"
        placeholderTextColor={colors.textMuted}
        maxLength={160}
      />

      <Text style={s.label}>Description</Text>
      <TextInput
        style={[s.input, s.area]}
        value={description}
        onChangeText={setDescription}
        placeholder="Explain what members receive"
        placeholderTextColor={colors.textMuted}
        multiline
        maxLength={2000}
      />

      <Text style={s.label}>Benefit Type</Text>
      <View style={s.chips}>
        {BUSINESS_BENEFIT_TYPES.map((t) => {
          const on = benefitType === t;
          return (
            <Pressable key={t} style={[s.chip, on && s.chipOn]} onPress={() => setBenefitType(t)}>
              <Text style={[s.chipText, on && s.chipTextOn]}>{BUSINESS_BENEFIT_TYPE_LABELS[t]}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={s.label}>Value</Text>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={setValue}
        placeholder="10% / ₹500 / Free Consultation"
        placeholderTextColor={colors.textMuted}
        maxLength={80}
      />

      <Text style={s.label}>Valid From (YYYY-MM-DD, optional)</Text>
      <TextInput
        style={s.input}
        value={validFrom}
        onChangeText={setValidFrom}
        placeholder="2026-09-16"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
      />

      <Text style={s.label}>Valid Until (YYYY-MM-DD, optional)</Text>
      <TextInput
        style={s.input}
        value={validUntil}
        onChangeText={setValidUntil}
        placeholder="2026-12-31"
        placeholderTextColor={colors.textMuted}
        autoCapitalize="none"
      />

      <Text style={s.label}>Terms & Conditions (optional)</Text>
      <TextInput
        style={[s.input, s.area]}
        value={terms}
        onChangeText={setTerms}
        placeholder="Valid once per member. Cannot be combined with other offers."
        placeholderTextColor={colors.textMuted}
        multiline
        maxLength={2000}
      />

      <Text style={s.label}>Usage Limit (optional)</Text>
      <TextInput
        style={s.input}
        value={usageLimit}
        onChangeText={setUsageLimit}
        placeholder="e.g. 100"
        placeholderTextColor={colors.textMuted}
        keyboardType="number-pad"
      />

      <View style={s.footer}>
        <PrimaryButton
          title={isEdit ? "Submit for Approval" : "Create Benefit"}
          onPress={() => void onSave()}
          loading={saving}
        />
        {isEdit && existing?.status === "ACTIVE" ? (
          <PrimaryButton title="Disable Benefit" variant="outline" onPress={onDisable} />
        ) : null}
      </View>
    </ScrollView>
  );
}
