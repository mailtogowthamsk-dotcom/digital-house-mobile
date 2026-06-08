import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { getMatrimonyHub, type MatrimonyHub } from "../../api/matrimony.api";
import { useTheme } from "../../theme/ThemeContext";
import { spacing } from "../../theme/spacing";
import { PrimaryButton } from "../ui/PrimaryButton";

function blockedMessage(hub: MatrimonyHub): string {
  if (hub.can_browse) return "";
  if (hub.status === "PENDING" || hub.status === "RESUBMITTED") {
    return "Your matrimony profile is under admin review. Browsing unlocks after approval.";
  }
  if (hub.status === "CHANGES_REQUESTED") {
    return "Admin requested changes. Complete the requested updates and resubmit before browsing.";
  }
  if (hub.status === "REJECTED") {
    return "Your matrimony application was rejected. Update your profile and submit again.";
  }
  if (hub.status === "APPROVED" && hub.completion_percentage < 100) {
    return `Complete your matrimony profile (${hub.completion_percentage}% done) before browsing.`;
  }
  if (hub.completion_percentage < 100) {
    return `Complete your matrimony profile (${hub.completion_percentage}% done) and submit for admin approval.`;
  }
  return "Complete matrimony setup and get admin approval before browsing profiles.";
}

type Props = {
  children: React.ReactNode;
};

/** Hard gate — no dismissible bypass when browse is locked. */
export function MatrimonyBrowseGate({ children }: Props) {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [hub, setHub] = useState<MatrimonyHub | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      setError(null);
      void getMatrimonyHub()
        .then((data) => {
          if (!cancelled) setHub(data);
        })
        .catch((e: unknown) => {
          if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, padding: spacing.xl }]}>
        <Ionicons name="cloud-offline-outline" size={40} color={colors.textSecondary} />
        <Text style={{ color: colors.error, marginTop: spacing.md, textAlign: "center" }}>{error}</Text>
        <Pressable onPress={() => navigation.goBack()} style={{ marginTop: spacing.lg }}>
          <Text style={{ color: colors.primary, fontWeight: "700" }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  if (!hub?.can_browse) {
    return (
      <View style={[styles.locked, { backgroundColor: colors.background }]}>
        <View style={[styles.lockedCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="lock-closed-outline" size={44} color={colors.primary} />
          <Text style={[styles.lockedTitle, { color: colors.text }]}>Browsing locked</Text>
          <Text style={[styles.lockedBody, { color: colors.textSecondary }]}>{blockedMessage(hub!)}</Text>
          <PrimaryButton title="Go to matrimony setup" onPress={() => navigation.navigate("MatrimonySetup")} />
          <Pressable onPress={() => navigation.navigate("MatrimonyHome")} style={{ marginTop: spacing.md }}>
            <Text style={{ color: colors.primary, fontWeight: "600", textAlign: "center" }}>Back to matrimony home</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return <>{children}</>;
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  locked: { flex: 1, justifyContent: "center", padding: spacing.xl },
  lockedCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.md
  },
  lockedTitle: { fontSize: 20, fontWeight: "800", marginTop: spacing.sm },
  lockedBody: { fontSize: 14, lineHeight: 21, textAlign: "center", marginBottom: spacing.sm }
});
