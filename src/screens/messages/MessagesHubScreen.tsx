import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useTheme } from "../../theme/ThemeContext";
import { getImageUrl } from "../../api/client";
import { hapticSendMessage } from "../../utils/chatHaptics";
import { getMe } from "../../api/auth.api";
import {
  getHistory,
  getMessageAccess,
  listThreads,
  markRead,
  sendMessage,
  type MessageAccess,
  type MessageItem,
  type Thread
} from "../../api/messages.api";
import { getSocket } from "../../realtime/socket";
import { useChatSocket } from "../../hooks/useChatSocket";
import { clearThreadUnread, patchThreadsFromMessage } from "../../utils/messageThreads";
import { useChatLayout } from "../../hooks/useChatLayout";
import { useAppResume } from "../../hooks/useAppResume";
import { ThreadListPanel, ThreadRow } from "../../components/messages/ThreadListPanel";
import { ChatPanel } from "../../components/messages/ChatPanel";
import type { ChatMessageListHandle } from "../../components/messages/ChatMessageList";

const HISTORY_LIMIT = 50;

type SelectedChat = {
  id: number;
  fullName: string;
  profileImage: string | null;
  online?: boolean;
};

export function MessagesHubScreen() {
  const navigation = useNavigation<any>();
  const layout = useChatLayout();
  const { colors } = useTheme();

  const [meId, setMeId] = useState<number | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [folder, setFolder] = useState<"inbox" | "archived">("inbox");
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [threadsError, setThreadsError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<SelectedChat | null>(null);
  const [selectedThreadUserId, setSelectedThreadUserId] = useState<number | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatAccess, setChatAccess] = useState<MessageAccess | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [otherTyping, setOtherTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingClientIdsRef = useRef<Set<string>>(new Set());
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
    const me = await getMe();
    setMeId(me.id);
  }, []);

  const threadsLoadGenRef = useRef(0);

  const folderRef = useRef(folder);
  folderRef.current = folder;

  const loadThreads = useCallback(async (activeFolder?: "inbox" | "archived") => {
    const folderToLoad = activeFolder ?? folderRef.current;
    const gen = ++threadsLoadGenRef.current;
    setThreadsError(null);
    setLoadingThreads(true);
    try {
      const data =
        folderToLoad === "archived"
          ? await listThreads({ archivedOnly: true })
          : await listThreads();
      if (gen !== threadsLoadGenRef.current) return;
      setThreads(data);
    } catch (e: unknown) {
      if (gen === threadsLoadGenRef.current) {
        setThreadsError(e instanceof Error ? e.message : "Failed to load conversations");
      }
    } finally {
      if (gen === threadsLoadGenRef.current) {
        setLoadingThreads(false);
      }
    }
  }, []);

  const onFolderChange = useCallback(
    (next: "inbox" | "archived") => {
      setFolder(next);
      setSelectedUser(null);
      setSelectedThreadUserId(null);
      void loadThreads(next);
    },
    [loadThreads]
  );

  useEffect(() => {
    loadMe().catch(() => {});
  }, [loadMe]);

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
      void loadThreads();
    }, [loadThreads, layout.isSplit])
  );

  useAppResume(() => {
    void loadThreads();
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
          profileImage: other.profileImage ?? null
        });
        return;
      }

      setSelectedUser(chatUser);
      setSelectedThreadUserId(other.id);
      setLoadingChat(true);
      setChatError(null);
      setSendError(null);
      setMessages([]);
      setChatAccess(null);

      try {
        const access = await getMessageAccess(other.id);
        setChatAccess(access);
        if (!access.canViewHistory) {
          setChatError(access.message ?? "You cannot view this conversation.");
          return;
        }

        const hist = await getHistory(other.id, HISTORY_LIMIT);
        setMessages(hist.messages);
        listRef.current?.scrollToBottom(false);
        await markRead(other.id).catch(() => {});
        setThreads((prev) => clearThreadUnread(prev, other.id));
        const sock = await getSocket();
        sock.emit("message:read", { withUserId: other.id });
      } catch (e: unknown) {
        setChatError(e instanceof Error ? e.message : "Failed to load chat");
      } finally {
        setLoadingChat(false);
      }
    },
    [layout.isSplit, navigation]
  );

  const emitTyping = useCallback(async (typing: boolean) => {
    if (!selectedUser || chatLocked) return;
    try {
      const sock = await getSocket();
      sock.emit("typing", { toUserId: selectedUser.id, typing });
    } catch {
      // offline
    }
  }, [chatLocked, selectedUser]);

  const onChangeComposer = useCallback(
    (t: string) => {
      if (chatLocked) return;
      setInput(t);
      setSendError(null);
      emitTyping(t.trim().length > 0).catch(() => {});
    },
    [chatLocked, emitTyping]
  );

  const mergeSplitMessage = useCallback(
    (incoming: MessageItem) => {
      setMessages((prev) => {
        const incomingClientId =
          typeof incoming.clientId === "string" ? incoming.clientId : null;
        if (incomingClientId && pendingClientIdsRef.current.has(incomingClientId)) {
          pendingClientIdsRef.current.delete(incomingClientId);
          const replaced = prev.map((x) =>
            x.clientId === incomingClientId ? incoming : x
          );
          if (replaced.some((x) => x.id === incoming.id)) return replaced;
          return replaced;
        }
        if (prev.some((x) => x.id === incoming.id)) return prev;
        return [...prev, incoming];
      });
      scrollToBottomIfNeeded(true);
    },
    [scrollToBottomIfNeeded]
  );

  const mergeSplitMessageRef = useRef(mergeSplitMessage);
  mergeSplitMessageRef.current = mergeSplitMessage;

  useEffect(() => {
    if (meId == null) return;
    let disposed = false;
    let teardown: (() => void) | null = null;

    (async () => {
      try {
        const sock = await getSocket();
        if (disposed) return;

        const onPresence = (p: unknown) => {
          const payload = p as { userId?: number; online?: boolean };
          const uid = Number(payload?.userId);
          const online = !!payload?.online;
          if (!uid) return;
          setThreads((prev) =>
            prev.map((th) =>
              th.otherUser.id === uid ? { ...th, otherUser: { ...th.otherUser, online } } : th
            )
          );
          setSelectedUser((prev) => (prev && prev.id === uid ? { ...prev, online } : prev));
        };

        const onThreadMessage = (raw: unknown) => {
          if (!raw || typeof raw !== "object") return;
          const m = raw as MessageItem;
          const otherId = m.senderId === meId ? m.recipientId : m.senderId;
          if (layout.isSplit && selectedUser?.id === otherId) {
            mergeSplitMessageRef.current(m);
          }
          setThreads((prev) => {
            const { threads: patched, needsFullReload } = patchThreadsFromMessage(prev, m, meId);
            // Don't pull archived chats back into Inbox via socket reload
            if (needsFullReload && folderRef.current === "inbox") {
              /* stay on current inbox list — full reload would still exclude archived */
              loadThreads("inbox").catch(() => {});
            } else if (needsFullReload) {
              loadThreads().catch(() => {});
            }
            if (layout.isSplit && selectedUser?.id === otherId) {
              return clearThreadUnread(patched, otherId);
            }
            return patched;
          });
        };

        sock.on("presence:update", onPresence);
        sock.on("message:new", onThreadMessage);
        sock.on("message:sent", onThreadMessage);

        teardown = () => {
          sock.off("presence:update", onPresence);
          sock.off("message:new", onThreadMessage);
          sock.off("message:sent", onThreadMessage);
        };
      } catch {
        // offline
      }
    })();

    return () => {
      disposed = true;
      teardown?.();
    };
  }, [loadThreads, meId, selectedUser?.id, layout.isSplit]);

  const markReadSplitRef = useRef<(id: number) => void>(() => {});
  markReadSplitRef.current = (otherUserId: number) => {
    markRead(otherUserId)
      .then(() => setThreads((prev) => clearThreadUnread(prev, otherUserId)))
      .catch(() => {});
    getSocket()
      .then((sock) => sock.emit("message:read", { withUserId: otherUserId }))
      .catch(() => {});
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
      onTyping: (typing) => {
        setOtherTyping(typing);
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        if (typing) {
          typingTimeoutRef.current = setTimeout(() => setOtherTyping(false), 1500);
        }
      },
      onIncomingFromOther: (m) => {
        const otherUserId = selectedUser?.id;
        if (otherUserId == null) return;
        getSocket()
          .then((sock) => sock.emit("message:delivered", { messageId: m.id }))
          .catch(() => {});
        markReadSplitRef.current(otherUserId);
      }
    }
  );

  const send = useCallback(async () => {
    const body = input.trim();
    if (!selectedUser || !body || !meId || sending || chatLocked) return;
    setSending(true);
    setSendError(null);
    setInput("");
    emitTyping(false).catch(() => {});

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

    const removeOptimistic = () => {
      pendingClientIdsRef.current.delete(clientId);
      setMessages((prev) => prev.filter((x) => x.clientId !== clientId));
    };

    try {
      const sock = await getSocket();
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Socket send timeout")), 12_000);
        sock.emit(
          "message:send",
          { recipientId, body, clientId },
          (resp: { ok?: boolean; error?: string }) => {
            clearTimeout(timer);
            if (resp?.ok) resolve();
            else reject(new Error(resp?.error || "Failed to send"));
          }
        );
      });
    } catch {
      try {
        const saved = await sendMessage(recipientId, body, clientId);
        pendingClientIdsRef.current.delete(clientId);
        setMessages((prev) => prev.map((x) => (x.clientId === clientId ? saved : x)));
        if (meId != null) {
          setThreads((prev) => {
            const { threads: next, needsFullReload } = patchThreadsFromMessage(prev, saved, meId);
            if (needsFullReload) loadThreads().catch(() => {});
            return next;
          });
        }
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
    } finally {
      setSending(false);
    }
  }, [chatLocked, emitTyping, input, loadThreads, meId, selectedUser, sending]);

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
          onPress={() => openThread(item)}
          colors={threadColors}
        />
      );
    },
    [openThread, selectedThreadUserId, threadColors]
  );

  const keyThread = useCallback((t: Thread) => String(t.otherUser.id), []);

  const threadPanel = (
    <ThreadListPanel
      width={layout.sidebarWidth}
      fullWidth={layout.isPhone}
      onBack={() => navigation.goBack()}
      colors={threadColors}
      titleSize={layout.titleSize}
      loadingThreads={loadingThreads}
      threadsError={threadsError}
      threads={threads}
      renderThread={renderThread}
      keyThread={keyThread}
      folder={folder}
      onFolderChange={onFolderChange}
    />
  );

  const lockBanner =
    chatLockMessage && selectedUser ? (
      <View style={[styles.lockBanner, { backgroundColor: colors.surfaceElevated }]}>
        <Ionicons name="lock-closed-outline" size={16} color={colors.textSecondary} />
        <Text style={[styles.lockBannerText, { color: colors.textSecondary }]}>{chatLockMessage}</Text>
      </View>
    ) : undefined;

  if (!layout.isSplit) {
    return (
      <SafeAreaView
        style={[styles.fill, { backgroundColor: colors.surface }]}
        edges={["top", "left", "right"]}
      >
        <View style={styles.fill}>{threadPanel}</View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.background }]} edges={["top", "left", "right"]}>
      <View style={styles.splitRow}>
        {threadPanel}
        <View style={styles.chatColumn}>
          {selectedUser ? (
            <ChatPanel
              title={selectedUser.fullName}
              subtitle={
                otherTyping ? "Typing…" : selectedUser.online ? "Online" : "Offline"
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
              otherAvatarUri={getImageUrl(selectedUser.profileImage)}
              headerAvatarUri={getImageUrl(selectedUser.profileImage)}
              colors={panelColors}
              headerTopInset={0}
              headerBanner={lockBanner}
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
