import React, { memo, useRef } from "react";
import { View, Text, StyleSheet } from "react-native";
import { AvatarImage } from "../ui/AvatarImage";
import Ionicons from "@expo/vector-icons/Ionicons";
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
  otherAvatarUri,
  headerAvatarUri,
  colors,
  headerLeft
}: Props) {
  const internalRef = useRef<ChatMessageListHandle>(null);
  const listRef = externalListRef ?? internalRef;

  const bubbleColors = {
    primary: colors.primary,
    text: colors.text,
    surfaceElevated: colors.surfaceElevated,
    textMuted: colors.textMuted,
    white: colors.white
  };

  const composer = !loading && !error ? (
    <View style={styles.composerDock}>
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
    />
  );

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {headerLeft}
        <AvatarImage
          uri={headerAvatarUri ?? otherAvatarUri}
          name={title}
          size={40}
          placeholderColor={colors.surfaceElevated}
          textColor={colors.textMuted}
        />
        <View style={styles.headerText}>
          <Text style={[styles.title, { color: colors.text, fontSize: fontSize + 2 }]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
            {subtitle || " "}
          </Text>
        </View>
      </View>

      {sendError ? (
        <View style={[styles.banner, { backgroundColor: colors.surfaceElevated, borderBottomColor: colors.border }]}>
          <Text style={[styles.bannerText, { color: colors.error }]}>{sendError}</Text>
        </View>
      ) : null}

      <View style={[styles.chatColumn, chatKeyboardInset > 0 && { marginBottom: chatKeyboardInset }]}>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexShrink: 0,
    gap: 10
  },
  headerText: {
    flex: 1,
    minWidth: 0
  },
  title: {
    fontWeight: "800"
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12
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
