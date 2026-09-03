import React, { memo } from "react";
import { ThreadListSkeleton } from "./ChatSkeleton";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  type ListRenderItem
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { AvatarImage } from "../ui/AvatarImage";
import type { ChatLane, Thread } from "../../api/messages.api";

export type MessagesFolder = "inbox" | "archived" | "blocked";

export type BlockedListMember = {
  id: number;
  fullName: string;
  username: string | null;
};

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
  loadingThreads: boolean;
  threadsError: string | null;
  threads: Thread[];
  renderThread: ListRenderItem<Thread>;
  keyThread: (t: Thread) => string;
  onBack?: () => void;
  /** Opens member / conversation search (messages hub). */
  onSearch?: () => void;
  folder?: MessagesFolder;
  onFolderChange?: (folder: MessagesFolder) => void;
  /** Extra bottom padding so list clears floating tab bar. */
  contentBottomInset?: number;
  /** Shown when folder is Blocked. */
  blockedMembers?: BlockedListMember[];
  onUnblockMember?: (member: BlockedListMember) => void;
  onOpenBlockedMember?: (member: BlockedListMember) => void;
};

function ThreadListPanelComponent(props: ThreadListPanelProps) {
  const {
    width,
    fullWidth,
    colors,
    titleSize,
    loadingThreads,
    threadsError,
    threads,
    renderThread,
    keyThread,
    onBack,
    onSearch,
    folder = "inbox",
    onFolderChange,
    contentBottomInset = 0,
    blockedMembers = [],
    onUnblockMember,
    onOpenBlockedMember
  } = props;

  const isArchived = folder === "archived";
  const isBlocked = folder === "blocked";

  const subtitle = isBlocked
    ? "People you blocked. Tap Unblock to allow messaging again."
    : isArchived
      ? "Left and archived chats stay here. Open a chat → ⋮ → Restore or Unarchive to bring it back to Inbox."
      : "Archive a chat from its options menu. Find blocked people under Blocked.";

  const emptyTitle = isBlocked
    ? "No blocked members"
    : isArchived
      ? "No archived chats"
      : "No conversations yet";

  const emptySubtitle = isBlocked
    ? "When you block someone from a chat, they appear here so you can unblock them anytime."
    : isArchived
      ? "When you archive or leave a chat, it moves here so you can restore it anytime."
      : "When you match on Matrimony or connect with a member, your chats will appear here.";

  const listEmpty = isBlocked ? blockedMembers.length === 0 : threads.length === 0;

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
          {onBack ? (
            <Pressable onPress={onBack} hitSlop={8} style={styles.backBtn} accessibilityLabel="Go back">
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </Pressable>
          ) : null}
          <Text style={[styles.title, { color: colors.text, fontSize: titleSize }]}>Messages</Text>
          {onSearch ? (
            <Pressable
              onPress={onSearch}
              hitSlop={10}
              style={styles.searchBtn}
              accessibilityLabel="Search members and chats"
            >
              <Ionicons name="search" size={22} color={colors.text} />
            </Pressable>
          ) : null}
        </View>

        {onFolderChange ? (
          <View style={[styles.segment, { backgroundColor: colors.surfaceElevated }]}>
            {(
              [
                { id: "inbox", label: "Inbox" },
                { id: "archived", label: "Archived" },
                { id: "blocked", label: "Blocked" }
              ] as const
            ).map((tab) => (
              <Pressable
                key={tab.id}
                style={[
                  styles.segmentBtn,
                  folder === tab.id && { backgroundColor: colors.surface }
                ]}
                onPress={() => onFolderChange(tab.id)}
              >
                <Text
                  style={[
                    styles.segmentText,
                    { color: colors.textSecondary },
                    folder === tab.id && { color: colors.primary, fontWeight: "700" }
                  ]}
                  numberOfLines={1}
                >
                  {tab.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
      </View>

      <View style={styles.listWrap}>
        {loadingThreads ? (
          <ThreadListSkeleton />
        ) : threadsError ? (
          <EmptyState
            icon="cloud-offline-outline"
            title="Couldn't load chats"
            subtitle={threadsError}
            colors={colors}
          />
        ) : listEmpty ? (
          <EmptyState
            icon={
              isBlocked
                ? "hand-left-outline"
                : isArchived
                  ? "archive-outline"
                  : "chatbubble-ellipses-outline"
            }
            title={emptyTitle}
            subtitle={emptySubtitle}
            colors={colors}
          />
        ) : isBlocked ? (
          <FlatList
            data={blockedMembers}
            keyExtractor={(m) => String(m.id)}
            style={styles.list}
            contentContainerStyle={[
              styles.listContent,
              contentBottomInset > 0 ? { paddingBottom: contentBottomInset } : null
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <Pressable
                style={[styles.blockedRow, { borderBottomColor: colors.border }]}
                onPress={() => onOpenBlockedMember?.(item)}
              >
                <AvatarImage
                  uri={null}
                  name={item.fullName}
                  size={44}
                  placeholderColor={colors.surfaceElevated}
                  textColor={colors.textSecondary}
                />
                <View style={styles.blockedTextCol}>
                  <Text style={[styles.blockedName, { color: colors.text }]} numberOfLines={1}>
                    {item.fullName}
                  </Text>
                  {item.username ? (
                    <Text style={{ color: colors.textMuted, fontSize: 13 }} numberOfLines={1}>
                      @{item.username}
                    </Text>
                  ) : (
                    <Text style={{ color: colors.textMuted, fontSize: 13 }}>Blocked</Text>
                  )}
                </View>
                <Pressable
                  onPress={() => onUnblockMember?.(item)}
                  hitSlop={8}
                  style={styles.unblockBtn}
                >
                  <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 14 }}>
                    Unblock
                  </Text>
                </Pressable>
              </Pressable>
            )}
          />
        ) : (
          <FlatList
            data={threads}
            keyExtractor={keyThread}
            renderItem={renderThread}
            style={styles.list}
            contentContainerStyle={[
              styles.listContent,
              contentBottomInset > 0 ? { paddingBottom: contentBottomInset } : null
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            removeClippedSubviews
            maxToRenderPerBatch={12}
            windowSize={9}
            updateCellsBatchingPeriod={50}
            initialNumToRender={12}
          />
        )}
      </View>
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
    gap: 8
  },
  backBtn: {
    marginRight: 2,
    paddingVertical: 4,
    flexShrink: 0
  },
  searchBtn: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    flexShrink: 0
  },
  title: {
    fontWeight: "800",
    flex: 1,
    minWidth: 0
  },
  subtitle: {
    marginTop: 8,
    fontSize: 12,
    lineHeight: 17
  },
  segment: {
    marginTop: 12,
    flexDirection: "row",
    borderRadius: 10,
    padding: 3,
    gap: 2
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center"
  },
  segmentText: {
    fontSize: 12,
    fontWeight: "600"
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
  blockedRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  blockedTextCol: {
    flex: 1,
    minWidth: 0
  },
  blockedName: {
    fontSize: 15,
    fontWeight: "700"
  },
  unblockBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
    flexShrink: 0
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
    paddingHorizontal: 16,
    lineHeight: 19
  }
});

export const ThreadListPanel = memo(ThreadListPanelComponent);

/** Shared thread row avatar + text */
export function ThreadRow({
  name,
  preview,
  time,
  avatarUri,
  online,
  selected,
  unreadCount,
  chatLanes,
  muted,
  archived,
  left,
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
  chatLanes?: ChatLane[];
  muted?: boolean;
  archived?: boolean;
  left?: boolean;
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
        <AvatarImage
          uri={avatarUri}
          name={name}
          size={48}
          placeholderColor={colors.surfaceElevated}
          textColor={colors.textMuted}
        />
        {online ? <View style={[rowStyles.dot, { borderColor: colors.surface }]} /> : null}
      </View>
      <View style={rowStyles.center}>
        <View style={rowStyles.nameRow}>
          <Text style={[rowStyles.name, { color: colors.text }]} numberOfLines={1}>
            {name}
          </Text>
          {chatLanes?.includes("community") ? (
            <View
              style={[rowStyles.laneIcon, { backgroundColor: colors.primary + "18" }]}
              accessibilityLabel="Community chat"
            >
              <Ionicons name="people" size={12} color={colors.primary} />
            </View>
          ) : null}
          {chatLanes?.includes("matrimony") ? (
            <View
              style={[rowStyles.laneIcon, { backgroundColor: "rgba(225,29,72,0.14)" }]}
              accessibilityLabel="Matrimony chat"
            >
              <Ionicons name="heart" size={12} color="#E11D48" />
            </View>
          ) : null}
          {left ? (
            <Ionicons name="exit-outline" size={14} color={colors.textMuted} />
          ) : archived ? (
            <Ionicons name="archive-outline" size={14} color={colors.textMuted} />
          ) : null}
          {muted ? (
            <Ionicons name="notifications-off-outline" size={14} color={colors.textMuted} />
          ) : null}
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
  laneIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
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
