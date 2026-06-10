import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import {
  acceptConnectionRequest,
  listConnectionRequests,
  listConnections,
  rejectConnectionRequest,
  type ConnectionItem
} from "../../api/connections.api";
import { getImageUrl } from "../../api/client";
import { AvatarImage } from "../../components/ui/AvatarImage";
import { formatUsername } from "../../utils/username";
import { appAlert } from "../../utils/appAlert";

type Tab = "requests" | "connections";

function ConnectionRow({
  item,
  colors,
  onPress,
  trailing
}: {
  item: ConnectionItem;
  colors: any;
  onPress: () => void;
  trailing?: React.ReactNode;
}) {
  return (
    <Pressable
      style={[styles.row, { borderBottomColor: colors.border }]}
      onPress={onPress}
    >
      <AvatarImage
        uri={getImageUrl(item.user.profileImage)}
        name={item.user.fullName}
        size={48}
        placeholderColor={colors.surfaceElevated}
        textColor={colors.textMuted}
      />
      <View style={styles.rowText}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {item.user.fullName}
        </Text>
        <Text style={[styles.username, { color: colors.primary }]} numberOfLines={1}>
          {formatUsername(item.user.username)}
        </Text>
      </View>
      {trailing}
    </Pressable>
  );
}

export function ConnectionsScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [tab, setTab] = useState<Tab>("requests");
  const [requests, setRequests] = useState<ConnectionItem[]>([]);
  const [connections, setConnections] = useState<ConnectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [reqs, conns] = await Promise.all([
        listConnectionRequests(),
        listConnections()
      ]);
      setRequests(reqs);
      setConnections(conns);
    } catch {
      setRequests([]);
      setConnections([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const openProfile = (item: ConnectionItem) => {
    navigation.navigate("MemberProfile", {
      userId: item.user.id,
      username: item.user.username
    });
  };

  const handleAccept = async (item: ConnectionItem) => {
    setActingId(item.user.id);
    try {
      await acceptConnectionRequest(item.user.id);
      await load();
    } catch (e: unknown) {
      appAlert("Error", e instanceof Error ? e.message : "Could not accept request");
    } finally {
      setActingId(null);
    }
  };

  const handleReject = (item: ConnectionItem) => {
    appAlert("Decline request?", `Decline connection request from ${item.user.fullName}?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Decline",
        style: "destructive",
        onPress: async () => {
          setActingId(item.user.id);
          try {
            await rejectConnectionRequest(item.user.id);
            await load();
          } catch (e: unknown) {
            appAlert("Error", e instanceof Error ? e.message : "Could not decline request");
          } finally {
            setActingId(null);
          }
        }
      }
    ]);
  };

  const data = tab === "requests" ? requests : connections;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.tabs, { borderBottomColor: colors.border }]}>
        <Pressable
          style={[styles.tab, tab === "requests" && { borderBottomColor: colors.primary }]}
          onPress={() => setTab("requests")}
        >
          <Text
            style={[
              styles.tabLabel,
              { color: tab === "requests" ? colors.primary : colors.textSecondary }
            ]}
          >
            Requests{requests.length > 0 ? ` (${requests.length})` : ""}
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === "connections" && { borderBottomColor: colors.primary }]}
          onPress={() => setTab("connections")}
        >
          <Text
            style={[
              styles.tabLabel,
              { color: tab === "connections" ? colors.primary : colors.textSecondary }
            ]}
          >
            Connected
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.xl }} color={colors.primary} />
      ) : data.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons
            name={tab === "requests" ? "mail-open-outline" : "people-outline"}
            size={42}
            color={colors.textSecondary}
          />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            {tab === "requests"
              ? "No pending connection requests."
              : "No connections yet. Send requests from member profiles."}
          </Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) =>
            tab === "requests" ? (
              <ConnectionRow
                item={item}
                colors={colors}
                onPress={() => openProfile(item)}
                trailing={
                  <View style={styles.actions}>
                    <Pressable
                      style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                      onPress={() => void handleAccept(item)}
                      disabled={actingId === item.user.id}
                    >
                      {actingId === item.user.id ? (
                        <ActivityIndicator color={colors.white} size="small" />
                      ) : (
                        <Text style={[styles.actionText, { color: colors.white }]}>Accept</Text>
                      )}
                    </Pressable>
                    <Pressable
                      style={[styles.actionBtn, { backgroundColor: colors.surfaceElevated }]}
                      onPress={() => handleReject(item)}
                      disabled={actingId === item.user.id}
                    >
                      <Text style={[styles.actionText, { color: colors.text }]}>Decline</Text>
                    </Pressable>
                  </View>
                }
              />
            ) : (
              <ConnectionRow
                item={item}
                colors={colors}
                onPress={() => openProfile(item)}
                trailing={
                  <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                }
              />
            )
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: "row", borderBottomWidth: StyleSheet.hairlineWidth },
  tab: {
    flex: 1,
    alignItems: "center",
    paddingVertical: spacing.md,
    borderBottomWidth: 2,
    borderBottomColor: "transparent"
  },
  tabLabel: { fontSize: 15, fontWeight: "700" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  rowText: { flex: 1, minWidth: 0 },
  name: { fontSize: 16, fontWeight: "800" },
  username: { fontSize: 14, fontWeight: "600", marginTop: 2 },
  actions: { flexDirection: "row", gap: spacing.sm },
  actionBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    minWidth: 72,
    alignItems: "center"
  },
  actionText: { fontSize: 13, fontWeight: "700" },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  emptyText: { marginTop: spacing.md, textAlign: "center", lineHeight: 20 }
});
