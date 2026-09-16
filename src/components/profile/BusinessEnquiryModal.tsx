import React, { useCallback, useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { typography } from "../../theme/typography";
import { spacing, radius } from "../../theme/spacing";
import { PrimaryButton } from "../ui/PrimaryButton";
import { ModalKeyboardAvoiding } from "../ui/ModalKeyboardAvoiding";
import { useModalKeyboardPad } from "../../hooks/useModalKeyboardPad";
import {
  BUSINESS_ENQUIRY_TYPES,
  BUSINESS_ENQUIRY_TYPE_LABELS,
  submitBusinessEnquiry,
  type BusinessEnquiryType
} from "../../api/business.api";
import { getAuthErrorMessage } from "../../api/client";
import { appAlert } from "../../utils/appAlert";
import type { PublicBusinessProfile } from "./BusinessProfileSection";

type Props = {
  visible: boolean;
  onClose: () => void;
  businessOwnerId: number;
  business: PublicBusinessProfile;
  ownerName?: string | null;
  onSent: (result: { otherUserId: number; ownerName: string; profileImage?: string | null }) => void;
};

const MESSAGE_MIN = 10;
const MESSAGE_MAX = 2000;

function trimValue(v: string | null | undefined): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

export function BusinessEnquiryModal({
  visible,
  onClose,
  businessOwnerId,
  business,
  ownerName,
  onSent
}: Props) {
  const { colors } = useTheme();
  const { keyboardHeight, keyboardOpen } = useModalKeyboardPad();
  const [enquiryType, setEnquiryType] = useState<BusinessEnquiryType | null>(null);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const businessName = trimValue(business.businessName) || ownerName?.trim() || "Business";
  const businessType = trimValue(business.businessType);

  const reset = useCallback(() => {
    setEnquiryType(null);
    setMessage("");
    setSending(false);
  }, []);

  const handleClose = useCallback(() => {
    if (sending) return;
    reset();
    onClose();
  }, [onClose, reset, sending]);

  const canSubmit =
    !!enquiryType && message.trim().length >= MESSAGE_MIN && message.trim().length <= MESSAGE_MAX && !sending;

  const onSubmit = useCallback(async () => {
    if (!enquiryType || sending) return;
    const trimmed = message.trim();
    if (!enquiryType) {
      appAlert("Required", "Please select what you are looking for.");
      return;
    }
    if (trimmed.length < MESSAGE_MIN) {
      appAlert("Required", `Message must be at least ${MESSAGE_MIN} characters.`);
      return;
    }
    if (trimmed.length > MESSAGE_MAX) {
      appAlert("Too long", `Message must be at most ${MESSAGE_MAX} characters.`);
      return;
    }

    setSending(true);
    const clientId = `be_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    try {
      const result = await submitBusinessEnquiry({
        businessOwnerId,
        enquiryType,
        message: trimmed,
        clientId
      });
      reset();
      onClose();
      appAlert("Business enquiry sent", "Your enquiry was delivered to the business owner.", [
        {
          text: "Open chat",
          onPress: () =>
            onSent({
              otherUserId: result.otherUserId,
              ownerName: ownerName?.trim() || businessName,
              profileImage: null
            })
        },
        { text: "OK", style: "cancel" }
      ]);
    } catch (e: unknown) {
      appAlert("Error", getAuthErrorMessage(e));
    } finally {
      setSending(false);
    }
  }, [
    businessName,
    businessOwnerId,
    enquiryType,
    message,
    onClose,
    onSent,
    ownerName,
    reset,
    sending
  ]);

  const s = useMemo(
    () =>
      StyleSheet.create({
        backdrop: {
          flex: 1,
          backgroundColor: "rgba(15,23,42,0.45)",
          justifyContent: "flex-end"
        },
        sheet: {
          maxHeight: "92%",
          borderTopLeftRadius: radius.xl,
          borderTopRightRadius: radius.xl,
          backgroundColor: colors.surface,
          paddingBottom: spacing.lg,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border
        },
        handle: {
          alignSelf: "center",
          width: 40,
          height: 4,
          borderRadius: 2,
          backgroundColor: colors.border,
          marginTop: spacing.sm,
          marginBottom: spacing.md
        },
        header: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: spacing.lg,
          marginBottom: spacing.md
        },
        title: {
          ...typography.h3,
          color: colors.text,
          fontWeight: "800"
        },
        body: {
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.xl
        },
        label: {
          ...typography.caption,
          color: colors.textMuted,
          fontWeight: "700",
          marginBottom: 4,
          textTransform: "uppercase",
          letterSpacing: 0.4
        },
        value: {
          ...typography.body,
          color: colors.text,
          fontWeight: "600",
          marginBottom: spacing.md
        },
        sectionTitle: {
          ...typography.bodySmall,
          color: colors.text,
          fontWeight: "700",
          marginBottom: spacing.sm,
          marginTop: spacing.sm
        },
        chips: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: spacing.sm,
          marginBottom: spacing.md
        },
        chip: {
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: radius.full,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          backgroundColor: colors.surfaceElevated
        },
        chipActive: {
          borderColor: colors.primary,
          backgroundColor: colors.primary + "18"
        },
        chipText: {
          ...typography.caption,
          color: colors.textSecondary,
          fontWeight: "600"
        },
        chipTextActive: {
          color: colors.primary,
          fontWeight: "700"
        },
        input: {
          minHeight: 110,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          borderRadius: radius.md,
          padding: spacing.md,
          color: colors.text,
          textAlignVertical: "top",
          ...typography.bodySmall,
          backgroundColor: colors.surfaceElevated,
          marginBottom: spacing.sm
        },
        hint: {
          ...typography.caption,
          color: colors.textMuted,
          marginBottom: spacing.lg
        },
        footer: {
          paddingHorizontal: spacing.lg,
          gap: spacing.sm
        }
      }),
    [colors]
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <Pressable style={s.backdrop} onPress={handleClose} accessibilityLabel="Dismiss">
        <Pressable style={s.sheet} onPress={(e) => e.stopPropagation()}>
          <ModalKeyboardAvoiding>
            <View style={s.handle} />
            <View style={s.header}>
              <Text style={s.title}>Business Enquiry</Text>
              <Pressable onPress={handleClose} hitSlop={12} disabled={sending} accessibilityRole="button">
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </Pressable>
            </View>

            <ScrollView
              style={s.body}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{
                paddingBottom: keyboardOpen ? Math.max(keyboardHeight * 0.15, spacing.md) : spacing.md
              }}
            >
              <Text style={s.label}>Business</Text>
              <Text style={s.value}>{businessName}</Text>
              {businessType ? (
                <>
                  <Text style={s.label}>Business Type</Text>
                  <Text style={s.value}>{businessType}</Text>
                </>
              ) : null}

              <Text style={s.sectionTitle}>What are you looking for?</Text>
              <View style={s.chips}>
                {BUSINESS_ENQUIRY_TYPES.map((t) => {
                  const active = enquiryType === t;
                  return (
                    <Pressable
                      key={t}
                      style={[s.chip, active && s.chipActive]}
                      onPress={() => setEnquiryType(t)}
                      disabled={sending}
                      accessibilityRole="button"
                      accessibilityState={{ selected: active }}
                    >
                      <Text style={[s.chipText, active && s.chipTextActive]}>
                        {BUSINESS_ENQUIRY_TYPE_LABELS[t]}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={s.sectionTitle}>Message</Text>
              <TextInput
                style={s.input}
                value={message}
                onChangeText={setMessage}
                placeholder="Tell the business what you are looking for..."
                placeholderTextColor={colors.textMuted}
                multiline
                maxLength={MESSAGE_MAX}
                editable={!sending}
              />
              <Text style={s.hint}>
                {message.trim().length}/{MESSAGE_MAX} · min {MESSAGE_MIN} characters
              </Text>
            </ScrollView>

            <View style={s.footer}>
              <PrimaryButton
                title="Send Enquiry"
                onPress={() => void onSubmit()}
                loading={sending}
                disabled={!canSubmit}
              />
            </View>
          </ModalKeyboardAvoiding>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
