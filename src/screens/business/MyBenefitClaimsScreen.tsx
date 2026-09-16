import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useTheme } from "../../theme/ThemeContext";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { listMyBenefitClaims, type BenefitClaim } from "../../api/business.api";
import { getAuthErrorMessage } from "../../api/client";
import { BenefitCard } from "../../components/business/BenefitCard";
import { PrimaryButton } from "../../components/ui/PrimaryButton";

export function MyBenefitClaimsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<BenefitClaim[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setItems(await listMyBenefitClaims());
    } catch (e: unknown) {
      setError(getAuthErrorMessage(e));
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

  const s = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        pad: { padding: spacing.lg, flexGrow: 1 },
        empty: {
          ...typography.body,
          color: colors.textSecondary,
          textAlign: "center",
          marginTop: 48
        },
        error: {
          ...typography.body,
          color: colors.error,
          textAlign: "center",
          marginTop: 48,
          marginBottom: spacing.md
        }
      }),
    [colors]
  );

  return (
    <View style={s.container}>
      <FlatList
        data={items}
        keyExtractor={(i) => String(i.id)}
        contentContainerStyle={s.pad}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void load();
            }}
          />
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          ) : error ? (
            <View>
              <Text style={s.error}>{error || "Unable to load claims."}</Text>
              <PrimaryButton title="Try Again" variant="outline" onPress={() => void load()} />
            </View>
          ) : (
            <Text style={s.empty}>No claimed benefits yet</Text>
          )
        }
        renderItem={({ item }) => (
          <BenefitCard
            title={item.benefitTitle ?? "Benefit"}
            value={item.benefitValue ?? item.claimCode}
            businessName={item.businessName}
            validUntil={item.validUntil ?? item.expiresAt}
            claimStatus={item.status}
            onPress={() => navigation.navigate("BenefitClaimDetail", { claimId: item.id })}
            ctaLabel="Show Claim Code"
          />
        )}
      />
    </View>
  );
}
