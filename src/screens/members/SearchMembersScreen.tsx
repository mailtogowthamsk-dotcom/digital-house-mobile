import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { textFieldCompact } from "../../theme/textField";
import { searchUsers, type DirectoryUser } from "../../api/users.api";
import { listThreads } from "../../api/messages.api";
import {
  acceptConnectionRequest,
  sendConnectionRequest,
  type RelationshipStatus
} from "../../api/connections.api";
import { getAuthErrorMessage, getErrorStatus, getImageUrl } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { AvatarImage } from "../../components/ui/AvatarImage";
import { appAlert } from "../../utils/appAlert";
import { formatUsername } from "../../utils/username";
import type { RootStackParamList } from "../../navigation/types";

type ThreadMeta = {
  name: string;
  profileImage: string | null;
  online?: boolean;
};

const MIN_SEARCH_CHARS = 3;

function searchNeedle(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("@")) return trimmed.slice(1).trim();
  return trimmed;
}

export function SearchMembersScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, "SearchMembers">>();
  const fromMessages = route.params?.context === "messages";
  const { colors } = useTheme();
  const { status, refreshSession } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DirectoryUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<number | null>(null);
  const [threadByUserId, setThreadByUserId] = useState<Map<number, ThreadMeta>>(new Map());
  const searchGenRef = useRef(0);

  useEffect(() => {
    navigation.setOptions?.({
      title: fromMessages ? "Search" : "Find Members"
    });
  }, [fromMessages, navigation]);

  useEffect(() => {
    if (!fromMessages || status !== "home") return;
    let cancelled = false;
    listThreads({ includeArchived: true })
      .then((threads) => {
        if (cancelled) return;
        const map = new Map<number, ThreadMeta>();
        for (const t of threads) {
          map.set(t.otherUser.id, {
            name: t.otherUser.name,
            profileImage: t.otherUser.profileImage,
            online: t.otherUser.online
          });
        }
        setThreadByUserId(map);
      })
      .catch(() => {
        /* search still works without thread map */
      });
    return () => {
      cancelled = true;
    };
  }, [fromMessages, status]);

  useEffect(() => {
    const needle = searchNeedle(query);
    if (needle.length < MIN_SEARCH_CHARS) {
      searchGenRef.current += 1;
      setResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    if (status !== "home") {
      setResults([]);
      setError("Please sign in with an approved account to search members.");
      setLoading(false);
      return;
    }

    const gen = ++searchGenRef.current;
    setLoading(true);
    setError(null);
    const timer = setTimeout(() => {
      searchUsers(query.trim())
        .then((users) => {
          if (gen !== searchGenRef.current) return;
          setResults(users);
        })
        .catch(async (e: unknown) => {
          if (gen !== searchGenRef.current) return;
          setError(getAuthErrorMessage(e));
          setResults([]);
          if (getErrorStatus(e) === 401) {
            await refreshSession().catch(() => {});
          }
        })
        .finally(() => {
          if (gen === searchGenRef.current) setLoading(false);
        });
    }, 250);

    return () => clearTimeout(timer);
  }, [query, status, refreshSession]);

  const openChat = useCallback(
    (item: DirectoryUser) => {
      const thread = threadByUserId.get(item.id);
      navigation.navigate("Chat", {
        otherUserId: item.id,
        name: thread?.name || item.fullName,
        profileImage: thread?.profileImage ?? item.profileImage ?? null,
        online: thread?.online ?? item.online
      });
    },
    [navigation, threadByUserId]
  );

  const openProfile = useCallback(
    (item: DirectoryUser) => {
      navigation.navigate("MemberProfile", {
        userId: item.id,
        username: item.username
      });
    },
    [navigation]
  );

  const onRowPress = useCallback(
    (item: DirectoryUser) => {
      if (!fromMessages) {
        openProfile(item);
        return;
      }
      const hasChat = threadByUserId.has(item.id);
      if (hasChat || item.relationshipStatus === "connected") {
        openChat(item);
        return;
      }
      openProfile(item);
    },
    [fromMessages, openChat, openProfile, threadByUserId]
  );

  const patchRelationship = useCallback((userId: number, next: RelationshipStatus) => {
    setResults((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, relationshipStatus: next } : u))
    );
  }, []);

  const onConnect = useCallback(
    async (item: DirectoryUser) => {
      if (actingId != null) return;
      setActingId(item.id);
      try {
        await sendConnectionRequest(item.id);
        patchRelationship(item.id, "pending_sent");
      } catch (e: unknown) {
        appAlert("Error", e instanceof Error ? e.message : "Could not send request");
      } finally {
        setActingId(null);
      }
    },
    [actingId, patchRelationship]
  );

  const onAccept = useCallback(
    async (item: DirectoryUser) => {
      if (actingId != null) return;
      setActingId(item.id);
      try {
        await acceptConnectionRequest(item.id);
        patchRelationship(item.id, "connected");
      } catch (e: unknown) {
        appAlert("Error", e instanceof Error ? e.message : "Could not accept request");
      } finally {
        setActingId(null);
      }
    },
    [actingId, patchRelationship]
  );

  const renderTrailing = useCallback(
    (item: DirectoryUser) => {
      if (!fromMessages) {
        return <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />;
      }

      const hasChat = threadByUserId.has(item.id);
      const busy = actingId === item.id;

      if (busy) {
        return <ActivityIndicator size="small" color={colors.primary} />;
      }

      if (hasChat || item.relationshipStatus === "connected") {
        return (
          <Pressable
            onPress={() => openChat(item)}
            hitSlop={6}
            style={[styles.actionChip, { backgroundColor: colors.primary }]}
            accessibilityLabel="Open chat"
          >
            <Ionicons name="chatbubble-outline" size={14} color={colors.white} />
            <Text style={[styles.actionChipText, { color: colors.white }]}>Chat</Text>
          </Pressable>
        );
      }

      if (item.relationshipStatus === "none") {
        return (
          <Pressable
            onPress={() => void onConnect(item)}
            hitSlop={6}
            style={[styles.actionChip, { backgroundColor: colors.primary }]}
            accessibilityLabel="Send connection request"
          >
            <Ionicons name="person-add-outline" size={14} color={colors.white} />
            <Text style={[styles.actionChipText, { color: colors.white }]}>Connect</Text>
          </Pressable>
        );
      }

      if (item.relationshipStatus === "pending_received") {
        return (
          <Pressable
            onPress={() => void onAccept(item)}
            hitSlop={6}
            style={[styles.actionChip, { backgroundColor: colors.primary }]}
            accessibilityLabel="Accept connection request"
          >
            <Text style={[styles.actionChipText, { color: colors.white }]}>Accept</Text>
          </Pressable>
        );
      }

      return <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />;
    },
    [actingId, colors, fromMessages, onAccept, onConnect, openChat, threadByUserId]
  );

  const renderItem = useCallback(
    ({ item }: { item: DirectoryUser }) => {
      return (
        <Pressable
          style={[styles.row, { borderBottomColor: colors.border }]}
          onPress={() => onRowPress(item)}
        >
          <AvatarImage
            uri={getImageUrl(item.profileImage)}
            name={item.fullName}
            size={48}
            placeholderColor={colors.surfaceElevated}
            textColor={colors.textMuted}
          />
          <View style={styles.rowText}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {item.fullName}
            </Text>
            {item.username ? (
              <Text style={[styles.username, { color: colors.primary }]} numberOfLines={1}>
                {formatUsername(item.username)}
              </Text>
            ) : null}
          </View>
          {renderTrailing(item)}
        </Pressable>
      );
    },
    [colors, onRowPress, renderTrailing]
  );

  const s = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        searchWrap: {
          margin: spacing.lg,
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm
        },
        searchInput: { flex: 1, ...textFieldCompact, color: colors.text },
        empty: { padding: spacing.xl, alignItems: "center" },
        emptyText: { color: colors.textSecondary, textAlign: "center", lineHeight: 20 }
      }),
    [colors]
  );

  const typed = searchNeedle(query);
  const waitingForMinChars = typed.length > 0 && typed.length < MIN_SEARCH_CHARS;
  const emptyHint = fromMessages
    ? "Type at least 3 letters to search by name or @username."
    : "Type at least 3 letters to find members by name or @username.";
  const remaining = MIN_SEARCH_CHARS - typed.length;
  const minCharsHint = `Type ${remaining} more letter${remaining === 1 ? "" : "s"} to search.`;

  return (
    <View style={s.container}>
      <View style={s.searchWrap}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search name or @username"
          placeholderTextColor={colors.textMuted}
          style={s.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus={fromMessages}
        />
        {query.length > 0 ? (
          <Pressable onPress={() => setQuery("")} hitSlop={8} accessibilityLabel="Clear search">
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.lg }} color={colors.primary} />
      ) : error ? (
        <View style={s.empty}>
          <Text style={s.emptyText}>{error}</Text>
        </View>
      ) : !query.trim() || waitingForMinChars ? (
        <View style={s.empty}>
          <Ionicons
            name={fromMessages ? "chatbubbles-outline" : "people-outline"}
            size={42}
            color={colors.textSecondary}
          />
          <Text style={[s.emptyText, { marginTop: spacing.md }]}>
            {waitingForMinChars ? minCharsHint : emptyHint}
          </Text>
        </View>
      ) : results.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyText}>No members found.</Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          initialNumToRender={12}
          windowSize={8}
          removeClippedSubviews
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
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
  actionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    flexShrink: 0
  },
  actionChipText: { fontSize: 13, fontWeight: "700" }
});
