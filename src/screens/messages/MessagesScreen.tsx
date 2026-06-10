import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  Pressable,
  ActivityIndicator,
  Image
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { listThreads, type Thread } from "../../api/messages.api";
import { getImageUrl } from "../../api/client";

export function MessagesScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    const data = await listThreads();
    setThreads(data);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await load();
      } catch (e: any) {
        setError(e?.message ?? "Failed to load messages");
      } finally {
        setLoading(false);
      }
    })();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const s = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        header: {
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
          paddingBottom: spacing.md
        },
        title: { fontSize: 22, fontWeight: "700", color: colors.text },
        subtitle: { marginTop: 6, fontSize: 13, color: colors.textSecondary },
        card: {
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          marginHorizontal: spacing.lg,
          marginBottom: spacing.md,
          overflow: "hidden",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
          elevation: 2
        },
        row: {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: spacing.lg,
          paddingVertical: spacing.lg,
          gap: spacing.md,
          borderBottomWidth: 1,
          borderBottomColor: colors.border
        },
        rowLast: { borderBottomWidth: 0 },
        avatarWrap: { width: 44, height: 44 },
        avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceElevated },
        onlineDot: {
          position: "absolute",
          bottom: -1,
          right: -1,
          width: 14,
          height: 14,
          borderRadius: 7,
          backgroundColor: "#22C55E",
          borderWidth: 2,
          borderColor: colors.surface
        },
        center: { flex: 1, minWidth: 0 },
        nameRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
        name: { fontSize: 16, fontWeight: "700", color: colors.text, flex: 1 },
        time: { fontSize: 12, color: colors.textMuted, marginLeft: spacing.md },
        previewRow: { marginTop: 4, flexDirection: "row", alignItems: "center" },
        preview: { flex: 1, fontSize: 13, color: colors.textSecondary },
        badge: {
          minWidth: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: colors.primary,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 6,
          marginLeft: spacing.md
        },
        badgeText: { fontSize: 12, fontWeight: "800", color: colors.white },
        empty: { padding: spacing.xxl, alignItems: "center" },
        emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.text, marginTop: 10 },
        emptySub: { fontSize: 13, color: colors.textSecondary, marginTop: 6, textAlign: "center" }
      }),
    [colors]
  );

  const renderItem = useCallback(
    ({ item, index }: { item: Thread; index: number }) => {
      const last = item.lastMessage;
      const isLast = index === threads.length - 1;
      const avatarUri = getImageUrl(item.otherUser.profileImage);
      const time = last ? new Date(last.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "";
      const preview = last ? last.body : "No messages yet";

      return (
        <Pressable
          style={[s.row, isLast && s.rowLast]}
          onPress={() =>
            navigation.navigate("Chat", {
              otherUserId: item.otherUser.id,
              name: item.otherUser.name,
              profileImage: item.otherUser.profileImage ?? null
            })
          }
        >
          <View style={s.avatarWrap}>
            {avatarUri ? <Image source={{ uri: avatarUri }} style={s.avatar} /> : <View style={s.avatar} />}
            {item.otherUser.online && <View style={s.onlineDot} />}
          </View>
          <View style={s.center}>
            <View style={s.nameRow}>
              <Text style={s.name} numberOfLines={1}>
                {item.otherUser.name}
              </Text>
              <Text style={s.time}>{time}</Text>
            </View>
            <View style={s.previewRow}>
              <Text style={s.preview} numberOfLines={1}>
                {preview}
              </Text>
              {item.unreadCount > 0 && (
                <View style={s.badge}>
                  <Text style={s.badgeText}>{item.unreadCount > 99 ? "99+" : item.unreadCount}</Text>
                </View>
              )}
            </View>
          </View>
        </Pressable>
      );
    },
    [navigation, s, threads.length]
  );

  const keyExtractor = useCallback((item: Thread) => String(item.otherUser.id), []);

  if (loading) {
    return (
      <View style={[s.container, { alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Messages</Text>
        <Text style={s.subtitle}>Your private chats</Text>
      </View>

      {error ? (
        <View style={s.empty}>
          <Ionicons name="cloud-offline-outline" size={44} color={colors.textSecondary} />
          <Text style={s.emptyTitle}>Couldn’t load chats</Text>
          <Text style={s.emptySub}>{error}</Text>
        </View>
      ) : threads.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="chatbubble-ellipses-outline" size={44} color={colors.textSecondary} />
          <Text style={s.emptyTitle}>No chats yet</Text>
          <Text style={s.emptySub}>
            Conversations appear here after connection or mutual matrimony match.
          </Text>
        </View>
      ) : (
        <View style={s.card}>
          <FlatList
            data={threads}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          />
        </View>
      )}
    </View>
  );
}

