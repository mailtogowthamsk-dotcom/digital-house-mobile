import React, { useCallback, useEffect, useRef, useState } from "react";
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
import { getHistory, markRead, sendMessage, type MessageItem } from "../../api/messages.api";
import { getSocket } from "../../realtime/socket";
import { useChatSocket } from "../../hooks/useChatSocket";
import { useChatLayout } from "../../hooks/useChatLayout";
import { ChatPanel } from "../../components/messages/ChatPanel";
import { getMatrimonyChatAccess } from "../../api/matrimony.api";
import type { ChatMessageListHandle } from "../../components/messages/ChatMessageList";

type ChatParams = { otherUserId: number; name: string; profileImage?: string | null };

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
  const [otherTyping, setOtherTyping] = useState(false);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingClientIdsRef = useRef<Set<string>>(new Set());
  const [matrimonyChatLock, setMatrimonyChatLock] = useState<string | null>(null);

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
    setMessages(hist.messages);
  }, [otherUserId]);

  useEffect(() => {
    navigation.setOptions?.({ title: name });
  }, [navigation, name]);

  useEffect(() => {
    void getMatrimonyChatAccess(otherUserId)
      .then((access) => {
        if (access.matrimonyGateApplies && !access.allowed) {
          setMatrimonyChatLock(access.message ?? "Chat available after mutual match.");
        } else {
          setMatrimonyChatLock(null);
        }
      })
      .catch(() => setMatrimonyChatLock(null));
  }, [otherUserId]);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        await loadInitial();
        listRef.current?.scrollToBottom(false);
      } catch (e: unknown) {
        setLoadError(e instanceof Error ? e.message : "Failed to load chat");
      } finally {
        setLoading(false);
      }
    })();
  }, [loadInitial]);

  const emitTyping = useCallback(async (typing: boolean) => {
    try {
      const sock = await getSocket();
      sock.emit("typing", { toUserId: otherUserId, typing });
    } catch {
      // offline
    }
  }, [otherUserId]);

  const onChangeText = useCallback(
    (t: string) => {
      setInput(t);
      setSendError(null);
      emitTyping(t.trim().length > 0).catch(() => {});
    },
    [emitTyping]
  );

  const markReadNow = useCallback(async () => {
    await markRead(otherUserId).catch(() => {});
    try {
      const sock = await getSocket();
      sock.emit("message:read", { withUserId: otherUserId });
    } catch {
      // REST applied
    }
  }, [otherUserId]);

  useEffect(() => {
    if (!isFocused) return;
    markReadNow().catch(() => {});
  }, [isFocused, markReadNow]);

  const markReadNowRef = useRef(markReadNow);
  markReadNowRef.current = markReadNow;

  useChatSocket(otherUserId, isFocused, {
    onMessage: mergeIncomingMessage,
    onDelivered: ({ messageId, deliveredAt }) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, deliveredAt } : m))
      );
    },
    onRead: ({ readAt }) => {
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
    onIncomingFromOther: (m, sock) => {
      sock.emit("message:delivered", { messageId: m.id });
      markReadNowRef.current().catch(() => {});
    }
  });

  const send = useCallback(async () => {
    const body = input.trim();
    if (!body || !meId || sending) return;
    setSending(true);
    setSendError(null);
    setInput("");
    emitTyping(false).catch(() => {});

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
          { recipientId: otherUserId, body, clientId },
          (resp: { ok?: boolean; error?: string }) => {
            clearTimeout(timer);
            if (resp?.ok) resolve();
            else reject(new Error(resp?.error || "Failed to send"));
          }
        );
      });
    } catch {
      try {
        const saved = await sendMessage(otherUserId, body, clientId);
        pendingClientIdsRef.current.delete(clientId);
        setMessages((prev) => prev.map((x) => (x.clientId === clientId ? saved : x)));
        listRef.current?.scrollToBottom(true);
      } catch {
        removeOptimistic();
        setInput(body);
        setSendError("Could not send message. Check your connection and try again.");
      }
    } finally {
      setSending(false);
    }
  }, [emitTyping, input, meId, otherUserId, sending]);

  const panelColors = {
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
  };

  const backButton = (
    <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={8}>
      <Ionicons name="chevron-back" size={24} color={colors.text} />
    </Pressable>
  );

  if (loading) {
    return (
      <View style={[styles.fill, { backgroundColor: colors.background }]}>
        <ChatHeader
          title={name}
          avatarUri={otherAvatarUri}
          left={backButton}
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
          backgroundColor={colors.surface}
          borderColor={colors.border}
          textColor={colors.text}
          textSecondary={colors.textSecondary}
          placeholderColor={colors.surfaceElevated}
        />
        <View style={styles.centered}>
          <Ionicons name="cloud-offline-outline" size={44} color={colors.textSecondary} />
          <Text style={{ color: colors.text, fontWeight: "800", marginTop: spacing.md }}>Couldn’t load chat</Text>
          <Text style={{ color: colors.textSecondary, marginTop: spacing.sm, textAlign: "center" }}>{loadError}</Text>
          <Pressable
            style={{ marginTop: spacing.lg, padding: spacing.md }}
            onPress={() => {
              setLoading(true);
              loadInitial()
                .catch((e: unknown) =>
                  setLoadError(e instanceof Error ? e.message : "Failed to load chat")
                )
                .finally(() => setLoading(false));
            }}
          >
            <Text style={{ color: colors.primary, fontWeight: "700" }}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const matrimonyLockBanner = matrimonyChatLock ? (
    <View style={[styles.lockBanner, { backgroundColor: colors.surfaceElevated }]}>
      <Ionicons name="lock-closed-outline" size={16} color={colors.textSecondary} />
      <Text style={[styles.lockBannerText, { color: colors.textSecondary }]}>{matrimonyChatLock}</Text>
    </View>
  ) : undefined;

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      <ChatPanel
        title={name}
        subtitle={otherTyping ? "Typing…" : " "}
        messages={messages}
        meId={meId}
        sendError={sendError}
        input={matrimonyChatLock ? "" : input}
        sending={sending}
        onChangeText={matrimonyChatLock ? () => {} : onChangeText}
        onSend={matrimonyChatLock ? () => {} : send}
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
        headerBanner={matrimonyLockBanner}
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
