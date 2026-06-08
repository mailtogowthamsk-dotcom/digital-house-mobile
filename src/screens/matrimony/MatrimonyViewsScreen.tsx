import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getMatrimonyHub, getMatrimonyProfileViews } from "../../api/matrimony.api";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { MatrimonyScreenHeader } from "../../components/matrimony/MatrimonyScreenHeader";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { MatrimonyBrowseGate } from "../../components/matrimony/MatrimonyBrowseGate";

function parseApiError(e: unknown): { message: string; code?: string } {
  const err = e as {
    response?: { status?: number; data?: { message?: string; code?: string } };
    message?: string;
  };
  return {
    message: err.response?.data?.message ?? err.message ?? "Failed to load",
    code: err.response?.data?.code
  };
}

export function MatrimonyViewsScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [items, setItems] = useState<Awaited<ReturnType<typeof getMatrimonyProfileViews>>>([]);
  const [loading, setLoading] = useState(true);
  const [needsPlatinum, setNeedsPlatinum] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setNeedsPlatinum(false);
    try {
      const hub = await getMatrimonyHub();
      if (hub.subscription?.plan !== "PLATINUM") {
        setNeedsPlatinum(true);
        setItems([]);
        return;
      }
      setItems(await getMatrimonyProfileViews());
    } catch (e) {
      const { message, code } = parseApiError(e);
      if (code === "PLATINUM_REQUIRED" || message.toLowerCase().includes("platinum")) {
        setNeedsPlatinum(true);
        setItems([]);
      } else {
        setNeedsPlatinum(false);
        setItems([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  return (
    <MatrimonyBrowseGate>
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <MatrimonyScreenHeader title="Who viewed me" onBack={() => navigation.goBack()} />

      <View style={[styles.banner, { backgroundColor: "#EDE9FE" }]}>
        <Text style={{ fontWeight: "800", color: "#5B21B6", fontSize: 13 }}>Platinum feature</Text>
        <Text style={{ color: "#6D28D9", fontSize: 12, marginTop: 4, lineHeight: 17 }}>
          See members who opened your full profile in the last 30 days.
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 32 }} color={colors.primary} />
      ) : needsPlatinum ? (
        <View style={{ padding: spacing.lg, alignItems: "center", marginTop: 24 }}>
          <Text style={{ fontSize: 48, marginBottom: 12 }}>💎</Text>
          <Text style={{ fontWeight: "800", fontSize: 17, color: colors.text, textAlign: "center" }}>
            Upgrade to Platinum
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              textAlign: "center",
              marginTop: 10,
              lineHeight: 20,
              fontSize: 14
            }}
          >
            Gold plan opens profiles but does not include “Who viewed me”. Subscribe to Platinum to unlock
            this list.
          </Text>
          <PrimaryButton
            title="View Platinum plan"
            onPress={() => navigation.navigate("MatrimonyPlans")}
            style={{ marginTop: spacing.lg, alignSelf: "stretch", width: "100%" }}
          />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => String(i.viewerId)}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", color: colors.textSecondary, lineHeight: 20 }}>
              No one has opened your profile yet this month. Stay active in browse — views appear when
              someone opens your full profile.
            </Text>
          }
          renderItem={({ item }) => (
            <Pressable
              style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() =>
                navigation.navigate("MatrimonyCandidate", {
                  userId: item.viewerId,
                  fromWhoViewedMe: true
                })
              }
            >
              <View style={[styles.av, { backgroundColor: colors.primary }]}>
                <Text style={{ color: "#fff", fontWeight: "800" }}>{item.name.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "800", color: colors.text }}>
                  {item.name}
                  {item.age != null ? ` · ${item.age}` : ""}
                </Text>
                {item.district ? (
                  <Text style={{ fontSize: 12, color: colors.textSecondary }}>{item.district}</Text>
                ) : null}
                <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 4 }}>
                  {item.starLabel} · {new Date(item.viewedAt).toLocaleString()}
                </Text>
              </View>
              <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 12 }}>View</Text>
            </Pressable>
          )}
        />
      )}
    </View>
    </MatrimonyBrowseGate>
  );
}

const styles = StyleSheet.create({
  banner: { margin: spacing.lg, marginBottom: 0, padding: spacing.md, borderRadius: radius.md },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm
  },
  av: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center"
  }
});
