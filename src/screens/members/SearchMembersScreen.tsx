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
import { settingsField, textFieldCompact } from "../../theme/textField";
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
    listThreads({ includeArchived: true, limit: 50 })
      .then((page) => {
        if (cancelled) return;
        const map = new Map<number, ThreadMeta>();
        for (const t of page.threads) {
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
            accessibilityRole="button"
            style={[styles.actionChip, { backgroundColor: colors.surfaceElevated }]}
            accessibilityLabel="Open chat"
          >
            <Ionicons name="chatbubble-outline" size={14} color={colors.primary} />
            <Text style={[styles.actionChipText, { color: colors.primary }]}>Chat</Text>
          </Pressable>
        );
      }

      if (item.relationshipStatus === "none") {
        return (
          <Pressable
            onPress={() => void onConnect(item)}
            accessibilityRole="button"
            style={[styles.actionChip, { backgroundColor: colors.surfaceElevated }]}
            accessibilityLabel="Send connection request"
          >
            <Ionicons name="person-add-outline" size={14} color={colors.primary} />
            <Text style={[styles.actionChipText, { color: colors.primary }]}>Connect</Text>
          </Pressable>
        );
      }

      if (item.relationshipStatus === "pending_received") {
        return (
          <Pressable
            onPress={() => void onAccept(item)}
            accessibilityRole="button"
            style={[styles.actionChip, { backgroundColor: colors.surfaceElevated }]}
            accessibilityLabel="Accept connection request"
          >
            <Text style={[styles.actionChipText, { color: colors.primary }]}>Accept</Text>
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
          style={({ pressed }) => [
            styles.row,
            { borderBottomColor: colors.border, backgroundColor: pressed ? colors.surfaceElevated : colors.surface }
          ]}
          onPress={() => onRowPress(item)}
          accessibilityRole={fromMessages ? undefined : "button"}
        >
          <AvatarImage
            uri={getImageUrl(item.profileImage)}
            name={item.fullName}
            size={36}
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
    [colors, fromMessages, onRowPress, renderTrailing]
  );

  const s = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        content: { flex: 1, width: "100%", maxWidth: 620, alignSelf: "center" },
        searchWrap: {
          ...settingsField,
          marginHorizontal: spacing.md,
          marginTop: spacing.sm,
          marginBottom: spacing.sm,
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.xs,
          backgroundColor: colors.surfaceElevated,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border
        },
        searchInput: { flex: 1, ...textFieldCompact, minHeight: 42, paddingVertical: 6, color: colors.text },
        clearButton: {
          width: 36,
          minHeight: 44,
          alignItems: "center",
          justifyContent: "center"
        },
        resultCount: {
          marginHorizontal: spacing.md,
          marginBottom: spacing.xs,
          fontSize: 12,
          color: colors.textSecondary,
          fontWeight: "600"
        },
        results: { paddingHorizontal: spacing.md, paddingBottom: spacing.lg },
        empty: { padding: spacing.lg, alignItems: "center", gap: spacing.xs },
        emptyIcon: {
          width: 48,
          height: 48,
          borderRadius: 14,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.surfaceElevated,
          marginBottom: spacing.xs
        },
        emptyTitle: { fontSize: 14, fontWeight: "700", color: colors.text, textAlign: "center" },
        emptyText: { fontSize: 13, color: colors.textSecondary, textAlign: "center", lineHeight: 19 }
      }),
    [colors]
  );

  const typed = searchNeedle(query);
  const waitingForMinChars = typed.length > 0 && typed.length < MIN_SEARCH_CHARS;
  const emptyHint = "Enter at least 3 characters from a name or @username.";
  const remaining = MIN_SEARCH_CHARS - typed.length;
  const minCharsHint = `Type ${remaining} more letter${remaining === 1 ? "" : "s"} to search.`;

  return (
    <View style={s.container}>
      <View style={s.content}>
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
            accessibilityLabel="Search members"
            returnKeyType="search"
          />
          {query.length > 0 ? (
            <Pressable style={s.clearButton} onPress={() => setQuery("")} hitSlop={4} accessibilityRole="button" accessibilityLabel="Clear search">
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
            <View style={s.emptyIcon}>
              <Ionicons
                name={fromMessages ? "chatbubbles-outline" : "people-outline"}
                size={23}
                color={colors.primary}
              />
            </View>
            <Text style={s.emptyText}>
              {waitingForMinChars ? minCharsHint : emptyHint}
            </Text>
          </View>
        ) : results.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyTitle}>No members found</Text>
            <Text style={s.emptyText}>Try another name or @username.</Text>
          </View>
        ) : (
          <>
            <Text style={s.resultCount} accessibilityLiveRegion="polite">
              {results.length} {results.length === 1 ? "member" : "members"} found
            </Text>
            <FlatList
              contentContainerStyle={s.results}
              data={results}
              keyExtractor={(item) => String(item.id)}
              renderItem={renderItem}
              keyboardShouldPersistTaps="handled"
              initialNumToRender={12}
              windowSize={8}
              removeClippedSubviews
            />
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 54,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  rowText: { flex: 1, minWidth: 0 },
  name: { fontSize: 14, fontWeight: "700" },
  username: { fontSize: 12, fontWeight: "500", marginTop: 2 },
  actionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    minHeight: 44,
    borderRadius: radius.md,
    flexShrink: 0
  },
  actionChipText: { fontSize: 12, fontWeight: "700" }
});
