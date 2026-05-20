import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  RefreshControl,
  ActivityIndicator
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { useTheme } from "../../theme/ThemeContext";
import { spacing } from "../../theme/spacing";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem
} from "../../api/notifications.api";

export function NotificationsScreen() {
  const { colors } = useTheme();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getNotifications(1, 50);
      setItems(res.items);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    void load();
  };

  const onMarkAll = async () => {
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })));
    } catch {
      /* ignore */
    }
  };

  const onOpen = async (item: NotificationItem) => {
    if (!item.readAt) {
      try {
        await markNotificationRead(item.id);
        setItems((prev) =>
          prev.map((n) =>
            n.id === item.id ? { ...n, readAt: new Date().toISOString() } : n
          )
        );
      } catch {
        /* ignore */
      }
    }
  };

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      {items.some((n) => !n.readAt) ? (
        <Pressable style={styles.markAll} onPress={onMarkAll}>
          <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 14 }}>Mark all read</Text>
        </Pressable>
      ) : null}
      <FlatList
        data={items}
        keyExtractor={(n) => String(n.id)}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={items.length === 0 ? styles.emptyList : styles.list}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.textSecondary }]}>No notifications yet</Text>
        }
        renderItem={({ item }) => {
          const unread = !item.readAt;
          return (
            <Pressable
              style={[
                styles.row,
                {
                  backgroundColor: unread ? colors.surfaceElevated : colors.surface,
                  borderColor: colors.border
                }
              ]}
              onPress={() => onOpen(item)}
            >
              <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
              {item.body ? (
                <Text style={[styles.body, { color: colors.textSecondary }]} numberOfLines={3}>
                  {item.body}
                </Text>
              ) : null}
              <Text style={[styles.time, { color: colors.textMuted }]}>
                {new Date(item.createdAt).toLocaleString()}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  markAll: { alignSelf: "flex-end", paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  list: { padding: spacing.md, paddingBottom: spacing.xl },
  emptyList: { flexGrow: 1, justifyContent: "center", padding: spacing.xl },
  empty: { textAlign: "center", fontSize: 15 },
  row: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    marginBottom: spacing.sm
  },
  title: { fontSize: 15, fontWeight: "700" },
  body: { marginTop: 4, fontSize: 14, lineHeight: 20 },
  time: { marginTop: 8, fontSize: 12 }
});
