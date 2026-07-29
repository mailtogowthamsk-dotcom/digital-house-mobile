import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, View, Text } from "react-native";
import { useRoute, RouteProp, useNavigation, useIsFocused } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { spacing } from "../../theme/spacing";
import { getImageUrl } from "../../api/client";
import { getMe } from "../../api/auth.api";
import { hapticSendMessage } from "../../utils/chatHaptics";
import { ChatMessagesSkeleton } from "../../components/messages/ChatSkeleton";
import { ChatHeader } from "../../components/messages/ChatHeader";
import {
  getHistory,
  getMessageAccess,
  listThreads,
  markRead,
  updateThreadPreference,
  type MessageAccess,
  type MessageItem
} from "../../api/messages.api";
import {
  blockMember,
  unblockMember,
  listBlockedMembers,
  reportMember,
  MEMBER_REPORT_REASONS
} from "../../api/users.api";
import { getSocketInstance } from "../../realtime/socket";
import { sendChatMessage } from "../../realtime/sendChatMessage";
import {
  subscribePresence,
  watchPresence,
  isUserOnlineCached,
  hasPresenceSynced,
  formatLastSeen,
  getCachedLastSeenAt
} from "../../realtime/presenceRealtime";
import { ackUndeliveredMessages } from "../../realtime/deliveryRealtime";
import { useChatSocket } from "../../hooks/useChatSocket";
import { useChatTyping } from "../../hooks/useChatTyping";
import { useAppResume } from "../../hooks/useAppResume";
import { useChatLayout } from "../../hooks/useChatLayout";
import { ChatPanel } from "../../components/messages/ChatPanel";
import type { ChatMessageListHandle } from "../../components/messages/ChatMessageList";
import { appAlert } from "../../utils/appAlert";
import { mergeChatMessages } from "../../utils/mergeChatMessages";

type ChatParams = {
  otherUserId: number;
  name: string;
  profileImage?: string | null;
  online?: boolean;
};

const HISTORY_LIMIT = 40;

export function ChatScreen() {
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const route = useRoute<RouteProp<{ Chat: ChatParams }, "Chat">>();
  const { colors } = useTheme();
  const layout = useChatLayout();
  const { otherUserId, name, profileImage } = route.params;
  const otherAvatarUri = getImageUrl(profileImage);

  const listRef = useRef<ChatMessageListHandle>(null);
  const [meId, setMeId] = useState<number | null>(null);
  const [messages, setMessages] = useState<MessageItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [otherOnline, setOtherOnline] = useState(
    () => !!route.params.online || isUserOnlineCached(otherUserId)
  );
  const [otherLastSeen, setOtherLastSeen] = useState<string | null>(() =>
    getCachedLastSeenAt(otherUserId)
  );

  const pendingClientIdsRef = useRef<Set<string>>(new Set());
  const [chatAccess, setChatAccess] = useState<MessageAccess | null>(null);
  const [threadMuted, setThreadMuted] = useState(false);
  const [threadArchived, setThreadArchived] = useState(false);
  /** True when *I* blocked the other user (Unblock is available). */
  const [blockedByMe, setBlockedByMe] = useState(false);
  const chatLocked = !!chatAccess && (!chatAccess.allowed || chatAccess.readOnly);
  const chatLockMessage = chatAccess?.message ?? null;
  const isBlocked =
    chatAccess?.reason === "blocked" || chatAccess?.code === "BLOCKED";
  const canRestoreMessaging =
    !blockedByMe &&
    !isBlocked &&
    !!chatAccess &&
    (chatAccess.readOnly || !chatAccess.allowed) &&
    (chatAccess.reason === "legacy_thread" || chatAccess.code === "READ_ONLY_LEGACY");

  const scrollToBottomIfNeeded = useCallback((animated = true) => {
    if (listRef.current?.shouldAutoScroll() !== false) {
      listRef.current?.scrollToBottom(animated);
    }
  }, []);

  const mergeIncomingMessage = useCallback(
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

  const loadInitial = useCallback(async () => {
    setLoadError(null);
    const me = await getMe();
    setMeId(me.id);
    const hist = await getHistory(otherUserId, HISTORY_LIMIT);
    setMessages((prev) => mergeChatMessages(prev, hist.messages));
    void ackUndeliveredMessages(hist.messages, me.id);
  }, [otherUserId]);

  /** Soft catch-up after reconnect — merge only, never wipe live state. */
  const syncRecent = useCallback(async () => {
    try {
      const hist = await getHistory(otherUserId, HISTORY_LIMIT);
      setMessages((prev) => mergeChatMessages(prev, hist.messages));
      if (meId != null) void ackUndeliveredMessages(hist.messages, meId);
    } catch {
      // offline
    }
  }, [meId, otherUserId]);

  const refreshChatAccess = useCallback(async () => {
    const access = await getMessageAccess(otherUserId);
    setChatAccess(access);
    const accessBlocked = access.reason === "blocked" || access.code === "BLOCKED";
    if (accessBlocked) {
      const blocked = await listBlockedMembers().catch(() => []);
      setBlockedByMe(blocked.some((b) => b.id === otherUserId));
    } else {
      setBlockedByMe(false);
    }
    if (!access.canViewHistory) {
      setLoadError(access.message ?? "You cannot view this conversation.");
      setMessages([]);
      return access;
    }
    setLoadError(null);
    await loadInitial();
    return access;
  }, [loadInitial, otherUserId]);

  useEffect(() => {
    navigation.setOptions?.({ title: name });
  }, [navigation, name]);

  const presenceWatchId = useRef(Symbol("chat-presence"));

  useEffect(() => {
    setOtherOnline(!!route.params.online || isUserOnlineCached(otherUserId));
    setOtherLastSeen(getCachedLastSeenAt(otherUserId));
    // Join this peer's presence watch room so transitions reach us regardless
    // of whether we share a community with them.
    watchPresence(presenceWatchId.current, [otherUserId]);
    const unsubscribe = subscribePresence({
      onUpdate: (uid, online, lastSeenAt) => {
        if (uid !== otherUserId) return;
        setOtherOnline(online);
        if (!online) setOtherLastSeen(lastSeenAt ?? getCachedLastSeenAt(otherUserId));
        else setOtherLastSeen(null);
      },
      onSnapshot: (ids) => {
        const online = ids.includes(otherUserId);
        setOtherOnline(online);
        if (!online) setOtherLastSeen(getCachedLastSeenAt(otherUserId));
        else setOtherLastSeen(null);
      }
    });

    const watchId = presenceWatchId.current;
    return () => {
      unsubscribe();
      watchPresence(watchId, null);
    };
  }, [otherUserId, route.params.online]);

  useEffect(() => {
    let cancelled = false;
    // Clear previous chat's lock banner immediately when switching users
    setChatAccess(null);
    setLoadError(null);
    setThreadMuted(false);
    setThreadArchived(false);
    setBlockedByMe(false);
    setMessages([]);
    setSendError(null);
    setInput("");

    (async () => {
      try {
        setLoading(true);
        const access = await getMessageAccess(otherUserId);
        if (cancelled) return;
        setChatAccess(access);
        const accessBlocked = access.reason === "blocked" || access.code === "BLOCKED";
        if (accessBlocked) {
          const blocked = await listBlockedMembers().catch(() => []);
          if (cancelled) return;
          setBlockedByMe(blocked.some((b) => b.id === otherUserId));
        } else {
          setBlockedByMe(false);
        }
        const allThreads = await listThreads({ includeArchived: true }).catch(() => []);
        if (cancelled) return;
        const hit = allThreads.find((t) => t.otherUser.id === otherUserId);
        setThreadMuted(!!hit?.muted);
        setThreadArchived(!!hit?.archived);
        if (hasPresenceSynced()) {
          setOtherOnline(isUserOnlineCached(otherUserId));
          setOtherLastSeen(getCachedLastSeenAt(otherUserId));
        } else if (hit?.otherUser.online != null) {
          setOtherOnline(!!hit.otherUser.online || isUserOnlineCached(otherUserId));
        }
        if (!access.canViewHistory) {
          setLoadError(access.message ?? "You cannot view this conversation.");
          setMessages([]);
          return;
        }
        await loadInitial();
        if (cancelled) return;
        listRef.current?.scrollToBottom(false);
      } catch (e: unknown) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Failed to load chat");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadInitial, otherUserId]);

  const typing = useChatTyping(otherUserId, !chatLocked);
  const { onInputChange, stopTyping, applyPeerTyping } = typing;

  const onChangeText = useCallback(
    (t: string) => {
      if (chatLocked) return;
      setInput(t);
      setSendError(null);
      onInputChange(t);
    },
    [chatLocked, onInputChange]
  );

  /** Socket-first; REST covers the offline case and emits the same event server-side. */
  const markReadNow = useCallback(async () => {
    const sock = getSocketInstance();
    if (sock?.connected) {
      sock.emit("message:read", { withUserId: otherUserId });
      return;
    }
    await markRead(otherUserId).catch(() => {});
  }, [otherUserId]);

  useEffect(() => {
    if (!isFocused) return;
    markReadNow().catch(() => {});
  }, [isFocused, markReadNow]);

  const markReadNowRef = useRef(markReadNow);
  markReadNowRef.current = markReadNow;
  const isFocusedRef = useRef(isFocused);
  isFocusedRef.current = isFocused;
  const syncRecentRef = useRef(syncRecent);
  syncRecentRef.current = syncRecent;

  /**
   * Nothing is replayed after a drop and no events arrive while backgrounded,
   * so reconcile on both transitions instead of polling.
   */
  useAppResume(() => {
    void syncRecentRef.current();
    if (isFocusedRef.current) markReadNowRef.current().catch(() => {});
  });

  useChatSocket(otherUserId, true, {
    onMessage: mergeIncomingMessage,
    onDelivered: ({ messageId, deliveredAt }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, deliveredAt } : m))
      );
    },
    onRead: ({ readAt }) => {
      setMessages((prev) =>
        prev.map((m) =>
          Number(m.recipientId) === Number(otherUserId) ? { ...m, readAt } : m
        )
      );
    },
    onTyping: applyPeerTyping,
    onIncomingFromOther: (_m, _sock) => {
      if (!isFocusedRef.current) return;
      markReadNowRef.current().catch(() => {});
    },
    onReconnect: () => {
      void syncRecentRef.current();
      if (isFocusedRef.current) markReadNowRef.current().catch(() => {});
    }
  });

  const send = useCallback(async () => {
    const body = input.trim();
    if (!body || !meId || sending || chatLocked) return;
    setSending(true);
    setSendError(null);
    setInput("");
    stopTyping();

    const clientId = `m_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    pendingClientIdsRef.current.add(clientId);
    const optimistic: MessageItem = {
      id: -Date.now(),
      senderId: meId,
      recipientId: otherUserId,
      body,
      clientId,
      deliveredAt: null,
      readAt: null,
      createdAt: new Date().toISOString()
    };

    setMessages((prev) => [...prev, optimistic]);
    listRef.current?.scrollToBottom(true);
    hapticSendMessage().catch(() => {});
    // Unlock composer immediately — WhatsApp-like feel; failures roll back below.
    setSending(false);

    const removeOptimistic = () => {
      pendingClientIdsRef.current.delete(clientId);
      setMessages((prev) => prev.filter((x) => x.clientId !== clientId));
    };

    try {
      const saved = await sendChatMessage({
        senderId: meId,
        recipientId: otherUserId,
        body,
        clientId
      });
      pendingClientIdsRef.current.delete(clientId);
      setMessages((prev) => {
        const byClient = prev.map((x) => (x.clientId === clientId ? saved : x));
        if (byClient.some((x) => x.id === saved.id)) return byClient;
        return byClient;
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
  }, [chatLocked, input, meId, otherUserId, sending, stopTyping]);

  const handleSharedPostPress = useCallback(
    (sharedPostId: number) => {
      navigation.navigate("PostDetail", { postId: sharedPostId });
    },
    [navigation]
  );

  const submitReport = async (reasonCode: string) => {
    try {
      await reportMember(otherUserId, reasonCode);
      appAlert("Thank you", "Report submitted. Our team will review it.");
    } catch (e: unknown) {
      appAlert("Report", e instanceof Error ? e.message : "Failed");
    }
  };

  const confirmBlock = () => {
    appAlert(
      "Block member?",
      "They will be hidden from search, messaging, and connections. Unblock anytime from Messages → Blocked.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: () =>
            void (async () => {
              try {
                await blockMember(otherUserId);
                setBlockedByMe(true);
                await refreshChatAccess();
              } catch (e: unknown) {
                appAlert("Error", e instanceof Error ? e.message : "Failed to block");
              }
            })()
        }
      ]
    );
  };

  const confirmUnblock = () => {
    appAlert(
      "Unblock member?",
      "Your previous connection or matrimony match will be restored so you can message again.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Unblock",
          onPress: () =>
            void (async () => {
              try {
                setLoading(true);
                await unblockMember(otherUserId);
                await refreshChatAccess();
              } catch (e: unknown) {
                appAlert("Error", e instanceof Error ? e.message : "Failed to unblock");
              } finally {
                setLoading(false);
              }
            })()
        }
      ]
    );
  };

  const restoreMessaging = () => {
    appAlert(
      "Restore messaging?",
      "This reconnects you with this member so you can send messages again (used after an earlier block).",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restore",
          onPress: () =>
            void (async () => {
              try {
                setLoading(true);
                // Unblock is idempotent: also restores cancelled connection / match.
                await unblockMember(otherUserId);
                await refreshChatAccess();
              } catch (e: unknown) {
                appAlert("Error", e instanceof Error ? e.message : "Failed to restore messaging");
              } finally {
                setLoading(false);
              }
            })()
        }
      ]
    );
  };

  const openChatOptions = () => {
    appAlert("Chat options", undefined, [
      {
        text: threadMuted ? "Unmute notifications" : "Mute notifications",
        onPress: () =>
          void (async () => {
            try {
              const pref = await updateThreadPreference(otherUserId, { muted: !threadMuted });
              setThreadMuted(pref.muted);
            } catch (e: unknown) {
              appAlert("Error", e instanceof Error ? e.message : "Failed to update");
            }
          })()
      },
      {
        text: threadArchived ? "Unarchive chat" : "Archive chat",
        onPress: () =>
          void (async () => {
            try {
              const pref = await updateThreadPreference(otherUserId, {
                archived: !threadArchived
              });
              setThreadArchived(pref.archived);
              if (pref.archived) {
                appAlert("Archived", "This chat moved to Messages → Archived. You can unarchive it anytime.");
                navigation.goBack();
              } else {
                appAlert("Unarchived", "This chat is back in your Inbox.");
              }
            } catch (e: unknown) {
              appAlert("Error", e instanceof Error ? e.message : "Failed to update archive");
            }
          })()
      },
      {
        text: "Leave chat",
        style: "destructive",
        onPress: () =>
          appAlert("Leave chat?", "The conversation will be hidden from your inbox.", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Leave",
              style: "destructive",
              onPress: () =>
                void (async () => {
                  try {
                    await updateThreadPreference(otherUserId, { left: true });
                    navigation.goBack();
                  } catch (e: unknown) {
                    appAlert("Error", e instanceof Error ? e.message : "Failed to leave");
                  }
                })()
            }
          ])
      },
      {
        text: "Report member",
        onPress: () =>
          appAlert("Report member", "Why are you reporting this member?", [
            ...MEMBER_REPORT_REASONS.map((r) => ({
              text: r.label,
              onPress: () => void submitReport(r.code)
            })),
            { text: "Cancel", style: "cancel" }
          ])
      },
      isBlocked && blockedByMe
        ? { text: "Unblock member", onPress: confirmUnblock }
        : { text: "Block member", style: "destructive", onPress: confirmBlock },
      { text: "Cancel", style: "cancel" }
    ]);
  };

  // Memoized: a fresh object every render defeats memo() on the panel, which
  // cascades into re-rendering every message bubble on each keystroke.
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

  const backButton = (
    <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={8}>
      <Ionicons name="chevron-back" size={24} color={colors.text} />
    </Pressable>
  );

  const optionsButton = (
    <Pressable style={styles.backBtn} onPress={openChatOptions} hitSlop={8}>
      <Ionicons name="ellipsis-horizontal" size={22} color={colors.text} />
    </Pressable>
  );

  if (loading) {
    return (
      <View style={[styles.fill, { backgroundColor: colors.background }]}>
        <ChatHeader
          title={name}
          avatarUri={otherAvatarUri}
          left={backButton}
          right={optionsButton}
          backgroundColor={colors.surface}
          borderColor={colors.border}
          textColor={colors.text}
          textSecondary={colors.textSecondary}
          placeholderColor={colors.surfaceElevated}
        />
        <ChatMessagesSkeleton />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={[styles.fill, { backgroundColor: colors.background }]}>
        <ChatHeader
          title={name}
          avatarUri={otherAvatarUri}
          left={backButton}
          right={optionsButton}
          backgroundColor={colors.surface}
          borderColor={colors.border}
          textColor={colors.text}
          textSecondary={colors.textSecondary}
          placeholderColor={colors.surfaceElevated}
        />
        <View style={styles.centered}>
          <Ionicons
            name={blockedByMe ? "hand-left-outline" : "cloud-offline-outline"}
            size={44}
            color={colors.textSecondary}
          />
          <Text style={{ color: colors.text, fontWeight: "800", marginTop: spacing.md }}>
            {blockedByMe ? "Member blocked" : "Couldn’t load chat"}
          </Text>
          <Text style={{ color: colors.textSecondary, marginTop: spacing.sm, textAlign: "center" }}>
            {blockedByMe
              ? "You blocked this member. Unblock to message them again if messaging is allowed."
              : loadError}
          </Text>
          {blockedByMe ? (
            <Pressable
              style={{ marginTop: spacing.lg, padding: spacing.md }}
              onPress={confirmUnblock}
            >
              <Text style={{ color: colors.primary, fontWeight: "700" }}>Unblock member</Text>
            </Pressable>
          ) : (
            <Pressable
              style={{ marginTop: spacing.lg, padding: spacing.md }}
              onPress={() => {
                setLoading(true);
                void refreshChatAccess()
                  .catch((e: unknown) =>
                    setLoadError(e instanceof Error ? e.message : "Failed to load chat")
                  )
                  .finally(() => setLoading(false));
              }}
            >
              <Text style={{ color: colors.primary, fontWeight: "700" }}>Retry</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  const laneLabels =
    chatAccess?.chatLanes?.map((lane) => (lane === "matrimony" ? "Matrimony" : "Community")) ?? [];

  const chatLockBanner = (
    <>
      {threadArchived ? (
        <View style={[styles.lockBanner, { backgroundColor: colors.surfaceElevated }]}>
          <Ionicons name="archive-outline" size={16} color={colors.textSecondary} />
          <Text style={[styles.lockBannerText, { color: colors.textSecondary }]}>
            This chat is in your Archived folder. Open ⋮ → Unarchive to move it back to Inbox.
          </Text>
        </View>
      ) : null}
      {chatLockMessage ? (
        <View style={[styles.lockBanner, { backgroundColor: colors.surfaceElevated }]}>
          <Ionicons name="lock-closed-outline" size={16} color={colors.textSecondary} />
          <View style={{ flex: 1, gap: 6 }}>
            <Text style={[styles.lockBannerText, { color: colors.textSecondary }]}>
              {chatLockMessage}
            </Text>
            {canRestoreMessaging ? (
              <Pressable onPress={restoreMessaging} hitSlop={6}>
                <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}>
                  Restore messaging
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : laneLabels.length > 0 && !threadArchived ? (
        <View style={[styles.lockBanner, { backgroundColor: colors.surfaceElevated }]}>
          <Ionicons name="chatbubbles-outline" size={16} color={colors.primary} />
          <Text style={[styles.lockBannerText, { color: colors.textSecondary }]}>
            {laneLabels.length > 1
              ? `Community and matrimony chat — separate permissions.`
              : `${laneLabels[0]} chat`}
          </Text>
        </View>
      ) : null}
    </>
  );

  const lastSeenLabel = formatLastSeen(otherLastSeen);
  const presenceSubtitle = typing.peerTyping
    ? "Typing…"
    : otherOnline
      ? "Online"
      : lastSeenLabel
        ? `Last seen ${lastSeenLabel}`
        : " ";

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <ChatPanel
        title={name}
        subtitle={presenceSubtitle}
        messages={messages}
        meId={meId}
        sendError={sendError}
        input={chatLocked ? "" : input}
        sending={sending}
        onChangeText={chatLocked ? () => {} : onChangeText}
        onSend={chatLocked ? () => {} : send}
        listRef={listRef}
        bubbleMaxWidth={layout.bubbleMaxWidth}
        fontSize={layout.fontSize}
        horizontalPadding={layout.horizontalPadding}
        composerPaddingBottom={layout.composerPaddingBottom}
        chatKeyboardInset={layout.chatKeyboardInset}
        keyboardVisible={layout.keyboardVisible}
        otherAvatarUri={otherAvatarUri}
        headerAvatarUri={otherAvatarUri}
        colors={panelColors}
        headerLeft={backButton}
        headerRight={optionsButton}
        headerBanner={chatLockBanner}
        onSharedPostPress={handleSharedPostPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
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
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl
  },
  backBtn: {
    paddingRight: 8,
    paddingVertical: 4,
    marginRight: 4
  }
});
