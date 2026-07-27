import React, { memo, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { Image } from "expo-image";
import Ionicons from "@expo/vector-icons/Ionicons";
import * as Clipboard from "expo-clipboard";
import type { MessageItem } from "../../api/messages.api";
import { hapticCopyMessage } from "../../utils/chatHaptics";
import { appAlert } from "../../utils/appAlert";

type ThemeColors = {
  primary: string;
  text: string;
  surfaceElevated: string;
  textMuted: string;
  white: string;
};

type Props = {
  item: MessageItem;
  mine: boolean;
  maxWidth: number;
  fontSize: number;
  colors: ThemeColors;
  otherAvatarUri?: string | null;
  onSharedPostPress?: (postId: number) => void;
};

function ChatMessageBubbleComponent({
  item,
  mine,
  maxWidth,
  fontSize,
  colors,
  otherAvatarUri,
  onSharedPostPress
}: Props) {
  const time = new Date(item.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
  const sharedPostId = item.sharedPostId != null ? Number(item.sharedPostId) : null;
  const showNote =
    sharedPostId != null &&
    item.body.trim() &&
    item.body.trim() !== "Shared a post with you";

  // WhatsApp-like lifecycle: sending → sent (✓) → delivered (✓✓ grey) → read (✓✓ blue)
  const tick = mine
    ? item.readAt || item.deliveredAt
      ? "checkmark-done"
      : item.id > 0
        ? "checkmark"
        : "time-outline"
    : null;
  const tickColor = item.readAt ? "#53BDEB" : "rgba(255,255,255,0.85)";

  const onLongPress = useCallback(() => {
    if (!item.body?.trim()) return;
    const copy = async () => {
      await Clipboard.setStringAsync(item.body);
      await hapticCopyMessage();
    };
    if (Platform.OS === "web") {
      copy().catch(() => {});
      return;
    }
    appAlert("Message", undefined, [
      { text: "Copy text", onPress: () => copy().catch(() => {}) },
      { text: "Cancel", style: "cancel" }
    ]);
  }, [item.body]);

  const onOpenSharedPost = useCallback(() => {
    if (sharedPostId) onSharedPostPress?.(sharedPostId);
  }, [onSharedPostPress, sharedPostId]);

  return (
    <View style={[styles.row, mine ? styles.rowMe : styles.rowOther]}>
      {!mine ? (
        <View style={styles.avatarCol}>
          {otherAvatarUri ? (
            <Image
              source={{ uri: otherAvatarUri }}
              style={styles.avatar}
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey={otherAvatarUri}
            />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.surfaceElevated }]}>
              <Ionicons name="person" size={16} color={colors.textMuted} />
            </View>
          )}
        </View>
      ) : null}

      <View
        style={[
          styles.bubble,
          { maxWidth },
          mine ? styles.bubbleMe : styles.bubbleOther,
          mine
            ? { backgroundColor: colors.primary }
            : { backgroundColor: colors.surfaceElevated }
        ]}
      >
        {sharedPostId ? (
          <Pressable
            onPress={onOpenSharedPost}
            onLongPress={onLongPress}
            delayLongPress={400}
            style={({ pressed }) => [
              styles.sharedCard,
              {
                backgroundColor: mine ? "rgba(255,255,255,0.14)" : "rgba(15,23,42,0.06)",
                borderColor: mine ? "rgba(255,255,255,0.22)" : "rgba(15,23,42,0.08)"
              },
              pressed && styles.pressed
            ]}
          >
            <View style={styles.sharedCardHeader}>
              <Ionicons
                name="document-text-outline"
                size={16}
                color={mine ? "#fff" : colors.primary}
              />
              <Text
                style={[
                  styles.sharedCardTitle,
                  { color: mine ? "#fff" : colors.text }
                ]}
              >
                Shared post
              </Text>
            </View>
            <Text
              style={[
                styles.sharedCardHint,
                { color: mine ? "rgba(255,255,255,0.88)" : colors.textMuted }
              ]}
            >
              Tap to view the original post
            </Text>
          </Pressable>
        ) : null}

        {showNote || (!sharedPostId && item.body?.trim()) ? (
          <Pressable onLongPress={onLongPress} delayLongPress={400}>
            <Text
              style={[
                styles.body,
                { fontSize, lineHeight: fontSize + 6 },
                sharedPostId ? styles.bodyWithCard : undefined,
                mine ? styles.textMe : { color: colors.text }
              ]}
            >
              {item.body}
            </Text>
          </Pressable>
        ) : null}

        <View style={styles.meta}>
          <Text style={[styles.time, mine ? styles.timeMe : { color: colors.textMuted }]}>
            {time}
          </Text>
          {mine && tick ? <Ionicons name={tick as any} size={14} color={tickColor} /> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    marginBottom: 8,
    width: "100%",
    alignItems: "flex-end"
  },
  rowMe: { justifyContent: "flex-end" },
  rowOther: { justifyContent: "flex-start" },
  avatarCol: {
    width: 32,
    marginRight: 6,
    flexShrink: 0
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16
  },
  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center"
  },
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 16,
    maxWidth: "100%"
  },
  bubbleMe: { alignSelf: "flex-end" },
  bubbleOther: { alignSelf: "flex-start" },
  pressed: { opacity: 0.92 },
  sharedCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 6
  },
  sharedCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
  sharedCardTitle: {
    fontSize: 14,
    fontWeight: "700"
  },
  sharedCardHint: {
    fontSize: 12,
    marginTop: 4
  },
  body: { flexShrink: 1 },
  bodyWithCard: { marginTop: 2 },
  textMe: { color: "#fff" },
  meta: {
    marginTop: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4
  },
  time: { fontSize: 11 },
  timeMe: { color: "rgba(255,255,255,0.85)" }
});

export const ChatMessageBubble = memo(ChatMessageBubbleComponent);
