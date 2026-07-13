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
  folder?: "inbox" | "archived";
  onFolderChange?: (folder: "inbox" | "archived") => void;
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
    folder = "inbox",
    onFolderChange
  } = props;

  const isArchived = folder === "archived";

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
        </View>

        {onFolderChange ? (
          <View style={[styles.segment, { backgroundColor: colors.surfaceElevated }]}>
            <Pressable
              style={[
                styles.segmentBtn,
                folder === "inbox" && { backgroundColor: colors.surface }
              ]}
              onPress={() => onFolderChange("inbox")}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: colors.textSecondary },
                  folder === "inbox" && { color: colors.primary, fontWeight: "700" }
                ]}
              >
                Inbox
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.segmentBtn,
                folder === "archived" && { backgroundColor: colors.surface }
              ]}
              onPress={() => onFolderChange("archived")}
            >
              <Text
                style={[
                  styles.segmentText,
                  { color: colors.textSecondary },
                  folder === "archived" && { color: colors.primary, fontWeight: "700" }
                ]}
              >
                Archived
              </Text>
            </Pressable>
          </View>
        ) : null}

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {isArchived
            ? "Archived chats stay here until you unarchive them. Open a chat → ⋮ → Unarchive."
            : "Archive a chat from its options menu. Find it again under Archived."}
        </Text>
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
        ) : threads.length === 0 ? (
          <EmptyState
            icon={isArchived ? "archive-outline" : "chatbubble-ellipses-outline"}
            title={isArchived ? "No archived chats" : "No conversations yet"}
            subtitle={
              isArchived
                ? "When you archive a chat, it moves here and leaves your Inbox."
                : "When you match on Matrimony or connect with a member, your chats will appear here."
            }
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
    fontSize: 13,
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
function laneLabel(lane: ChatLane): string {
  return lane === "matrimony" ? "Matrimony" : "Community";
}

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
          {archived ? (
            <Ionicons name="archive-outline" size={14} color={colors.textMuted} />
          ) : null}
          {muted ? (
            <Ionicons name="notifications-off-outline" size={14} color={colors.textMuted} />
          ) : null}
          {time ? (
            <Text style={[rowStyles.time, { color: colors.textMuted }]}>{time}</Text>
          ) : null}
        </View>
        {chatLanes && chatLanes.length > 0 ? (
          <View style={rowStyles.laneRow}>
            {chatLanes.map((lane) => (
              <View
                key={lane}
                style={[
                  rowStyles.laneBadge,
                  {
                    backgroundColor:
                      lane === "matrimony" ? colors.surfaceElevated : colors.primary + "18"
                  }
                ]}
              >
                <Text
                  style={[
                    rowStyles.laneText,
                    { color: lane === "matrimony" ? colors.textSecondary : colors.primary }
                  ]}
                >
                  {laneLabel(lane)}
                </Text>
              </View>
            ))}
          </View>
        ) : null}
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
  laneRow: {
    marginTop: 4,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6
  },
  laneBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10
  },
  laneText: {
    fontSize: 11,
    fontWeight: "700"
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
