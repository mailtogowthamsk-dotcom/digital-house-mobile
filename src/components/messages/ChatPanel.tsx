import React, { memo, useRef } from "react";
import { View, Text, StyleSheet, Image, Platform, KeyboardAvoidingView } from "react-native";
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
  keyboardVerticalOffset: number;
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
  keyboardVerticalOffset,
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

  const avatarUri = headerAvatarUri ?? otherAvatarUri;

  return (
    <KeyboardAvoidingView
      style={[styles.root, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
        {headerLeft}
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.headerAvatar} />
        ) : (
          <View style={[styles.headerAvatar, styles.headerAvatarPh, { backgroundColor: colors.surfaceElevated }]}>
            <Ionicons name="person" size={18} color={colors.textMuted} />
          </View>
        )}
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

      <View style={styles.body}>
        {loading ? (
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
        )}
      </View>

      {!loading && !error ? (
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
      ) : null}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    minHeight: 0,
    minWidth: 0,
    overflow: "hidden"
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
  headerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    flexShrink: 0
  },
  headerAvatarPh: {
    alignItems: "center",
    justifyContent: "center"
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
