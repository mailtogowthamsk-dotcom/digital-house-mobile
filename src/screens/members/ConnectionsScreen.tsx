import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, FlatList, Pressable, ActivityIndicator, useWindowDimensions } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { spacing } from "../../theme/spacing";
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

const CONNECTION_TABS = [
  { id: "requests", label: "Requests" },
  { id: "connections", label: "Connected" }
] as const;

function ConnectionRow({
  item,
  onPress,
  actions
}: {
  item: ConnectionItem;
  onPress: () => void;
  actions?: React.ReactNode;
}) {
  const { colors } = useTheme();
  const { width, fontScale } = useWindowDimensions();
  const stacked = Boolean(actions && (width < 360 || fontScale > 1.3));

  return (
    <View style={[
      styles.row,
      stacked && styles.rowStacked,
      { backgroundColor: colors.surface }
    ]}>
      <Pressable
        style={({ pressed }) => [styles.member, stacked && styles.memberStacked, pressed && styles.pressed]}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`View ${item.user.fullName}'s profile`}
      >
        <AvatarImage
          uri={getImageUrl(item.user.profileImage)}
          name={item.user.fullName}
          size={36}
          placeholderColor={colors.surfaceElevated}
          textColor={colors.textMuted}
        />
        <View style={styles.rowText}>
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
            {item.user.fullName}
          </Text>
          {item.user.username ? (
            <Text style={[styles.username, { color: colors.textSecondary }]} numberOfLines={1}>
              {formatUsername(item.user.username)}
            </Text>
          ) : null}
        </View>
        {!actions ? <Ionicons name="chevron-forward" size={16} color={colors.textMuted} /> : null}
      </Pressable>
      {actions}
    </View>
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
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={[styles.tabs, { backgroundColor: colors.surfaceElevated }]} accessibilityRole="tablist">
          {CONNECTION_TABS.map(({ id, label }) => {
            const selected = tab === id;
            const count = id === "requests" ? requests.length : connections.length;
            const color = selected ? colors.primary : colors.textSecondary;
            return (
              <Pressable
                key={id}
                style={({ pressed }) => [styles.tab, selected && { backgroundColor: colors.primary + "16" }, pressed && styles.pressed]}
                onPress={() => setTab(id)}
                accessibilityRole="tab"
                accessibilityState={{ selected }}
                accessibilityLabel={count ? `${label}, ${count}` : label}
              >
                <Text
                  style={[styles.tabLabel, { color }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                >
                  {label}
                  {count > 0 ? <Text style={styles.tabCount}>{` · ${count > 99 ? "99+" : count}`}</Text> : null}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {loading ? (
          <ActivityIndicator style={styles.loader} color={colors.primary} accessibilityLabel="Loading connections" />
        ) : data.length === 0 ? (
          <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={[styles.emptyIcon, { backgroundColor: colors.surfaceElevated }]}>
              <Ionicons name={tab === "requests" ? "mail-open-outline" : "people-outline"} size={24} color={colors.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {tab === "requests" ? "No pending requests" : "No connections yet"}
            </Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              {tab === "requests"
                ? "New connection requests will appear here."
                : "You can send a request from a member’s profile."}
            </Text>
          </View>
        ) : (
          <FlatList
            data={data}
            style={styles.list}
            contentContainerStyle={[styles.listGroup, { borderColor: colors.border }]}
            ItemSeparatorComponent={() => (
              <View style={[styles.separator, { backgroundColor: colors.border }]} />
            )}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <ConnectionRow
                item={item}
                onPress={() => openProfile(item)}
                actions={tab === "requests" ? (
                  <View style={styles.actions}>
                    <Pressable
                      style={({ pressed }) => [styles.actionBtn, { backgroundColor: colors.primary + "16" }, pressed && styles.pressed]}
                      onPress={() => void handleAccept(item)}
                      disabled={actingId === item.user.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Accept request from ${item.user.fullName}`}
                    >
                      {actingId === item.user.id ? (
                        <ActivityIndicator color={colors.primary} size="small" />
                      ) : (
                        <Text style={[styles.actionText, { color: colors.primary }]}>Accept</Text>
                      )}
                    </Pressable>
                    <Pressable
                      style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
                      onPress={() => handleReject(item)}
                      disabled={actingId === item.user.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Decline request from ${item.user.fullName}`}
                    >
                      <Text style={[styles.actionText, { color: colors.textSecondary }]}>Decline</Text>
                    </Pressable>
                  </View>
                ) : undefined}
              />
            )}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { flex: 1, width: "100%", maxWidth: 620, alignSelf: "center" },
  tabs: {
    flexDirection: "row",
    gap: 4,
    borderRadius: 16,
    padding: 3,
    margin: spacing.md
  },
  tab: {
    flex: 1,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "stretch",
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 10
  },
  tabLabel: { fontSize: 13, fontWeight: "700", textAlign: "center" },
  tabCount: { fontWeight: "600", fontVariant: ["tabular-nums"] },
  loader: { marginTop: spacing.lg },
  list: { marginHorizontal: spacing.md },
  listGroup: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    marginBottom: spacing.lg
  },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 52, marginRight: spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs
  },
  rowStacked: { flexDirection: "column", alignItems: "stretch" },
  pressed: { opacity: 0.72 },
  member: { flex: 1, minWidth: 0, minHeight: 44, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  memberStacked: { flexGrow: 0, flexBasis: "auto" },
  rowText: { flex: 1, minWidth: 0 },
  name: { fontSize: 14, fontWeight: "700" },
  username: { fontSize: 12, fontWeight: "500", marginTop: 2 },
  actions: { flexDirection: "row", alignSelf: "center", justifyContent: "flex-end", gap: 4 },
  actionBtn: {
    minHeight: 44,
    minWidth: 56,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center"
  },
  actionText: { fontSize: 12, fontWeight: "700" },
  empty: {
    alignItems: "center",
    gap: spacing.xs,
    padding: spacing.lg,
    marginHorizontal: spacing.md,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth
  },
  emptyIcon: { width: 48, height: 48, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 14, fontWeight: "700", marginTop: spacing.xs, textAlign: "center" },
  emptyText: { fontSize: 13, textAlign: "center", lineHeight: 19 }
});
