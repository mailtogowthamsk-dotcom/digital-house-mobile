import React, { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, Image } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getMatrimonyMatches } from "../../api/matrimony.api";
import { getImageUrl } from "../../api/client";
import { useTheme } from "../../theme/ThemeContext";
import { spacing } from "../../theme/spacing";

type MatchRow = {
  matchId: number;
  chatEnabled: boolean;
  candidate: { userId: number; name: string; photoUrl?: string | null };
};

export function MatrimonyMatchesScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [items, setItems] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems((await getMatrimonyMatches()) as MatchRow[]);
    } finally {
      setLoading(false);
    }
  }, []);

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
        <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text }}>Mutual matches</Text>
        <View style={{ width: 48 }} />
      </View>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 32 }} color={colors.primary} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => String(i.matchId)}
          contentContainerStyle={{ padding: spacing.lg }}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", color: colors.textSecondary, lineHeight: 22 }}>
              Mutual matches appear when both parties send and accept interest.
            </Text>
          }
          renderItem={({ item }) => {
            const uri = item.candidate.photoUrl
              ? getImageUrl(item.candidate.photoUrl) ?? item.candidate.photoUrl
              : null;
            return (
              <Pressable
                style={[styles.row, { borderColor: colors.border }]}
                onPress={() =>
                  navigation.navigate("MatrimonyCandidate", { userId: item.candidate.userId })
                }
              >
                {uri ? <Image source={{ uri }} style={styles.thumb} /> : null}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "800", color: colors.text }}>{item.candidate.name}</Text>
                  {item.chatEnabled && (
                    <Text style={{ color: colors.primary, fontSize: 12, marginTop: 4 }}>Chat unlocked</Text>
                  )}
                </View>
              </Pressable>
            );
          }}
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
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: spacing.md,
    marginBottom: spacing.sm
  },
  thumb: { width: 56, height: 56, borderRadius: 8 }
});
