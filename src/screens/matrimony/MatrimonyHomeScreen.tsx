import React, { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { LinearGradient } from "expo-linear-gradient";
import { getMatrimonyHub, type MatrimonyHub } from "../../api/matrimony.api";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { PrimaryButton } from "../../components/ui/PrimaryButton";

export function MatrimonyHomeScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [hub, setHub] = useState<MatrimonyHub | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getMatrimonyHub();
      setHub(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const s = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        scroll: { padding: spacing.lg, paddingBottom: spacing.xxxl },
        hero: {
          borderRadius: radius.lg,
          padding: spacing.xl,
          marginBottom: spacing.lg,
          overflow: "hidden"
        },
        heroTitle: { fontSize: 22, fontWeight: "800", color: "#fff", marginBottom: spacing.sm },
        heroSub: { fontSize: 14, color: "rgba(255,255,255,0.9)", lineHeight: 20 },
        card: {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          padding: spacing.lg,
          marginBottom: spacing.md,
          borderWidth: 1,
          borderColor: colors.border
        },
        cardTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: spacing.sm },
        muted: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
        progressBg: {
          height: 8,
          backgroundColor: colors.border,
          borderRadius: 4,
          overflow: "hidden",
          marginVertical: spacing.md
        },
        progressFill: { height: "100%", backgroundColor: colors.primary },
        timelineRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md,
          paddingVertical: spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: colors.border
        },
        stepIcon: {
          width: 28,
          height: 28,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center"
        },
        banner: {
          backgroundColor: "#FEF3C7",
          borderRadius: radius.md,
          padding: spacing.md,
          marginBottom: spacing.md,
          borderLeftWidth: 3,
          borderLeftColor: "#D97706"
        },
        bannerText: { fontSize: 13, color: "#92400E", lineHeight: 18 },
        error: { color: colors.error, textAlign: "center", marginTop: spacing.xl }
      }),
    [colors]
  );

  if (loading) {
    return (
      <View style={[s.container, { paddingTop: insets.top, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error || !hub) {
    return (
      <View style={[s.container, { paddingTop: insets.top, padding: spacing.lg }]}>
        <Text style={s.error}>{error ?? "Unknown error"}</Text>
        <PrimaryButton title="Retry" onPress={load} style={{ marginTop: spacing.lg }} />
      </View>
    );
  }

  const goSetup = () => navigation.navigate("MatrimonySetup");

  return (
    <View style={[s.container, { paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={["#3B5BDB", "#6366F1"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.hero}>
          <Text style={s.heroTitle}>Matrimony</Text>
          <Text style={s.heroSub}>Vettuva Gounder community · Trusted profiles with admin verification</Text>
        </LinearGradient>

        {hub.status === "PENDING" && (
          <>
            <View style={s.banner}>
              <Text style={s.bannerText}>
                Your matrimony profile is under admin review. You will be notified once approved. Browse matches unlocks
                after approval.
              </Text>
            </View>
            <View style={s.card}>
              <Text style={s.cardTitle}>Profile completion</Text>
              <Text style={s.muted}>{hub.completion_percentage}% complete</Text>
              <View style={s.progressBg}>
                <View style={[s.progressFill, { width: `${hub.completion_percentage}%` }]} />
              </View>
              <View style={s.timelineRow}>
                <View style={[s.stepIcon, { backgroundColor: "#DCFCE7" }]}>
                  <Text>✓</Text>
                </View>
                <Text style={{ color: colors.text, flex: 1 }}>Profile submitted</Text>
              </View>
              <View style={s.timelineRow}>
                <View style={[s.stepIcon, { backgroundColor: "#FEF3C7" }]}>
                  <Text>⏳</Text>
                </View>
                <Text style={{ color: colors.text, flex: 1 }}>Admin reviewing</Text>
              </View>
              <View style={[s.timelineRow, { borderBottomWidth: 0 }]}>
                <View style={[s.stepIcon, { backgroundColor: colors.border }]}>
                  <Text>🔓</Text>
                </View>
                <Text style={s.muted}>Browse matches (after approval)</Text>
              </View>
            </View>
            <PrimaryButton title="Edit matrimony profile" onPress={goSetup} variant="outline" />
          </>
        )}

        {hub.status === "APPROVED" && (
          <>
            <View style={[s.banner, { backgroundColor: "#DCFCE7", borderLeftColor: "#16A34A" }]}>
              <Text style={[s.bannerText, { color: "#14532D" }]}>
                Your matrimony profile is approved. Browse matches will be available in the next update (Phase 2).
              </Text>
            </View>
            <View style={s.card}>
              <Text style={s.cardTitle}>You are live</Text>
              <Text style={s.muted}>
                Other approved members will see your profile in matrimony browse once matching is enabled.
              </Text>
            </View>
            <PrimaryButton title="Update matrimony details" onPress={goSetup} variant="outline" />
          </>
        )}

        {hub.status === "CHANGES_REQUESTED" && (
          <>
            <View style={[s.banner, { backgroundColor: "#FFEDD5", borderLeftColor: "#EA580C" }]}>
              <Text style={[s.bannerText, { color: "#9A3412", fontWeight: "700" }]}>
                Changes requested by admin
              </Text>
              <Text style={[s.bannerText, { color: "#9A3412", marginTop: 8 }]}>
                {hub.pending?.change_request?.comment ??
                  hub.pending?.admin_remarks ??
                  "Please update the highlighted sections and resubmit."}
              </Text>
              {hub.pending?.change_request?.requestedBy ? (
                <Text style={[s.bannerText, { color: "#9A3412", marginTop: 6, fontSize: 11 }]}>
                  Reviewer: {hub.pending.change_request.requestedBy}
                </Text>
              ) : null}
            </View>
            <View style={s.card}>
              <Text style={s.cardTitle}>Continue your application</Text>
              <Text style={s.muted}>
                Your previous answers and uploads are saved. Open the form to correct only what admin asked
                for — you do not need to start over.
              </Text>
              <View style={s.progressBg}>
                <View style={[s.progressFill, { width: `${hub.completion_percentage}%` }]} />
              </View>
              <Text style={[s.muted, { marginTop: spacing.sm }]}>{hub.completion_percentage}% ready to resubmit</Text>
            </View>
            <PrimaryButton title="Continue application" onPress={goSetup} />
          </>
        )}

        {hub.status === "RESUBMITTED" && (
          <>
            <View style={[s.banner, { backgroundColor: "#DBEAFE", borderLeftColor: "#2563EB" }]}>
              <Text style={[s.bannerText, { color: "#1E3A8A" }]}>
                Your corrected profile has been resubmitted. Our team is reviewing it again.
              </Text>
            </View>
            <View style={s.card}>
              <Text style={s.cardTitle}>Under review</Text>
              <Text style={s.muted}>You will be notified when approved. No further action needed right now.</Text>
            </View>
          </>
        )}

        {hub.status === "REJECTED" && (
          <>
            <View style={[s.banner, { backgroundColor: "#FEE2E2", borderLeftColor: "#DC2626" }]}>
              <Text style={[s.bannerText, { color: "#7F1D1D" }]}>
                Admin rejected your submission
                {hub.pending?.admin_remarks ? `: ${hub.pending.admin_remarks}` : "."} Please correct and resubmit.
              </Text>
            </View>
            <PrimaryButton title="Fix & resubmit profile" onPress={goSetup} />
          </>
        )}

        {(hub.status === "NOT_STARTED" || hub.status === "DRAFT") && (
          <>
            <View style={s.card}>
              <Text style={s.cardTitle}>Complete your matrimony profile</Text>
              <Text style={s.muted}>
                Fill all mandatory fields including photo and horoscope. Same-kulam matches are automatically excluded.
              </Text>
              <View style={s.progressBg}>
                <View style={[s.progressFill, { width: `${hub.completion_percentage}%` }]} />
              </View>
              <Text style={[s.muted, { marginTop: spacing.sm }]}>{hub.completion_percentage}% complete</Text>
              {hub.missing_fields.length > 0 && hub.completion_percentage < 100 && (
                <Text style={[s.muted, { marginTop: spacing.sm, fontSize: 12 }]}>
                  Remaining: {hub.missing_fields.slice(0, 4).join(", ")}
                  {hub.missing_fields.length > 4 ? "…" : ""}
                </Text>
              )}
            </View>
            <PrimaryButton
              title={hub.completion_percentage >= 100 ? "Submit for approval" : "Continue setup"}
              onPress={goSetup}
            />
          </>
        )}

        <Pressable
          onPress={() => navigation.goBack()}
          style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: spacing.lg }}
        >
          <Ionicons name="arrow-back" size={18} color={colors.textSecondary} />
          <Text style={{ color: colors.textSecondary, fontWeight: "600" }}>Back</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
