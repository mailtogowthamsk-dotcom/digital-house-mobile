import React, { memo } from "react";
import { ThreadListSkeleton } from "./ChatSkeleton";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  ActivityIndicator,
  Image,
  type ListRenderItem
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { getImageUrl } from "../../api/client";
import type { Thread } from "../../api/messages.api";
import type { DirectoryUser } from "../../api/users.api";

type Colors = {
  background: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  primary: string;
  white: string;
};

type ThreadListPanelProps = {
  width: number;
  /** When true, panel fills parent width (phone layout) */
  fullWidth?: boolean;
  colors: Colors;
  titleSize: number;
  searchMode: boolean;
  onToggleSearch: () => void;
  query: string;
  onQueryChange: (q: string) => void;
  loadingThreads: boolean;
  threadsError: string | null;
  threads: Thread[];
  renderThread: ListRenderItem<Thread>;
  loadingResults: boolean;
  resultsError: string | null;
  results: DirectoryUser[];
  queryTrimmed: string;
  renderResult: ListRenderItem<DirectoryUser>;
  keyThread: (t: Thread) => string;
  keyUser: (u: DirectoryUser) => string;
};

function ThreadListPanelComponent(props: ThreadListPanelProps) {
  const {
    width,
    fullWidth,
    colors,
    titleSize,
    searchMode,
    onToggleSearch,
    query,
    onQueryChange,
    loadingThreads,
    threadsError,
    threads,
    renderThread,
    loadingResults,
    resultsError,
    results,
    queryTrimmed,
    renderResult,
    keyThread,
    keyUser
  } = props;

  return (
    <View
      style={[
        styles.panel,
        fullWidth
          ? {
              flex: 1,
              width: "100%",
              maxWidth: "100%",
              backgroundColor: colors.surface,
              borderRightWidth: 0
            }
          : {
              width,
              maxWidth: width,
              backgroundColor: colors.surface,
              borderRightColor: colors.border
            }
      ]}
    >
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.text, fontSize: titleSize }]}>Messages</Text>
          <Pressable onPress={onToggleSearch} style={[styles.toggleBtn, { backgroundColor: colors.surfaceElevated }]}>
            <Ionicons name={searchMode ? "chatbubbles-outline" : "add"} size={16} color={colors.text} />
            <Text style={[styles.toggleText, { color: colors.text }]}>
              {searchMode ? "Chats" : "New chat"}
            </Text>
          </Pressable>
        </View>
        {searchMode ? (
          <View style={[styles.searchWrap, { backgroundColor: colors.surfaceElevated }]}>
            <Ionicons name="search" size={18} color={colors.textMuted} />
            <TextInput
              value={query}
              onChangeText={onQueryChange}
              placeholder="Search users"
              placeholderTextColor={colors.textMuted}
              style={[styles.searchInput, { color: colors.text }]}
              autoCapitalize="none"
            />
          </View>
        ) : null}
      </View>

      <View style={styles.listWrap}>
        {!searchMode ? (
          loadingThreads ? (
            <ThreadListSkeleton />
          ) : threadsError ? (
            <EmptyState
              icon="cloud-offline-outline"
              title="Couldn't load chats"
              subtitle={threadsError}
              colors={colors}
            />
          ) : threads.length === 0 ? (
            <EmptyState
              icon="people-outline"
              title="No conversations yet"
              subtitle='Tap "New chat" to search and start messaging.'
              colors={colors}
            />
          ) : (
            <FlatList
              data={threads}
              keyExtractor={keyThread}
              renderItem={renderThread}
              style={styles.list}
              contentContainerStyle={styles.listContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            />
          )
        ) : loadingResults ? (
          <CenteredLoader color={colors.primary} />
        ) : resultsError ? (
          <EmptyState
            icon="cloud-offline-outline"
            title="Search failed"
            subtitle={resultsError}
            colors={colors}
          />
        ) : queryTrimmed && results.length === 0 ? (
          <EmptyState
            icon="people-outline"
            title="No users found"
            subtitle="Try a different name."
            colors={colors}
          />
        ) : (
          <FlatList
            data={results}
            keyExtractor={keyUser}
            renderItem={renderResult}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </View>
  );
}

function CenteredLoader({ color }: { color: string }) {
  return (
    <View style={styles.centered}>
      <ActivityIndicator size="small" color={color} />
    </View>
  );
}

function EmptyState({
  icon,
  title,
  subtitle,
  colors
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  colors: Colors;
}) {
  return (
    <View style={styles.centered}>
      <Ionicons name={icon} size={44} color={colors.textSecondary} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.emptySub, { color: colors.textSecondary }]}>{subtitle}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flexShrink: 0,
    borderRightWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    alignSelf: "stretch"
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexShrink: 0
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8
  },
  title: {
    fontWeight: "800",
    flex: 1
  },
  toggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0
  },
  toggleText: {
    fontSize: 13,
    fontWeight: "700"
  },
  searchWrap: {
    marginTop: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14
  },
  searchInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 14
  },
  listWrap: {
    flex: 1,
    minHeight: 0
  },
  list: {
    flex: 1
  },
  listContent: {
    flexGrow: 1
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "800",
    marginTop: 10,
    textAlign: "center"
  },
  emptySub: {
    fontSize: 13,
    marginTop: 6,
    textAlign: "center",
    paddingHorizontal: 16
  }
});

export const ThreadListPanel = memo(ThreadListPanelComponent);

/** Shared thread/search row avatar + text */
export function ThreadRow({
  name,
  preview,
  time,
  avatarUri,
  online,
  selected,
  unreadCount,
  onPress,
  colors
}: {
  name: string;
  preview: string;
  time?: string;
  avatarUri: string | null;
  online?: boolean;
  selected?: boolean;
  unreadCount?: number;
  onPress: () => void;
  colors: Colors;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        rowStyles.row,
        { borderBottomColor: colors.border },
        selected && { backgroundColor: colors.surfaceElevated }
      ]}
    >
      <View style={rowStyles.avatarWrap}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={rowStyles.avatar} />
        ) : (
          <View style={[rowStyles.avatar, { backgroundColor: colors.surfaceElevated }]} />
        )}
        {online ? <View style={[rowStyles.dot, { borderColor: colors.surface }]} /> : null}
      </View>
      <View style={rowStyles.center}>
        <View style={rowStyles.nameRow}>
          <Text style={[rowStyles.name, { color: colors.text }]} numberOfLines={1}>
            {name}
          </Text>
          {time ? (
            <Text style={[rowStyles.time, { color: colors.textMuted }]}>{time}</Text>
          ) : null}
        </View>
        <View style={rowStyles.previewRow}>
          <Text style={[rowStyles.preview, { color: colors.textSecondary }]} numberOfLines={1}>
            {preview}
          </Text>
          {unreadCount != null && unreadCount > 0 ? (
            <View style={[rowStyles.badge, { backgroundColor: colors.primary }]}>
              <Text style={[rowStyles.badgeText, { color: colors.white }]}>
                {unreadCount > 99 ? "99+" : unreadCount}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const rowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    maxWidth: "100%"
  },
  avatarWrap: {
    width: 44,
    height: 44,
    flexShrink: 0
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22
  },
  dot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#22C55E",
    borderWidth: 2
  },
  center: {
    flex: 1,
    minWidth: 0
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8
  },
  name: {
    fontSize: 15,
    fontWeight: "800",
    flex: 1
  },
  time: {
    fontSize: 12,
    flexShrink: 0
  },
  previewRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  preview: {
    flex: 1,
    fontSize: 13,
    minWidth: 0
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    flexShrink: 0
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "800"
  }
});
