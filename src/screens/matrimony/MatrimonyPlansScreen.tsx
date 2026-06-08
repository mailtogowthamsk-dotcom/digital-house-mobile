import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Alert, Pressable } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getMatrimonyHub,
  type MatrimonyPlanCatalogItem,
  type MatrimonySubscriptionSummary
} from "../../api/matrimony.api";
import { useAuth } from "../../context/AuthContext";
import { checkoutMatrimonySubscription } from "../../services/matrimonyCheckout";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { MatrimonyScreenHeader } from "../../components/matrimony/MatrimonyScreenHeader";
import { PrimaryButton } from "../../components/ui/PrimaryButton";

export function MatrimonyPlansScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [plans, setPlans] = useState<MatrimonyPlanCatalogItem[]>([]);
  const [subscription, setSubscription] = useState<MatrimonySubscriptionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const hub = await getMatrimonyHub();
      setPlans(hub.plans ?? []);
      setSubscription(hub.subscription ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const onSubscribe = (plan: "GOLD" | "PLATINUM") => {
    Alert.alert(`Subscribe to ${plan}`, "You will complete payment in Razorpay (or dev mode if enabled).", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Continue",
        onPress: async () => {
          setActing(true);
          try {
            const res = await checkoutMatrimonySubscription(plan, {
              name: user?.fullName ?? undefined,
              email: user?.email ?? undefined
            });
            Alert.alert("Success", res.message ?? `${plan} plan activated.`);
            await load();
          } catch (e) {
            Alert.alert("Payment", e instanceof Error ? e.message : "Failed");
          } finally {
            setActing(false);
          }
        }
      }
    ]);
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <MatrimonyScreenHeader title="Choose a plan" onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}>
        <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 20, marginBottom: spacing.md }}>
          Open full profiles with photos and horoscope. Contact reveal (₹500) is separate after mutual match.
        </Text>

        {subscription ? (
          <View style={[styles.current, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}>
            <Text style={{ fontWeight: "800", color: "#1D4ED8" }}>
              Current: {subscription.planLabel}
              {subscription.expiresAt
                ? ` · until ${new Date(subscription.expiresAt).toLocaleDateString()}`
                : ""}
            </Text>
            {subscription.quota.limit > 0 ? (
              <Text style={{ color: "#1D4ED8", fontSize: 12, marginTop: 4 }}>
                Opens this month: {subscription.quota.used} / {subscription.quota.limit}
              </Text>
            ) : null}
          </View>
        ) : null}

        {plans.map((p) => {
          const isCurrent = subscription?.plan === p.plan;
          const isPaid = p.plan === "GOLD" || p.plan === "PLATINUM";
          const border =
            p.plan === "GOLD" ? "#D97706" : p.plan === "PLATINUM" ? "#7C3AED" : colors.border;
          return (
            <View
              key={p.plan}
              style={[
                styles.planCard,
                { backgroundColor: colors.surface, borderColor: border }
              ]}
            >
              <View style={styles.planHead}>
                <Text style={[styles.planName, p.plan === "GOLD" && { color: "#D97706" }, p.plan === "PLATINUM" && { color: "#7C3AED" }]}>
                  {p.label}
                </Text>
                {p.popular ? (
                  <Text style={styles.popular}>Popular</Text>
                ) : isCurrent ? (
                  <Text style={styles.currentBadge}>Current</Text>
                ) : null}
              </View>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{p.tagline}</Text>
              {p.priceInr > 0 ? (
                <Text style={[styles.price, p.plan === "GOLD" && { color: "#D97706" }, p.plan === "PLATINUM" && { color: "#7C3AED" }]}>
                  ₹{p.priceInr.toLocaleString("en-IN")}
                  <Text style={{ fontSize: 12, fontWeight: "600" }}> / {p.durationMonths} mo</Text>
                </Text>
              ) : (
                <Text style={[styles.price, { color: colors.text }]}>Always free</Text>
              )}
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 8 }}>
                {p.opensPerMonth > 0 ? `· ${p.opensPerMonth} profile opens / month` : "· Browse cards only"}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                {p.canOpenTwoStar ? "· ★☆ and ★★ profiles" : p.canOpenOneStar ? "· ★☆ profiles only" : "· No full profile opens"}
              </Text>
              {p.whoViewedMe ? (
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>· Who viewed me</Text>
              ) : null}
              <Text style={{ fontSize: 12, color: "#D97706", marginTop: 6 }}>· Contact ₹500 per profile (after match)</Text>

              {isPaid && !isCurrent ? (
                <PrimaryButton
                  title={`Subscribe — ₹${p.priceInr}`}
                  onPress={() => onSubscribe(p.plan as "GOLD" | "PLATINUM")}
                  loading={acting}
                  style={{ marginTop: spacing.md }}
                />
              ) : null}
            </View>
          );
        })}

        <View style={[styles.note, { backgroundColor: "#FFFBEB", borderColor: "#FCD34D" }]}>
          <Text style={{ color: "#92400E", fontSize: 12, lineHeight: 18 }}>
            Production: integrate Razorpay UPI/card. Subscriptions and contact payments will use secure checkout.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  current: {
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  planCard: {
    borderRadius: radius.lg,
    borderWidth: 2,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  planHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  planName: { fontSize: 18, fontWeight: "800" },
  popular: {
    backgroundColor: "#FEF3C7",
    color: "#D97706",
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10
  },
  currentBadge: {
    backgroundColor: "#DCFCE7",
    color: "#16A34A",
    fontSize: 10,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10
  },
  price: { fontSize: 24, fontWeight: "800", marginTop: 8 },
  note: { borderRadius: radius.md, borderWidth: 1, padding: spacing.md, marginTop: spacing.sm }
});
