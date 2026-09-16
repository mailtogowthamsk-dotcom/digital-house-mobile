import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Pressable
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useTheme } from "../../theme/ThemeContext";
import { spacing } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { listAvailableBenefits, type PublicBenefit } from "../../api/business.api";
import { getAuthErrorMessage } from "../../api/client";
import { BenefitCard, publicBenefitToCardProps } from "../../components/business/BenefitCard";
import { PrimaryButton } from "../../components/ui/PrimaryButton";

export function MemberBenefitsBrowseScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();
  const [items, setItems] = useState<PublicBenefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      setItems(await listAvailableBenefits());
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
        },
        claimsLink: {
          ...typography.caption,
          color: colors.primary,
          fontWeight: "700",
          textAlign: "center",
          marginBottom: spacing.lg
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
        ListHeaderComponent={
          <Pressable onPress={() => navigation.navigate("MyBenefitClaims")}>
            <Text style={s.claimsLink}>My Claims</Text>
          </Pressable>
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
            <Text style={s.empty}>No member benefits available</Text>
          )
        }
        renderItem={({ item }) => (
          <BenefitCard
            {...publicBenefitToCardProps(item)}
            onPress={() => navigation.navigate("BusinessBenefitDetail", { benefitId: item.id })}
            ctaLabel={item.myClaim ? (item.myClaim.status === "USED" ? "Used" : "View Claim") : "View Benefit"}
          />
        )}
      />
    </View>
  );
}
