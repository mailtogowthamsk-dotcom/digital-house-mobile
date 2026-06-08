import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useTheme } from "../../theme/ThemeContext";
import { getImageUrl } from "../../api/client";
import { hapticSendMessage } from "../../utils/chatHaptics";
import { searchUsers, type DirectoryUser } from "../../api/users.api";
import { getMe } from "../../api/auth.api";
import {
  getHistory,
  listThreads,
  markRead,
  sendMessage,
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

export function MessagesHubScreen() {
  const navigation = useNavigation<any>();
  const layout = useChatLayout();
  const { colors } = useTheme();

  const [meId, setMeId] = useState<number | null>(null);
  const [searchMode, setSearchMode] = useState(false);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [threadsError, setThreadsError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DirectoryUser[]>([]);
  const [loadingResults, setLoadingResults] = useState(false);
  const [resultsError, setResultsError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<DirectoryUser | null>(null);
  const [selectedThreadUserId, setSelectedThreadUserId] = useState<number | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [otherTyping, setOtherTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingClientIdsRef = useRef<Set<string>>(new Set());
  const listRef = useRef<ChatMessageListHandle>(null);

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

  const loadThreads = useCallback(async () => {
    const gen = ++threadsLoadGenRef.current;
    setThreadsError(null);
    setLoadingThreads(true);
    try {
      const data = await listThreads();
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

  const loadSearch = useCallback(async (q: string) => {
    setResultsError(null);
    const trimmed = q.trim();
    if (!trimmed) {
      setResults([]);
      return;
    }
    setLoadingResults(true);
    try {
      const data = await searchUsers(trimmed);
      setResults(data);
    } finally {
      setLoadingResults(false);
    }
  }, []);

  useEffect(() => {
    loadMe().catch(() => {});
  }, [loadMe]);

  /** Reset list UI when returning from Chat (e.g. after "New chat") and refresh threads. */
  useFocusEffect(
    useCallback(() => {
      setSearchMode(false);
      setQuery("");
      setResults([]);
      setResultsError(null);
      if (!layout.isSplit) {
        setSelectedUser(null);
        setSelectedThreadUserId(null);
        setMessages([]);
        setChatError(null);
        setSendError(null);
        setLoadingChat(false);
      }
      void loadThreads();
    }, [loadThreads, layout.isSplit])
  );

  useAppResume(() => {
    void loadThreads();
  });

  useEffect(() => {
    if (!searchMode) return;
    const t = setTimeout(() => {
      loadSearch(query).catch((e: unknown) =>
        setResultsError(e instanceof Error ? e.message : "Failed to search users")
      );
    }, 200);
    return () => clearTimeout(t);
  }, [query, loadSearch, searchMode]);

  const openUser = useCallback(
    async (u: DirectoryUser) => {
      if (!layout.isSplit) {
        setSearchMode(false);
        setQuery("");
        setResults([]);
        navigation.navigate("Chat", {
          otherUserId: u.id,
          name: u.fullName,
          profileImage: u.profileImage ?? null
        });
        return;
      }

      setSelectedUser(u);
      setLoadingChat(true);
      setChatError(null);
      setSendError(null);
      setMessages([]);
      try {
        const hist = await getHistory(u.id, HISTORY_LIMIT);
        setMessages(hist.messages);
        listRef.current?.scrollToBottom(false);
        await markRead(u.id).catch(() => {});
        setThreads((prev) => clearThreadUnread(prev, u.id));
        const sock = await getSocket();
        sock.emit("message:read", { withUserId: u.id });
      } catch (e: unknown) {
        setChatError(e instanceof Error ? e.message : "Failed to load chat");
      } finally {
        setLoadingChat(false);
      }
    },
    [layout.isSplit, navigation]
  );

  const openThread = useCallback(
    async (t: Thread) => {
      const other = t.otherUser;
      setSelectedThreadUserId(other.id);
      await openUser({
        id: other.id,
        fullName: other.name,
        profileImage: other.profileImage,
        online: other.online
      });
    },
    [openUser]
  );

  const emitTyping = useCallback(async (typing: boolean) => {
    if (!selectedUser) return;
    try {
      const sock = await getSocket();
      sock.emit("typing", { toUserId: selectedUser.id, typing });
    } catch {
      // offline
    }
  }, [selectedUser]);

  const onChangeComposer = useCallback(
    (t: string) => {
      setInput(t);
      setSendError(null);
      emitTyping(t.trim().length > 0).catch(() => {});
    },
    [emitTyping]
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
          setResults((prev) => prev.map((x) => (x.id === uid ? { ...x, online } : x)));
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
            if (needsFullReload) loadThreads().catch(() => {});
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
    if (!selectedUser || !body || !meId || sending) return;
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
      } catch {
        removeOptimistic();
        setInput(body);
        setSendError("Could not send message. Check your connection and try again.");
      }
    } finally {
      setSending(false);
    }
  }, [emitTyping, input, loadThreads, meId, selectedUser, sending]);

  const toggleSearch = useCallback(() => {
    setSearchMode((wasSearch) => {
      const next = !wasSearch;
      if (wasSearch) {
        setQuery("");
        setResults([]);
        setResultsError(null);
        void loadThreads();
      } else {
        setQuery("");
        setResults([]);
        if (layout.isSplit) {
          setSelectedUser(null);
          setSelectedThreadUserId(null);
          setMessages([]);
        }
      }
      return next;
    });
  }, [loadThreads, layout.isSplit]);

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
          onPress={() => openThread(item)}
          colors={threadColors}
        />
      );
    },
    [openThread, selectedThreadUserId, threadColors]
  );

  const renderResult = useCallback(
    ({ item }: { item: DirectoryUser }) => (
      <ThreadRow
        name={item.fullName}
        preview="Tap to start chat"
        avatarUri={getImageUrl(item.profileImage)}
        online={item.online}
        selected={selectedUser?.id === item.id}
        onPress={() => openUser(item)}
        colors={threadColors}
      />
    ),
    [openUser, selectedUser?.id, threadColors]
  );

  const keyThread = useCallback((t: Thread) => String(t.otherUser.id), []);
  const keyUser = useCallback((u: DirectoryUser) => String(u.id), []);

  const threadPanel = (
    <ThreadListPanel
      width={layout.sidebarWidth}
      fullWidth={layout.isPhone}
      onBack={() => navigation.goBack()}
      colors={threadColors}
      titleSize={layout.titleSize}
      searchMode={searchMode}
      onToggleSearch={toggleSearch}
      query={query}
      onQueryChange={setQuery}
      loadingThreads={loadingThreads}
      threadsError={threadsError}
      threads={threads}
      renderThread={renderThread}
      loadingResults={loadingResults}
      resultsError={resultsError}
      results={results}
      queryTrimmed={query.trim()}
      renderResult={renderResult}
      keyThread={keyThread}
      keyUser={keyUser}
    />
  );

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
              input={input}
              sending={sending}
              onChangeText={onChangeComposer}
              onSend={send}
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
            />
          ) : (
            <View style={[styles.emptyChat, { backgroundColor: colors.background }]}>
              <Ionicons name="chatbubble-ellipses-outline" size={48} color={colors.textSecondary} />
              <Text style={[styles.emptyChatTitle, { color: colors.text }]}>Start chatting</Text>
              <Text style={[styles.emptyChatSub, { color: colors.textSecondary }]}>
                {searchMode
                  ? "Search and pick a user to start messaging."
                  : "Pick a conversation on the left."}
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
  }
});
