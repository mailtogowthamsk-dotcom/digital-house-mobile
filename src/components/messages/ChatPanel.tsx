import React, { memo, useEffect, useMemo, useRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { ChatHeader } from "./ChatHeader";
import { ChatMessageList, type ChatMessageListHandle } from "./ChatMessageList";
import { ChatComposer } from "./ChatComposer";
import { ChatMessagesSkeleton } from "./ChatSkeleton";
import type { MessageItem } from "../../api/messages.api";

type Props = {
  title: string;
  subtitle: string;
  messages: MessageItem[];
  meId: number | null;
  loading?: boolean;
  error?: string | null;
  sendError?: string | null;
  input: string;
  sending: boolean;
  onChangeText: (t: string) => void;
  onSend: () => void;
  listRef?: React.RefObject<ChatMessageListHandle | null>;
  bubbleMaxWidth: number;
  fontSize: number;
  horizontalPadding: number;
  composerPaddingBottom: number;
  chatKeyboardInset?: number;
  keyboardVisible?: boolean;
  peerTyping?: boolean;
  otherAvatarUri?: string | null;
  headerAvatarUri?: string | null;
  colors: {
    background: string;
    surface: string;
    border: string;
    surfaceElevated: string;
    text: string;
    textSecondary: string;
    textMuted: string;
    primary: string;
    white: string;
    error: string;
  };
  headerLeft?: React.ReactNode;
  headerRight?: React.ReactNode;
  /** Renders inside the header, below the status bar (e.g. matrimony lock notice). */
  headerBanner?: React.ReactNode;
  /** Set to 0 when a parent SafeAreaView already applied the top inset (split inbox). */
  headerTopInset?: number;
  onSharedPostPress?: (postId: number) => void;
  onDeleteMessage?: (item: MessageItem) => void;
};

function ChatPanelComponent({
  title,
  subtitle,
  messages,
  meId,
  loading,
  error,
  sendError,
  input,
  sending,
  onChangeText,
  onSend,
  listRef: externalListRef,
  bubbleMaxWidth,
  fontSize,
  horizontalPadding,
  composerPaddingBottom,
  chatKeyboardInset = 0,
  keyboardVisible = false,
  peerTyping = false,
  otherAvatarUri,
  headerAvatarUri,
  colors,
  headerLeft,
  headerRight,
  headerBanner,
  headerTopInset,
  onSharedPostPress,
  onDeleteMessage
}: Props) {
  const internalRef = useRef<ChatMessageListHandle>(null);
  const listRef = externalListRef ?? internalRef;

  // A new object each render would invalidate renderItem and re-render every
  // bubble on each keystroke, defeating memo() on ChatMessageBubble.
  const bubbleColors = useMemo(
    () => ({
      primary: colors.primary,
      text: colors.text,
      surfaceElevated: colors.surfaceElevated,
      textMuted: colors.textMuted,
      white: colors.white
    }),
    [colors.primary, colors.text, colors.surfaceElevated, colors.textMuted, colors.white]
  );

  useEffect(() => {
    if (!keyboardVisible || loading || error) return;
    const t1 = requestAnimationFrame(() => {
      listRef.current?.scrollToBottom(true);
    });
    const t2 = setTimeout(() => listRef.current?.scrollToBottom(false), 120);
    return () => {
      cancelAnimationFrame(t1);
      clearTimeout(t2);
    };
  }, [keyboardVisible, chatKeyboardInset, loading, error, listRef]);

  const composer = !loading && !error ? (
    <View
      style={[
        styles.composerDock,
        chatKeyboardInset > 0 && { marginBottom: chatKeyboardInset }
      ]}
    >
      <ChatComposer
        value={input}
        onChangeText={onChangeText}
        onSend={onSend}
        sending={sending}
        paddingBottom={composerPaddingBottom}
        horizontalPadding={horizontalPadding}
        colors={{
          surface: colors.surface,
          border: colors.border,
          surfaceElevated: colors.surfaceElevated,
          text: colors.text,
          textMuted: colors.textMuted,
          primary: colors.primary,
          white: colors.white
        }}
      />
    </View>
  ) : null;

  const messageBody = loading ? (
    <ChatMessagesSkeleton />
  ) : error ? (
    <View style={styles.centered}>
      <Ionicons name="cloud-offline-outline" size={40} color={colors.textSecondary} />
      <Text style={[styles.errorTitle, { color: colors.text }]}>{error}</Text>
    </View>
  ) : (
    <ChatMessageList
      ref={listRef}
      messages={messages}
      meId={meId}
      bubbleMaxWidth={bubbleMaxWidth}
      fontSize={fontSize}
      horizontalPadding={horizontalPadding}
      otherAvatarUri={otherAvatarUri}
      colors={bubbleColors}
      keyboardVisible={keyboardVisible}
      peerTyping={peerTyping}
      onSharedPostPress={onSharedPostPress}
      onDeleteMessage={onDeleteMessage}
    />
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ChatHeader
        title={title}
        subtitle={subtitle}
        avatarUri={headerAvatarUri ?? otherAvatarUri}
        left={headerLeft}
        right={headerRight}
        banner={headerBanner}
        topInset={headerTopInset}
        backgroundColor={colors.surface}
        borderColor={colors.border}
        textColor={colors.text}
        textSecondary={colors.textSecondary}
        placeholderColor={colors.surfaceElevated}
        titleFontSize={fontSize + 2}
      />

      {sendError ? (
        <View style={[styles.banner, { backgroundColor: colors.surfaceElevated, borderBottomColor: colors.border }]}>
          <Text style={[styles.bannerText, { color: colors.error }]}>{sendError}</Text>
        </View>
      ) : null}

      <View style={styles.chatColumn}>
        <View style={styles.body}>{messageBody}</View>
        {composer}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    minWidth: 0
  },
  chatColumn: {
    flex: 1,
    minHeight: 0
  },
  composerDock: {
    flexGrow: 0,
    flexShrink: 0
  },
  banner: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexShrink: 0
  },
  bannerText: {
    fontSize: 13,
    textAlign: "center"
  },
  body: {
    flex: 1,
    minHeight: 0
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24
  },
  errorTitle: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center"
  }
});

export const ChatPanel = memo(ChatPanelComponent);
