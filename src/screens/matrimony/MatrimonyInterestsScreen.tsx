import React, { useCallback, useState } from "react";
import { View, Text, FlatList, Pressable, StyleSheet, ActivityIndicator, Alert } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getMatrimonyInterestsReceived,
  getMatrimonyInterestsSent,
  respondMatrimonyInterest
} from "../../api/matrimony.api";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { MatrimonyScreenHeader } from "../../components/matrimony/MatrimonyScreenHeader";
import { MatrimonyBrowseGate } from "../../components/matrimony/MatrimonyBrowseGate";

type InterestRow = {
  id: number;
  status: string;
  introMessage?: string | null;
  candidate: { userId: number; name: string; district?: string | null; age?: number | null };
};

function statusStyle(status: string): { bg: string; fg: string; label: string } {
  switch (status) {
    case "PENDING":
      return { bg: "#FEF3C7", fg: "#D97706", label: "Pending" };
    case "ACCEPTED":
      return { bg: "#DCFCE7", fg: "#16A34A", label: "Accepted" };
    case "DECLINED":
      return { bg: "#FEE2E2", fg: "#DC2626", label: "Declined" };
    default:
      return { bg: "#F3F4F6", fg: "#6B7280", label: status };
  }
}

export function MatrimonyInterestsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [tab, setTab] = useState<"received" | "sent">("received");
  const [items, setItems] = useState<InterestRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<number | null>(null);

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
      void load();
    }, [load])
  );

  const respond = async (interestId: number, action: "ACCEPT" | "DECLINE") => {
    setActingId(interestId);
    try {
      await respondMatrimonyInterest(interestId, action);
      await load();
      if (action === "ACCEPT") {
        Alert.alert("Interest accepted", "You are now matched. Open chat from Matches.");
      }
    } catch (e: unknown) {
      Alert.alert("Could not respond", e instanceof Error ? e.message : "Try again");
    } finally {
      setActingId(null);
    }
  };

  return (
    <MatrimonyBrowseGate>
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <MatrimonyScreenHeader
          title="Interests"
          onBack={() => navigation.goBack()}
          rightLabel="Matches"
          onRightPress={() => navigation.navigate("MatrimonyMatches")}
        />
        <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
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
            keyExtractor={(i) => `interest-${i.id}`}
            contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}
            ListEmptyComponent={
              <View style={styles.empty}>
                <Text style={{ fontSize: 40, marginBottom: 12 }}>💌</Text>
                <Text style={{ fontWeight: "800", color: colors.text, fontSize: 16 }}>No interests yet</Text>
                <Text style={{ color: colors.textSecondary, textAlign: "center", marginTop: 8, lineHeight: 20 }}>
                  Browse profiles and tap Express interest. Received interests appear here for you to accept.
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const st = statusStyle(item.status);
              const initial = item.candidate.name?.charAt(0) ?? "?";
              const pendingReceived = tab === "received" && item.status === "PENDING";
              return (
                <Pressable
                  style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() =>
                    navigation.navigate("MatrimonyCandidate", {
                      userId: item.candidate.userId,
                      interestId: pendingReceived ? item.id : undefined
                    })
                  }
                >
                  <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
                    <Text style={{ color: "#fff", fontWeight: "800", fontSize: 18 }}>{initial}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: "800", color: colors.text, fontSize: 15 }}>
                      {item.candidate.name}
                      {item.candidate.age != null ? ` · ${item.candidate.age}` : ""}
                    </Text>
                    {item.candidate.district ? (
                      <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>
                        {item.candidate.district}
                      </Text>
                    ) : null}
                    {item.introMessage ? (
                      <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 6, fontStyle: "italic" }} numberOfLines={2}>
                        "{item.introMessage}"
                      </Text>
                    ) : null}
                    {pendingReceived ? (
                      <View style={styles.actions}>
                        <Pressable
                          style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                          disabled={actingId === item.id}
                          onPress={(e) => {
                            e.stopPropagation?.();
                            void respond(item.id, "ACCEPT");
                          }}
                        >
                          <Text style={{ color: "#fff", fontWeight: "700", fontSize: 12 }}>
                            {actingId === item.id ? "…" : "Accept"}
                          </Text>
                        </Pressable>
                        <Pressable
                          style={[styles.actionBtn, { backgroundColor: colors.surfaceElevated, borderColor: colors.border, borderWidth: 1 }]}
                          disabled={actingId === item.id}
                          onPress={(e) => {
                            e.stopPropagation?.();
                            void respond(item.id, "DECLINE");
                          }}
                        >
                          <Text style={{ color: colors.text, fontWeight: "700", fontSize: 12 }}>Decline</Text>
                        </Pressable>
                      </View>
                    ) : null}
                  </View>
                  <View style={{ backgroundColor: st.bg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}>
                    <Text style={{ color: st.fg, fontSize: 11, fontWeight: "700" }}>{st.label}</Text>
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
  tabs: { flexDirection: "row", paddingHorizontal: spacing.lg, borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, paddingVertical: 12, alignItems: "center" },
  card: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center"
  },
  actions: { flexDirection: "row", gap: 8, marginTop: 10 },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  empty: { alignItems: "center", marginTop: 48, paddingHorizontal: spacing.lg }
});
