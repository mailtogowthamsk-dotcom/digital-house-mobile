import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl, Pressable } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  getMatrimonyPaymentHistory,
  getMatrimonySubscription,
  type MatrimonyPaymentHistoryItem,
  type MyMatrimonySubscriptionDetail
} from "../../api/matrimony.api";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { MatrimonyScreenHeader } from "../../components/matrimony/MatrimonyScreenHeader";
import { PrimaryButton } from "../../components/ui/PrimaryButton";

function statusColor(status: string): string {
  if (status === "PAID" || status === "ACTIVE") return "#16A34A";
  if (status === "FAILED" || status === "EXPIRED") return "#DC2626";
  return "#D97706";
}

export function MatrimonyMySubscriptionScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [detail, setDetail] = useState<MyMatrimonySubscriptionDetail | null>(null);
  const [history, setHistory] = useState<MatrimonyPaymentHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const [sub, hist] = await Promise.all([
        getMatrimonySubscription(),
        getMatrimonyPaymentHistory()
      ]);
      setDetail(sub.mySubscription ?? null);
      setHistory(hist);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const renew = () => navigation.navigate("MatrimonyPlans");

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <MatrimonyScreenHeader title="My subscription" onBack={() => navigation.goBack()} />
      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
      >
        {loading && !detail ? (
          <Text style={{ color: colors.textSecondary }}>Loading…</Text>
        ) : detail ? (
          <>
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Current plan</Text>
              <Text style={[styles.planName, { color: colors.text }]}>{detail.planLabel}</Text>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: `${statusColor(detail.subscriptionStatus)}18` }
                ]}
              >
                <Text style={[styles.badgeText, { color: statusColor(detail.subscriptionStatus) }]}>
                  {detail.subscriptionStatus === "ACTIVE"
                    ? "Active"
                    : detail.subscriptionStatus === "EXPIRED"
                      ? "Expired"
                      : "Free"}
                </Text>
              </View>

              {detail.subscriptionStatus === "ACTIVE" && detail.daysRemaining != null ? (
                <Text style={{ color: colors.text, marginTop: spacing.sm, fontWeight: "600" }}>
                  {detail.daysRemaining} day{detail.daysRemaining === 1 ? "" : "s"} remaining
                </Text>
              ) : null}

              <View style={styles.metaGrid}>
                {detail.startedAt ? (
                  <MetaRow label="Start date" value={formatDate(detail.startedAt)} colors={colors} />
                ) : null}
                {detail.expiresAt ? (
                  <MetaRow label="Expiry date" value={formatDate(detail.expiresAt)} colors={colors} />
                ) : null}
                {detail.amountPaidInr != null ? (
                  <MetaRow
                    label="Amount paid"
                    value={`₹${detail.amountPaidInr.toLocaleString("en-IN")}`}
                    colors={colors}
                  />
                ) : null}
                {detail.paymentId ? (
                  <MetaRow label="Payment ID" value={detail.paymentId} colors={colors} mono />
                ) : null}
              </View>

              {detail.quota.limit > 0 ? (
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: spacing.md }}>
                  Profile opens: {detail.quota.used} / {detail.quota.limit} this month
                </Text>
              ) : null}

              {(detail.canRenew || detail.subscriptionStatus !== "ACTIVE") && (
                <PrimaryButton
                  title={detail.subscriptionStatus === "ACTIVE" ? "Renew / upgrade" : "Subscribe again"}
                  onPress={renew}
                  style={{ marginTop: spacing.md }}
                />
              )}
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Payment history</Text>
            {history.length === 0 ? (
              <Text style={{ color: colors.textSecondary, fontSize: 13 }}>No payments yet.</Text>
            ) : (
              history.map((h) => (
                <View
                  key={h.id}
                  style={[styles.historyRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "700", color: colors.text }}>{h.planLabel}</Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                      {formatDate(h.createdAt)}
                      {h.paidAt ? ` · Paid ${formatDate(h.paidAt)}` : ""}
                    </Text>
                    {h.razorpayPaymentId ? (
                      <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 4 }} numberOfLines={1}>
                        {h.razorpayPaymentId}
                      </Text>
                    ) : null}
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={{ fontWeight: "800", color: colors.text }}>
                      ₹{h.amountInr.toLocaleString("en-IN")}
                    </Text>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: statusColor(h.status), marginTop: 4 }}>
                      {h.status}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </>
        ) : (
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Ionicons name="card-outline" size={32} color={colors.textSecondary} />
            <Text style={{ color: colors.text, fontWeight: "700", marginTop: spacing.sm }}>No active plan</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 4 }}>
              Subscribe to Gold or Platinum to open full profiles.
            </Text>
            <PrimaryButton title="View plans" onPress={renew} style={{ marginTop: spacing.md }} />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function MetaRow({
  label,
  value,
  colors,
  mono
}: {
  label: string;
  value: string;
  colors: { text: string; textSecondary: string };
  mono?: boolean;
}) {
  return (
    <View style={{ marginTop: spacing.sm }}>
      <Text style={{ fontSize: 11, color: colors.textSecondary }}>{label}</Text>
      <Text
        style={{
          fontSize: 13,
          color: colors.text,
          fontWeight: "600",
          fontFamily: mono ? "monospace" : undefined
        }}
        numberOfLines={mono ? 1 : undefined}
      >
        {value}
      </Text>
    </View>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      day: "numeric",
      month: "short",
      year: "numeric"
    });
  } catch {
    return iso;
  }
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.lg
  },
  label: { fontSize: 12, fontWeight: "600" },
  planName: { fontSize: 22, fontWeight: "800", marginTop: 4 },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
    marginTop: spacing.sm
  },
  badgeText: { fontSize: 12, fontWeight: "800" },
  metaGrid: { marginTop: spacing.sm },
  sectionTitle: { fontSize: 16, fontWeight: "800", marginBottom: spacing.sm },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm
  }
});
