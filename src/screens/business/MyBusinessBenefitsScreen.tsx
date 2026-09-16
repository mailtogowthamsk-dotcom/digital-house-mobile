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
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { listMyBusinessBenefits, type OwnerBenefit } from "../../api/business.api";
import { getAuthErrorMessage } from "../../api/client";
import { BenefitCard, ownerBenefitToCardProps } from "../../components/business/BenefitCard";

export function MyBusinessBenefitsScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<OwnerBenefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setItems(await listMyBusinessBenefits());
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
        actions: { gap: spacing.sm, marginBottom: spacing.lg },
        empty: {
          ...typography.body,
          color: colors.textSecondary,
          textAlign: "center",
          marginTop: 24
        },
        error: {
          ...typography.body,
          color: colors.error,
          textAlign: "center",
          marginTop: 24,
          marginBottom: spacing.md
        },
        note: { ...typography.caption, color: colors.error, marginTop: -spacing.sm, marginBottom: spacing.md }
      }),
    [colors]
  );

  return (
    <View style={s.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => String(item.id)}
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
        ListHeaderComponent={
          <View style={s.actions}>
            <PrimaryButton
              title="Create Benefit"
              onPress={() => navigation.navigate("CreateBusinessBenefit")}
            />
            <PrimaryButton
              title="Verify Claim Code"
              variant="outline"
              onPress={() => navigation.navigate("VerifyBenefitClaim")}
            />
          </View>
        }
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
          ) : error ? (
            <View>
              <Text style={s.error}>{error || "Unable to load member benefits."}</Text>
              <PrimaryButton title="Try Again" variant="outline" onPress={() => void load()} />
            </View>
          ) : (
            <Text style={s.empty}>You haven't created any member benefits yet.</Text>
          )
        }
        renderItem={({ item }) => (
          <View>
            <BenefitCard
              {...ownerBenefitToCardProps(item)}
              onPress={() =>
                navigation.navigate("CreateBusinessBenefit", { benefitId: item.id, mode: "edit" })
              }
              ctaLabel="Manage"
            />
            {item.status === "REJECTED" && item.adminNote ? (
              <Text style={s.note}>{item.adminNote}</Text>
            ) : null}
          </View>
        )}
      />
    </View>
  );
}
