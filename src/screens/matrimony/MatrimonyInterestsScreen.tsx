import React, { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getMatrimonyInterestsReceived, getMatrimonyInterestsSent } from "../../api/matrimony.api";
import { useTheme } from "../../theme/ThemeContext";
import { spacing } from "../../theme/spacing";

type InterestRow = {
  id: number;
  status: string;
  candidate: { userId: number; name: string };
};

export function MatrimonyInterestsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [tab, setTab] = useState<"received" | "sent">("received");
  const [items, setItems] = useState<InterestRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const raw =
        tab === "received"
          ? await getMatrimonyInterestsReceived()
          : await getMatrimonyInterestsSent();
      setItems(raw as InterestRow[]);
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={{ color: colors.primary, fontWeight: "700" }}>← Back</Text>
        </Pressable>
        <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>Interests</Text>
        <Pressable onPress={() => navigation.navigate("MatrimonyMatches")}>
          <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}>Matches</Text>
        </Pressable>
      </View>
      <View style={styles.tabs}>
        {(["received", "sent"] as const).map((t) => (
          <Pressable
            key={t}
            onPress={() => setTab(t)}
            style={[styles.tab, tab === t && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
          >
            <Text style={{ fontWeight: "700", color: tab === t ? colors.primary : colors.textSecondary }}>
              {t === "received" ? "Received" : "Sent"}
            </Text>
          </Pressable>
        ))}
      </View>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 32 }} color={colors.primary} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => String(i.id)}
          contentContainerStyle={{ padding: spacing.lg }}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", color: colors.textSecondary }}>No interests yet</Text>
          }
          renderItem={({ item }) => (
            <Pressable
              style={[styles.row, { borderColor: colors.border }]}
              onPress={() =>
                navigation.navigate("MatrimonyCandidate", {
                  userId: item.candidate.userId,
                  interestId: tab === "received" && item.status === "PENDING" ? item.id : undefined
                })
              }
            >
              <Text style={{ fontWeight: "700", color: colors.text }}>{item.candidate.name}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>{item.status}</Text>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: spacing.lg
  },
  tabs: { flexDirection: "row", paddingHorizontal: spacing.lg },
  tab: { flex: 1, paddingVertical: 10, alignItems: "center" },
  row: {
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm
  }
});
