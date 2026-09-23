import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useTheme } from "../../theme/ThemeContext";
import { getImageUrl } from "../../api/client";
import { hapticSendMessage } from "../../utils/chatHaptics";
import { useAuth } from "../../context/AuthContext";
import {
  deleteMessage,
  getHistory,
  getMessageAccess,
  listThreads,
  markRead,
  type MessageAccess,
  type MessageItem,
  type Thread
} from "../../api/messages.api";
import { getSocketInstance } from "../../realtime/socket";
import { sendChatMessage } from "../../realtime/sendChatMessage";
import {
  subscribePresence,
  watchPresence,
  isUserOnlineCached,
  isPresenceHidden,
  hasPresenceSynced,
  refreshPresenceSnapshot,
  formatLastSeen,
  getCachedLastSeenAt
} from "../../realtime/presenceRealtime";
import { ackUndeliveredMessages } from "../../realtime/deliveryRealtime";
import { registerGlobalMessageHandler, registerGlobalDeletedHandler, registerGlobalConversationDeletedHandler } from "../../realtime/chatRealtime";
import { useChatSocket } from "../../hooks/useChatSocket";
import { useChatTyping } from "../../hooks/useChatTyping";
import { clearThreadUnread, patchThreadsFromMessage } from "../../utils/messageThreads";
import { useChatLayout } from "../../hooks/useChatLayout";
import { useAppResume } from "../../hooks/useAppResume";
import { ThreadListPanel, ThreadRow, type MessagesFolder } from "../../components/messages/ThreadListPanel";
import { ChatPanel } from "../../components/messages/ChatPanel";
import type { ChatMessageListHandle } from "../../components/messages/ChatMessageList";
import { mergeChatMessages } from "../../utils/mergeChatMessages";
import { mergeById } from "../../utils/mergeById";
import { BottomTabBar, FLOATING_TAB_BAR_HEIGHT } from "../../components/home";
import type { TabId } from "../../components/home/BottomTabBar";
import { handleMainTabPress } from "../../navigation/mainTabs";
import {
  listBlockedMembers,
  unblockMember,
  type BlockedMember
} from "../../api/users.api";
import { appAlert } from "../../utils/appAlert";
import { openSharedStoryInViewer } from "../../utils/openSharedStory";

const HISTORY_LIMIT = 30;

type SelectedChat = {
  id: number;
  fullName: string;
  profileImage: string | null;
  online?: boolean;
};

export function MessagesHubScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ Messages: { folder?: MessagesFolder } | undefined }, "Messages">>();
  const layout = useChatLayout();
  const { colors } = useTheme();
  const { user: authUser } = useAuth();

  const [meId, setMeId] = useState<number | null>(() => authUser?.id ?? null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [folder, setFolder] = useState<MessagesFolder>(
    () => route.params?.folder ?? "inbox"
  );
  const [blockedMembers, setBlockedMembers] = useState<BlockedMember[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [loadingMoreThreads, setLoadingMoreThreads] = useState(false);
  const [threadsError, setThreadsError] = useState<string | null>(null);
  const [threadsNextCursor, setThreadsNextCursor] = useState<number | null>(null);
  const [selectedUser, setSelectedUser] = useState<SelectedChat | null>(null);
  const [selectedThreadUserId, setSelectedThreadUserId] = useState<number | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [historyNextCursor, setHistoryNextCursor] = useState<number | null>(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const historyNextCursorRef = useRef<number | null>(null);
  const loadingOlderRef = useRef(false);
  historyNextCursorRef.current = historyNextCursor;
  const [loadingChat, setLoadingChat] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatAccess, setChatAccess] = useState<MessageAccess | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [input, setInput] = useState("");

  const pendingClientIdsRef = useRef<Set<string>>(new Set());
  const forgottenMessageIdsRef = useRef<Set<number>>(new Set());
  const deletingMessageIdsRef = useRef<Set<number>>(new Set());
  const listRef = useRef<ChatMessageListHandle>(null);

  const chatLocked = !!chatAccess && (!chatAccess.allowed || chatAccess.readOnly);
  const chatLockMessage = chatAccess?.message ?? null;

  const panelColors = useMemo(
    () => ({
      background: colors.background,
      surface: colors.surface,
      border: colors.border,
      surfaceElevated: colors.surfaceElevated,
      text: colors.text,
      textSecondary: colors.textSecondary,
      textMuted: colors.textMuted,
      primary: colors.primary,
      white: colors.white,
      error: colors.error
    }),
    [colors]
  );

  const threadColors = useMemo(
    () => ({
      background: colors.background,
      surface: colors.surface,
      surfaceElevated: colors.surfaceElevated,
      border: colors.border,
      text: colors.text,
      textSecondary: colors.textSecondary,
      textMuted: colors.textMuted,
      primary: colors.primary,
      white: colors.white
    }),
    [colors]
  );

  const scrollToBottomIfNeeded = useCallback((animated = true) => {
    if (listRef.current?.shouldAutoScroll() !== false) {
      listRef.current?.scrollToBottom(animated);
    }
  }, []);

  const loadMe = useCallback(async () => {
    if (authUser?.id != null) {
      setMeId(authUser.id);
      return;
    }
  }, [authUser?.id]);

  useEffect(() => {
    if (authUser?.id != null) setMeId(authUser.id);
  }, [authUser?.id]);

  const meIdRef = useRef<number | null>(null);
  meIdRef.current = meId;

  const threadsLoadGenRef = useRef(0);
  const threadsLoadMoreRef = useRef(false);
  const threadsNextCursorRef = useRef<number | null>(null);
  threadsNextCursorRef.current = threadsNextCursor;
  const threadsLoadScheduledRef = useRef(false);
  const pendingThreadsLoadRef = useRef<{
    folder?: MessagesFolder;
    opts?: { soft?: boolean; force?: boolean };
  } | null>(null);

  const folderRef = useRef(folder);
  folderRef.current = folder;
  const threadsLenRef = useRef(0);
  threadsLenRef.current = threads.length;

  const applyPresence = useCallback((data: Thread[]) => {
    return hasPresenceSynced()
      ? data.map((t) => ({
          ...t,
          otherUser: {
            ...t.otherUser,
            online: !isPresenceHidden(t.otherUser.id) && isUserOnlineCached(t.otherUser.id)
          }
        }))
      : data.map((t) => ({
          ...t,
          otherUser: {
            ...t.otherUser,
            online:
              !isPresenceHidden(t.otherUser.id) &&
              (t.otherUser.online || isUserOnlineCached(t.otherUser.id))
          }
        }));
  }, []);

  const loadThreads = useCallback(async (
    activeFolder?: MessagesFolder,
    opts?: { soft?: boolean; force?: boolean }
  ) => {
    const folderToLoad = activeFolder ?? folderRef.current;
    const soft = opts?.soft === true;
    // Soft reloads must not bump gen / own the full-page spinner — otherwise a
    // resume/realtime soft load can cancel a hard load's finally and leave
    // loadingThreads=true forever if the latest request hangs.
    const gen = soft ? threadsLoadGenRef.current : ++threadsLoadGenRef.current;
    threadsLoadMoreRef.current = false;
    setThreadsError(null);
    if (!soft) setLoadingThreads(true);
    try {
      if (folderToLoad === "blocked") {
        const blocked = await listBlockedMembers();
        if (gen !== threadsLoadGenRef.current) return;
        setBlockedMembers(blocked);
        setThreads([]);
        setThreadsNextCursor(null);
      } else {
        const page =
          folderToLoad === "archived"
            ? await listThreads({ archivedOnly: true, force: opts?.force })
            : await listThreads({ force: opts?.force });
        if (gen !== threadsLoadGenRef.current) return;
        setThreads(applyPresence(page.threads));
        setThreadsNextCursor(page.nextCursorId);
        setBlockedMembers([]);
        setSelectedUser((prev) =>
          prev
            ? {
                ...prev,
                online: hasPresenceSynced()
                  ? !isPresenceHidden(prev.id) && isUserOnlineCached(prev.id)
                  : !isPresenceHidden(prev.id) &&
                    (!!prev.online || isUserOnlineCached(prev.id))
              }
            : prev
        );
      }
    } catch (e: unknown) {
      if (gen === threadsLoadGenRef.current) {
        setThreadsError(e instanceof Error ? e.message : "Failed to load conversations");
      }
    } finally {
      if (!soft && gen === threadsLoadGenRef.current) {
        setLoadingThreads(false);
        setLoadingMoreThreads(false);
      }
    }
  }, [applyPresence]);

  const loadMoreThreads = useCallback(async () => {
    const folderToLoad = folderRef.current;
    if (folderToLoad === "blocked") return;
    const cursor = threadsNextCursorRef.current;
    if (cursor == null || threadsLoadMoreRef.current || loadingThreads) return;
    threadsLoadMoreRef.current = true;
    setLoadingMoreThreads(true);
    const gen = threadsLoadGenRef.current;
    try {
      const page =
        folderToLoad === "archived"
          ? await listThreads({ archivedOnly: true, cursorId: cursor })
          : await listThreads({ cursorId: cursor });
      if (gen !== threadsLoadGenRef.current) return;
      setThreads((prev) => applyPresence(mergeById(prev, page.threads, (t) => t.otherUser.id)));
      setThreadsNextCursor(page.nextCursorId);
    } catch {
      /* keep current list */
    } finally {
      if (gen === threadsLoadGenRef.current) {
        threadsLoadMoreRef.current = false;
        setLoadingMoreThreads(false);
      }
    }
  }, [applyPresence, loadingThreads]);
  /** Coalesce focus + folder-param effects that fire in the same tick into one load. */
  const scheduleLoadThreads = useCallback(
    (activeFolder?: MessagesFolder, opts?: { soft?: boolean; force?: boolean }) => {
      const prev = pendingThreadsLoadRef.current;
      pendingThreadsLoadRef.current = {
        folder: activeFolder ?? prev?.folder,
        opts: {
          soft: opts?.soft === true && prev?.opts?.soft !== false,
          force: opts?.force === true || prev?.opts?.force === true
        }
      };
      if (threadsLoadScheduledRef.current) return;
      threadsLoadScheduledRef.current = true;
      queueMicrotask(() => {
        threadsLoadScheduledRef.current = false;
        const pending = pendingThreadsLoadRef.current;
        pendingThreadsLoadRef.current = null;
        void loadThreads(pending?.folder, pending?.opts);
      });
    },
    [loadThreads]
  );
  const onFolderChange = useCallback(
    (next: MessagesFolder) => {
      setFolder(next);
      setSelectedUser(null);
      setSelectedThreadUserId(null);
      void loadThreads(next, { force: true });
    },
    [loadThreads]
  );

  useEffect(() => {
    const requested = route.params?.folder;
    if (!requested || requested === folderRef.current) return;
    setFolder(requested);
    setSelectedUser(null);
    setSelectedThreadUserId(null);
    scheduleLoadThreads(requested, { force: true });
  }, [scheduleLoadThreads, route.params?.folder]);

  /**
   * Every realtime subscription below is gated on `meId`. Prefer AuthContext —
   * do not hit GET /auth/me just for the current user id.
   */
  useEffect(() => {
    if (meId != null) return;
    void loadMe();
  }, [loadMe, meId]);

  useFocusEffect(
    useCallback(() => {
      if (!layout.isSplit) {
        setSelectedUser(null);
        setSelectedThreadUserId(null);
        setMessages([]);
        setChatError(null);
        setSendError(null);
        setChatAccess(null);
        setLoadingChat(false);
      }
      // Phone: returning from Chat must not reuse the 45s threads TTL (stale lastMessage).
      // Soft only when a list is already on screen — first open still owns the spinner.
      scheduleLoadThreads(undefined, {
        force: true,
        soft: threadsLenRef.current > 0
      });
    }, [scheduleLoadThreads, layout.isSplit])
  );

  useAppResume(() => {
    refreshPresenceSnapshot();
    void loadThreads(undefined, { soft: true });
  });

  const openThread = useCallback(
    async (t: Thread) => {
      const other = t.otherUser;
      const chatUser: SelectedChat = {
        id: other.id,
        fullName: other.name,
        profileImage: other.profileImage,
        online: other.online
      };

      if (!layout.isSplit) {
        navigation.navigate("Chat", {
          otherUserId: other.id,
          name: other.name,
          profileImage: other.profileImage ?? null,
          online: other.online,
          muted: !!t.muted,
          archived: !!t.archived,
          left: !!t.left
        });
        return;
      }

      setSelectedUser(chatUser);
      setSelectedThreadUserId(other.id);
      setLoadingChat(true);
      setChatError(null);
      setSendError(null);
      setMessages([]);
      setHistoryNextCursor(null);
      forgottenMessageIdsRef.current.clear();
      deletingMessageIdsRef.current.clear();
      setChatAccess(null);

      try {
        const access = await getMessageAccess(other.id);
        setChatAccess(access);
        if (!access.canViewHistory) {
          setChatError(access.message ?? "You cannot view this conversation.");
          return;
        }

        const hist = await getHistory(other.id, HISTORY_LIMIT);
        setHistoryNextCursor(hist.nextCursorId);
        setMessages((prev) =>
          mergeChatMessages(prev, hist.messages, {
            forgottenIds: forgottenMessageIdsRef.current,
            clearConfirmedIfEmpty: true
          })
        );
        listRef.current?.scrollToBottom(false);
        const ackAs = meId ?? authUser?.id ?? null;
        if (ackAs != null) {
          void ackUndeliveredMessages(hist.messages, ackAs);
        }
        setThreads((prev) => clearThreadUnread(prev, other.id));
        const sock = getSocketInstance();
        if (sock?.connected) {
          sock.emit("message:read", { withUserId: other.id });
        } else {
          await markRead(other.id).catch(() => {});
        }
      } catch (e: unknown) {
        setChatError(e instanceof Error ? e.message : "Failed to load chat");
      } finally {
        setLoadingChat(false);
      }
    },
    [layout.isSplit, meId, navigation, authUser?.id]
  );

  const typing = useChatTyping(selectedUser?.id ?? null, !chatLocked);
  const { onInputChange, stopTyping, applyPeerTyping } = typing;

  const onChangeComposer = useCallback(
    (t: string) => {
      if (chatLocked) return;
      setInput(t);
      setSendError(null);
      onInputChange(t);
    },
    [chatLocked, onInputChange]
  );

  const mergeSplitMessage = useCallback(
    (incoming: MessageItem) => {
      if (incoming.id > 0 && forgottenMessageIdsRef.current.has(incoming.id)) {
        return;
      }
      const incomingClientId =
        typeof incoming.clientId === "string" && incoming.clientId
          ? incoming.clientId
          : null;
      if (incomingClientId) {
        pendingClientIdsRef.current.delete(incomingClientId);
      }
      setMessages((prev) =>
        mergeChatMessages(prev, [incoming], {
          forgottenIds: forgottenMessageIdsRef.current
        })
      );
      scrollToBottomIfNeeded(true);
    },
    [scrollToBottomIfNeeded]
  );

  const mergeSplitMessageRef = useRef(mergeSplitMessage);
  mergeSplitMessageRef.current = mergeSplitMessage;

  const removeMessageLocally = useCallback((messageId: number) => {
    forgottenMessageIdsRef.current.add(messageId);
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  }, []);

  const handleDeleteMessage = useCallback(
    async (item: MessageItem) => {
      const messageId = Number(item.id);
      if (!messageId || messageId < 1 || deletingMessageIdsRef.current.has(messageId)) {
        return;
      }
      deletingMessageIdsRef.current.add(messageId);
      const snapshot = item;
      removeMessageLocally(messageId);
      try {
        await deleteMessage(messageId);
        void loadThreads(folderRef.current === "inbox" ? "inbox" : undefined, {
          soft: true
        }).catch(() => {});
      } catch (e) {
        forgottenMessageIdsRef.current.delete(messageId);
        setMessages((prev) => {
          if (prev.some((m) => m.id === messageId)) return prev;
          return mergeChatMessages(prev, [snapshot], {
            forgottenIds: forgottenMessageIdsRef.current
          });
        });
        appAlert("Couldn't delete", e instanceof Error ? e.message : "Please try again.");
      } finally {
        deletingMessageIdsRef.current.delete(messageId);
      }
    },
    [loadThreads, removeMessageLocally]
  );

  useEffect(() => {
    if (meId == null) return;
    let disposed = false;
    const handlerId = Symbol("hub-threads");

    const unsubPresence = subscribePresence({
      onUpdate: (uid, online) => {
        setThreads((prev) =>
          prev.map((th) =>
            th.otherUser.id === uid ? { ...th, otherUser: { ...th.otherUser, online } } : th
          )
        );
        setSelectedUser((prev) => (prev && prev.id === uid ? { ...prev, online } : prev));
      },
      onSnapshot: (ids) => {
        const onlineSet = new Set(ids);
        setThreads((prev) =>
          prev.map((th) => ({
            ...th,
            otherUser: { ...th.otherUser, online: onlineSet.has(th.otherUser.id) }
          }))
        );
        setSelectedUser((prev) =>
          prev ? { ...prev, online: onlineSet.has(prev.id) } : prev
        );
      }
    });

    registerGlobalMessageHandler(handlerId, (m) => {
      if (disposed) return;
      const otherId = Number(m.senderId) === meId ? Number(m.recipientId) : Number(m.senderId);
      const isOpenInSplit = layout.isSplit && selectedUser?.id === otherId;
      if (isOpenInSplit) {
        mergeSplitMessageRef.current(m);
      }

      // Reload decision is taken outside the updater: React may invoke an
      // updater more than once, and it must stay free of side effects.
      let missingThread = false;
      setThreads((prev) => {
        const { threads: patched, needsFullReload } = patchThreadsFromMessage(prev, m, meId);
        missingThread = needsFullReload;
        return isOpenInSplit ? clearThreadUnread(patched, otherId) : patched;
      });

      if (missingThread) {
        // First message of a brand new conversation — the peer's name and photo
        // are not in the socket payload, so the row has to come from the API.
        loadThreads(folderRef.current === "inbox" ? "inbox" : undefined, {
          soft: true,
          force: true
        }).catch(() => {});
      }
    });

    const deletedHandlerId = Symbol("hub-deleted");
    registerGlobalDeletedHandler(deletedHandlerId, (payload) => {
      if (disposed) return;
      const otherId =
        Number(payload.senderId) === meId
          ? Number(payload.recipientId)
          : Number(payload.senderId);
      const isOpenInSplit = layout.isSplit && selectedUser?.id === otherId;
      if (isOpenInSplit) {
        forgottenMessageIdsRef.current.add(payload.messageId);
        setMessages((prev) => prev.filter((m) => m.id !== payload.messageId));
      }
      loadThreads(folderRef.current === "inbox" ? "inbox" : undefined, {
        soft: true
      }).catch(() => {});
    });

    const conversationDeletedHandlerId = Symbol("hub-conversation-deleted");
    registerGlobalConversationDeletedHandler(conversationDeletedHandlerId, (payload) => {
      if (disposed || meId == null) return;
      const conversationPeer =
        Number(payload.deletedByUserId) === meId
          ? Number(payload.otherUserId)
          : Number(payload.otherUserId) === meId
            ? Number(payload.deletedByUserId)
            : null;
      if (conversationPeer == null) return;

      setThreads((prev) => prev.filter((th) => th.otherUser.id !== conversationPeer));
      setSelectedUser((prev) => (prev?.id === conversationPeer ? null : prev));
      setMessages((prev) => (selectedUser?.id === conversationPeer ? [] : prev));
    });

    return () => {
      disposed = true;
      registerGlobalMessageHandler(handlerId, null);
      registerGlobalDeletedHandler(deletedHandlerId, null);
      registerGlobalConversationDeletedHandler(conversationDeletedHandlerId, null);
      unsubPresence();
    };
  }, [loadThreads, meId, selectedUser?.id, layout.isSplit]);

  /**
   * Watch presence for every peer in the list. Transitions are delivered to
   * watchers only, so an unwatched row would keep whatever dot it loaded with.
   */
  const presenceWatchId = useRef(Symbol("hub-presence"));
  const watchedPeerKey = useMemo(
    () =>
      threads
        .map((t) => Number(t.otherUser.id))
        .sort((a, b) => a - b)
        .join(","),
    [threads]
  );

  useEffect(() => {
    const ids = watchedPeerKey ? watchedPeerKey.split(",").map(Number) : [];
    if (selectedUser?.id != null && !ids.includes(selectedUser.id)) {
      ids.push(selectedUser.id);
    }
    watchPresence(presenceWatchId.current, ids);
  }, [watchedPeerKey, selectedUser?.id]);

  useEffect(() => {
    const watchId = presenceWatchId.current;
    return () => watchPresence(watchId, null);
  }, []);

  /** Merge-only catch-up for the open split-view thread; never wipes live state. */
  const reloadOpenThread = useCallback(
    async (otherUserId: number) => {
      try {
        const hist = await getHistory(otherUserId, HISTORY_LIMIT);
        setMessages((prev) =>
          mergeChatMessages(prev, hist.messages, {
            forgottenIds: forgottenMessageIdsRef.current,
            preserveExistingOutsideWindow: true
          })
        );
        const ackAs = meIdRef.current;
        if (ackAs != null) void ackUndeliveredMessages(hist.messages, ackAs);
      } catch {
        // offline
      }
    },
    []
  );

  const loadOlderMessages = useCallback(async () => {
    const otherId = selectedThreadUserId;
    const cursor = historyNextCursorRef.current;
    if (otherId == null || cursor == null || loadingOlderRef.current) return;
    loadingOlderRef.current = true;
    setLoadingOlder(true);
    try {
      const hist = await getHistory(otherId, HISTORY_LIMIT, cursor);
      setHistoryNextCursor(hist.nextCursorId);
      if (hist.messages.length === 0) return;
      setMessages((prev) =>
        mergeChatMessages(prev, hist.messages, {
          forgottenIds: forgottenMessageIdsRef.current,
          preserveExistingOutsideWindow: true
        })
      );
    } catch {
      /* keep */
    } finally {
      loadingOlderRef.current = false;
      setLoadingOlder(false);
    }
  }, [selectedThreadUserId]);

  /** Socket-first; the REST route emits the same event when we are offline. */
  const markReadSplitRef = useRef<(id: number) => void>(() => {});
  markReadSplitRef.current = (otherUserId: number) => {
    setThreads((prev) => clearThreadUnread(prev, otherUserId));
    const sock = getSocketInstance();
    if (sock?.connected) {
      sock.emit("message:read", { withUserId: otherUserId });
      return;
    }
    markRead(otherUserId).catch(() => {});
  };

  useChatSocket(
    selectedUser?.id ?? null,
    layout.isSplit && !!selectedUser,
    {
      onMessage: mergeSplitMessage,
      onDelivered: ({ messageId, deliveredAt }) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === messageId ? { ...m, deliveredAt } : m))
        );
      },
      onRead: ({ readAt }) => {
        const otherUserId = selectedUser?.id;
        if (otherUserId == null) return;
        setMessages((prev) =>
          prev.map((m) => (m.recipientId === otherUserId ? { ...m, readAt } : m))
        );
      },
      onDeleted: ({ messageId }) => {
        removeMessageLocally(messageId);
      },
      onTyping: applyPeerTyping,
      onIncomingFromOther: () => {
        const otherUserId = selectedUser?.id;
        if (otherUserId == null) return;
        markReadSplitRef.current(otherUserId);
      },
      onReconnect: () => {
        // No server-side replay after a drop: re-pull the list and the open thread.
        void loadThreads(undefined, { soft: true });
        const otherUserId = selectedUser?.id;
        if (otherUserId != null) void reloadOpenThread(otherUserId);
      }
    }
  );

  const send = useCallback(async () => {
    const body = input.trim();
    if (!selectedUser || !body || !meId || sending || chatLocked) return;
    setSending(true);
    setSendError(null);
    setInput("");
    stopTyping();

    const recipientId = selectedUser.id;
    const clientId = `m_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    pendingClientIdsRef.current.add(clientId);
    const optimistic: MessageItem = {
      id: -Date.now(),
      senderId: meId,
      recipientId,
      body,
      clientId,
      deliveredAt: null,
      readAt: null,
      createdAt: new Date().toISOString()
    };
    setMessages((prev) => [...prev, optimistic]);
    listRef.current?.scrollToBottom(true);
    hapticSendMessage().catch(() => {});
    setSending(false);

    const removeOptimistic = () => {
      pendingClientIdsRef.current.delete(clientId);
      setMessages((prev) => prev.filter((x) => x.clientId !== clientId));
    };

    try {
      const saved = await sendChatMessage({
        senderId: meId,
        recipientId,
        body,
        clientId
      });
      pendingClientIdsRef.current.delete(clientId);
      setMessages((prev) =>
        mergeChatMessages(prev, [saved], {
          forgottenIds: forgottenMessageIdsRef.current
        })
      );
      setThreads((prev) => {
        const { threads: next, needsFullReload } = patchThreadsFromMessage(prev, saved, meId);
        if (needsFullReload) loadThreads(undefined, { soft: true }).catch(() => {});
        return next;
      });
      listRef.current?.scrollToBottom(true);
    } catch (e: unknown) {
      removeOptimistic();
      setInput(body);
      setSendError(
        e instanceof Error
          ? e.message
          : "Could not send message. Check your connection and try again."
      );
    }
  }, [chatLocked, input, loadThreads, meId, selectedUser, sending, stopTyping]);

  const renderThread = useCallback(
    ({ item }: { item: Thread }) => {
      const last = item.lastMessage;
      return (
        <ThreadRow
          name={item.otherUser.name}
          preview={last ? last.body : " "}
          time={
            last
              ? new Date(last.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit"
                })
              : undefined
          }
          avatarUri={getImageUrl(item.otherUser.profileImage)}
          online={item.otherUser.online}
          selected={selectedThreadUserId === item.otherUser.id}
          unreadCount={item.unreadCount}
          chatLanes={item.chatLanes}
          muted={item.muted}
          archived={item.archived}
          left={item.left}
          onPress={() => openThread(item)}
          colors={threadColors}
        />
      );
    },
    [openThread, selectedThreadUserId, threadColors]
  );

  const keyThread = useCallback((t: Thread) => String(t.otherUser.id), []);

  const tabBottomPad = Math.max(layout.insets.bottom, 8) + FLOATING_TAB_BAR_HEIGHT + 16;
  const unreadMessageCount = useMemo(
    () => threads.reduce((sum, t) => sum + (t.unreadCount ?? 0), 0),
    [threads]
  );

  const onTabPress = useCallback(
    (tab: TabId) => {
      handleMainTabPress(navigation, "messages", tab);
    },
    [navigation]
  );

  const tabBar = (
    <BottomTabBar
      activeTab="messages"
      onTabPress={onTabPress}
      messageCount={unreadMessageCount}
      bottomInset={layout.insets.bottom}
    />
  );

  const handleUnblockMember = useCallback(
    (member: BlockedMember) => {
      appAlert(
        "Unblock member?",
        `Unblock ${member.fullName}? You will be able to message again if you were connected or matched before.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Unblock",
            onPress: () =>
              void (async () => {
                try {
                  await unblockMember(member.id);
                  setBlockedMembers((prev) => prev.filter((b) => b.id !== member.id));
                } catch (e: unknown) {
                  appAlert("Error", e instanceof Error ? e.message : "Failed to unblock");
                }
              })()
          }
        ]
      );
    },
    []
  );

  const openBlockedMember = useCallback(
    (member: BlockedMember) => {
      navigation.navigate("Chat", {
        otherUserId: member.id,
        name: member.fullName,
        profileImage: null
      });
    },
    [navigation]
  );

  const onThreadPanelBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const onThreadPanelSearch = useCallback(() => {
    navigation.navigate("SearchMembers", { context: "messages" });
  }, [navigation]);

  const threadPanel = (
    <ThreadListPanel
      width={layout.sidebarWidth}
      fullWidth={layout.isPhone}
      onBack={onThreadPanelBack}
      onSearch={onThreadPanelSearch}
      colors={threadColors}
      titleSize={layout.titleSize}
      loadingThreads={loadingThreads}
      loadingMoreThreads={loadingMoreThreads}
      threadsError={threadsError}
      threads={threads}
      renderThread={renderThread}
      keyThread={keyThread}
      onEndReachedThreads={() => void loadMoreThreads()}
      folder={folder}
      onFolderChange={onFolderChange}
      contentBottomInset={tabBottomPad}
      blockedMembers={blockedMembers}
      onUnblockMember={handleUnblockMember}
      onOpenBlockedMember={openBlockedMember}
    />
  );

  const lockBanner =
    chatLockMessage && selectedUser ? (
      <View style={[styles.lockBanner, { backgroundColor: colors.surfaceElevated }]}>
        <Ionicons name="lock-closed-outline" size={16} color={colors.textSecondary} />
        <Text style={[styles.lockBannerText, { color: colors.textSecondary }]}>{chatLockMessage}</Text>
      </View>
    ) : undefined;

  const handleSharedPostPress = useCallback(
    (sharedPostId: number) => {
      navigation.navigate("PostDetail", { postId: sharedPostId });
    },
    [navigation]
  );

  const handleSharedStoryPress = useCallback(
    (sharedStoryId: number) => {
      void openSharedStoryInViewer({
        sharedStoryId,
        meId,
        peer: selectedUser
          ? { name: selectedUser.fullName, profileImage: selectedUser.profileImage }
          : null,
        navigation
      });
    },
    [navigation, meId, selectedUser]
  );

  const openPeerProfile = useCallback(() => {
    if (selectedUser?.id == null) return;
    navigation.navigate("MemberProfile", { userId: selectedUser.id });
  }, [navigation, selectedUser?.id]);

  if (!layout.isSplit) {
    return (
      <SafeAreaView
        style={[styles.fill, { backgroundColor: colors.surface }]}
        edges={["top", "left", "right"]}
      >
        <View style={styles.fill}>{threadPanel}</View>
        {tabBar}
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.background }]} edges={["top", "left", "right"]}>
      <View style={styles.splitRow}>
        {threadPanel}
        <View style={[styles.chatColumn, { paddingBottom: tabBottomPad }]}>
          {selectedUser ? (
            <ChatPanel
              title={selectedUser.fullName}
              subtitle={
                isPresenceHidden(selectedUser.id)
                  ? "Last seen hidden"
                  : selectedUser.online
                    ? "Online"
                    : formatLastSeen(getCachedLastSeenAt(selectedUser.id))
                      ? `Last seen ${formatLastSeen(getCachedLastSeenAt(selectedUser.id))}`
                      : "Offline"
              }
              messages={messages}
              meId={meId}
              loading={loadingChat}
              error={chatError}
              sendError={sendError}
              input={chatLocked ? "" : input}
              sending={sending}
              onChangeText={chatLocked ? () => {} : onChangeComposer}
              onSend={chatLocked ? () => {} : send}
              listRef={listRef}
              bubbleMaxWidth={layout.bubbleMaxWidth}
              fontSize={layout.fontSize}
              horizontalPadding={layout.horizontalPadding}
              composerPaddingBottom={layout.composerPaddingBottom}
              chatKeyboardInset={layout.chatKeyboardInset}
              keyboardVisible={layout.keyboardVisible}
              peerTyping={typing.peerTyping}
              loadingOlder={loadingOlder}
              onLoadOlder={() => void loadOlderMessages()}
              otherAvatarUri={getImageUrl(selectedUser.profileImage)}
              headerAvatarUri={getImageUrl(selectedUser.profileImage)}
              colors={panelColors}
              headerTopInset={0}
              headerBanner={lockBanner}
              onAvatarPress={openPeerProfile}
              onSharedPostPress={handleSharedPostPress}
              onSharedStoryPress={handleSharedStoryPress}
              onDeleteMessage={handleDeleteMessage}
            />
          ) : (
            <View style={[styles.emptyChat, { backgroundColor: colors.background }]}>
              <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyChatTitle, { color: colors.text }]}>Your conversations</Text>
              <Text style={[styles.emptyChatSub, { color: colors.textSecondary }]}>
                Pick a conversation on the left. New chats open after connection or mutual matrimony match.
              </Text>
            </View>
          )}
        </View>
      </View>
      {tabBar}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  splitRow: {
    flex: 1,
    flexDirection: "row",
    minHeight: 0,
    overflow: "hidden"
  },
  chatColumn: {
    flex: 1,
    minWidth: 0,
    minHeight: 0
  },
  emptyChat: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32
  },
  emptyChatTitle: {
    fontSize: 17,
    fontWeight: "800",
    marginTop: 14
  },
  emptyChatSub: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 20
  },
  lockBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10
  },
  lockBannerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17
  }
});
