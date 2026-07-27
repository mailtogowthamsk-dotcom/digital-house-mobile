import React, { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getMatrimonyMatches, removeMatrimonyMatch } from "../../api/matrimony.api";
import { getImageUrl } from "../../api/client";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { MatrimonyScreenHeader } from "../../components/matrimony/MatrimonyScreenHeader";
import { MatrimonyBrowseGate } from "../../components/matrimony/MatrimonyBrowseGate";
import { appAlert } from "../../utils/appAlert";

type MatchRow = {
  matchId: number;
  chatEnabled: boolean;
  horoscopeShared?: boolean;
  candidate: {
    userId: number;
    name: string;
    photoUrl?: string | null;
    district?: string | null;
  };
};

export function MatrimonyMatchesScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [items, setItems] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingUserId, setActingUserId] = useState<number | null>(null);

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
      void load();
    }, [load])
  );

  const confirmRemoveMatch = (otherUserId: number, name: string) => {
    appAlert(
      "Remove match?",
      `Chat with ${name} will be disabled for both of you.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove match",
          style: "destructive",
          onPress: async () => {
            setActingUserId(otherUserId);
            try {
              await removeMatrimonyMatch(otherUserId);
              setItems((prev) => prev.filter((m) => m.candidate.userId !== otherUserId));
            } catch (e) {
              appAlert("Remove match", e instanceof Error ? e.message : "Failed");
            } finally {
              setActingUserId(null);
            }
          }
        }
      ]
    );
  };

  return (
    <MatrimonyBrowseGate>
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <MatrimonyScreenHeader title="Mutual matches" onBack={() => navigation.goBack()} />
      {loading ? (
        <ActivityIndicator style={{ marginTop: 32 }} color={colors.primary} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i, index) => `match-${i.matchId}-${index}`}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}
          ListHeaderComponent={
            items.length > 0 ? (
              <View style={styles.banner}>
                <Text style={styles.bannerTitle}>Your matches</Text>
                <Text style={styles.bannerBody}>
                  Open a match to chat, share horoscope, or reveal contact. You can remove a match anytime.
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={{ fontWeight: "800", color: colors.text, fontSize: 16 }}>No mutual matches yet</Text>
              <Text style={{ color: colors.textSecondary, textAlign: "center", marginTop: 8, lineHeight: 20 }}>
                When you and another member both send and accept interest, they appear here with chat unlocked.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const uri = item.candidate.photoUrl
              ? getImageUrl(item.candidate.photoUrl) ?? item.candidate.photoUrl
              : null;
            const busy = actingUserId === item.candidate.userId;
            return (
              <Pressable
                style={[styles.card, { backgroundColor: colors.surface, borderColor: "#86EFAC" }]}
                onPress={() =>
                  navigation.navigate("MatrimonyCandidate", { userId: item.candidate.userId })
                }
              >
                {uri ? (
                  <Image source={{ uri }} cachePolicy="memory-disk" contentFit="cover" style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.thumbPh, { backgroundColor: colors.border }]}>
                    <Text style={{ fontSize: 22 }}>👤</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "800", color: colors.text, fontSize: 15 }}>
                    {item.candidate.name}
                  </Text>
                  {item.candidate.district ? (
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>
                      {item.candidate.district}
                    </Text>
                  ) : null}
                  <View style={{ flexDirection: "row", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                    <Text style={styles.matchedPill}>Matched</Text>
                    {item.chatEnabled ? (
                      <Text style={[styles.matchedPill, { backgroundColor: "#EFF6FF", color: "#2563EB" }]}>
                        Chat on
                      </Text>
                    ) : null}
                  </View>
                </View>
                <View style={{ alignItems: "flex-end", gap: 8 }}>
                  {item.chatEnabled ? (
                    <Pressable
                      onPress={(e) => {
                        e.stopPropagation?.();
                        navigation.navigate("Chat", {
                          otherUserId: item.candidate.userId,
                          name: item.candidate.name,
                          profileImage: item.candidate.photoUrl
                        });
                      }}
                      style={[styles.chatBtn, { backgroundColor: colors.primary }]}
                      disabled={busy}
                    >
                      <Text style={{ color: "#fff", fontWeight: "700", fontSize: 11 }}>Chat</Text>
                    </Pressable>
                  ) : null}
                  <Pressable
                    onPress={(e) => {
                      e.stopPropagation?.();
                      confirmRemoveMatch(item.candidate.userId, item.candidate.name);
                    }}
                    style={styles.removeBtn}
                    disabled={busy}
                  >
                    <Text style={{ color: "#B91C1C", fontWeight: "700", fontSize: 11 }}>
                      {busy ? "…" : "Remove"}
                    </Text>
                  </Pressable>
                  <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 12 }}>Profile →</Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}
    </View>
    </MatrimonyBrowseGate>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "#DCFCE7",
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: "#86EFAC"
  },
  bannerTitle: { fontSize: 15, fontWeight: "800", color: "#14532D" },
  bannerBody: { fontSize: 12, color: "#166534", marginTop: 4, lineHeight: 18 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm
  },
  thumb: { width: 56, height: 56, borderRadius: radius.md },
  thumbPh: { alignItems: "center", justifyContent: "center" },
  matchedPill: {
    fontSize: 10,
    fontWeight: "700",
    backgroundColor: "#DCFCE7",
    color: "#16A34A",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: "hidden"
  },
  empty: { alignItems: "center", marginTop: 48, paddingHorizontal: spacing.lg },
  chatBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  removeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2"
  }
});
