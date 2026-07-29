import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
  ScrollView
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import {
  acceptLegalDocuments,
  type LegalAcceptanceStatus,
  type LegalStatusItem
} from "../../api/legal.api";
import { getAuthErrorMessage } from "../../api/client";
import { navigationRef } from "../../navigation/rootNavigation";
import { appAlert } from "../../utils/appAlert";
import { PrimaryButton } from "../ui/PrimaryButton";

type Props = {
  visible: boolean;
  status: LegalAcceptanceStatus | null;
  onAccepted: (next: LegalAcceptanceStatus) => void | Promise<void>;
};

/**
 * Non-dismissible overlay when legal.mustAccept.
 * Review opens LegalDocumentScreen; Accept records all pending keys.
 */
export function LegalAcceptanceGate({ visible, status, onAccepted }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [accepting, setAccepting] = useState(false);
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    if (!visible) {
      setReviewing(false);
      return;
    }
    const unsub = navigationRef.addListener("state", () => {
      const route = navigationRef.getCurrentRoute();
      setReviewing(route?.name === "LegalDocument");
    });
    return unsub;
  }, [visible]);

  const pending: LegalStatusItem[] = status?.pending ?? [];
  const show = visible && pending.length > 0 && !reviewing;

  const openReview = (item: LegalStatusItem) => {
    if (!navigationRef.isReady()) return;
    setReviewing(true);
    navigationRef.navigate("LegalDocument", {
      documentKey: item.documentKey,
      slug: item.slug,
      title: item.title
    });
  };

  const onAcceptAll = async () => {
    if (accepting || pending.length === 0) return;
    setAccepting(true);
    try {
      const result = await acceptLegalDocuments({
        documentKeys: pending.map((p) => p.documentKey),
        source: "reacceptance"
      });
      await onAccepted(result.status);
      if (result.status.mustAccept) {
        appAlert(
          "Still required",
          "Some documents still need acceptance. Please review and try again."
        );
      }
    } catch (e) {
      appAlert("Couldn't accept", getAuthErrorMessage(e));
    } finally {
      setAccepting(false);
    }
  };

  if (!show) return null;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => {}}>
      <View
        style={[
          styles.backdrop,
          { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.lg }
        ]}
        pointerEvents="auto"
      >
        <View
          style={[
            styles.card,
            { backgroundColor: colors.surface, borderColor: colors.border }
          ]}
        >
          <View style={[styles.iconWrap, { backgroundColor: colors.surfaceElevated }]}>
            <Ionicons name="document-text-outline" size={28} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Updated legal terms</Text>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            Please review and accept the updated documents to continue using Digital House.
          </Text>

          {!status ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing.lg }} />
          ) : (
            <ScrollView
              style={styles.list}
              contentContainerStyle={{ gap: spacing.sm }}
              showsVerticalScrollIndicator={false}
            >
              {pending.map((item) => (
                <View
                  key={item.documentKey}
                  style={[
                    styles.pendingRow,
                    { backgroundColor: colors.surfaceElevated, borderColor: colors.border }
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.pendingTitle, { color: colors.text }]}>
                      {item.title}
                    </Text>
                    {item.publishedVersion ? (
                      <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 2 }}>
                        Version {item.publishedVersion}
                      </Text>
                    ) : null}
                  </View>
                  <Pressable
                    onPress={() => openReview(item)}
                    style={({ pressed }) => [
                      styles.reviewBtn,
                      { borderColor: colors.primary, opacity: pressed ? 0.8 : 1 }
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Review ${item.title}`}
                  >
                    <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}>
                      Review
                    </Text>
                  </Pressable>
                </View>
              ))}
            </ScrollView>
          )}

          <PrimaryButton
            title={accepting ? "Accepting…" : "Accept all"}
            onPress={() => void onAcceptAll()}
            loading={accepting}
            disabled={accepting || pending.length === 0}
            style={{ marginTop: spacing.lg }}
          />
          <Text style={[styles.footnote, { color: colors.textMuted }]}>
            You must accept to continue. This cannot be dismissed.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    paddingHorizontal: spacing.lg
  },
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.xl,
    maxHeight: "88%"
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md
  },
  title: { fontSize: 22, fontWeight: "700", marginBottom: spacing.sm },
  body: { fontSize: 15, lineHeight: 22, marginBottom: spacing.lg },
  list: { maxHeight: 280 },
  pendingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md
  },
  pendingTitle: { fontSize: 15, fontWeight: "600" },
  reviewBtn: {
    borderWidth: 1.5,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  footnote: {
    marginTop: spacing.md,
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center"
  }
});
