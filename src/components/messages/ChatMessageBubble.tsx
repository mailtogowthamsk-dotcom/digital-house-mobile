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
  showAvatar?: boolean;
  groupedTop?: boolean;
  groupedBottom?: boolean;
  onSharedPostPress?: (postId: number) => void;
};

const RADIUS = 14;
const TAIL = 5;

function ChatMessageBubbleComponent({
  item,
  mine,
  maxWidth,
  fontSize,
  colors,
  otherAvatarUri,
  showAvatar = true,
  groupedTop = false,
  groupedBottom = false,
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
  const showBody = Boolean(showNote || (!sharedPostId && item.body?.trim()));

  const tick = mine
    ? item.readAt || item.deliveredAt
      ? "checkmark-done"
      : item.id > 0
        ? "checkmark"
        : "time-outline"
    : null;
  const tickColor = item.readAt ? "#53BDEB" : "rgba(255,255,255,0.72)";

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

  const corners = mine
    ? {
        borderTopLeftRadius: RADIUS,
        borderTopRightRadius: groupedTop ? 6 : RADIUS,
        borderBottomLeftRadius: RADIUS,
        borderBottomRightRadius: groupedBottom ? 6 : TAIL
      }
    : {
        borderTopRightRadius: RADIUS,
        borderTopLeftRadius: groupedTop ? 6 : RADIUS,
        borderBottomRightRadius: RADIUS,
        borderBottomLeftRadius: groupedBottom ? 6 : TAIL
      };

  const meta = (
    <View style={styles.meta}>
      <Text style={[styles.time, mine ? styles.timeMe : { color: colors.textMuted }]}>{time}</Text>
      {mine && tick ? <Ionicons name={tick as any} size={13} color={tickColor} /> : null}
    </View>
  );

  return (
    <View
      style={[
        styles.row,
        mine ? styles.rowMe : styles.rowOther,
        groupedBottom ? styles.rowTight : styles.rowGap
      ]}
    >
      {!mine ? (
        <View style={styles.avatarCol}>
          {showAvatar ? (
            otherAvatarUri ? (
              <Image
                source={{ uri: otherAvatarUri }}
                style={styles.avatar}
                contentFit="cover"
                cachePolicy="memory-disk"
                recyclingKey={otherAvatarUri}
              />
            ) : (
              <View
                style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.surfaceElevated }]}
              >
                <Ionicons name="person" size={13} color={colors.textMuted} />
              </View>
            )
          ) : null}
        </View>
      ) : null}

      <View
        style={[
          styles.bubble,
          corners,
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
                borderColor: mine ? "rgba(255,255,255,0.2)" : "rgba(15,23,42,0.08)"
              },
              pressed && styles.pressed
            ]}
          >
            <View style={styles.sharedCardHeader}>
              <Ionicons
                name="document-text-outline"
                size={14}
                color={mine ? "#fff" : colors.primary}
              />
              <Text style={[styles.sharedCardTitle, { color: mine ? "#fff" : colors.text }]}>
                Shared post
              </Text>
            </View>
            <Text
              style={[
                styles.sharedCardHint,
                { color: mine ? "rgba(255,255,255,0.78)" : colors.textMuted }
              ]}
            >
              Tap to open
            </Text>
          </Pressable>
        ) : null}

        {showBody ? (
          <Pressable onLongPress={onLongPress} delayLongPress={400}>
            <View style={styles.inlineRow}>
              <Text
                style={[
                  styles.body,
                  { fontSize, lineHeight: fontSize + 4 },
                  mine ? styles.textMe : { color: colors.text }
                ]}
              >
                {item.body}
              </Text>
              {meta}
            </View>
          </Pressable>
        ) : (
          <View style={styles.metaOnly}>{meta}</View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    width: "100%",
    alignItems: "flex-end"
  },
  rowMe: { justifyContent: "flex-end" },
  rowOther: { justifyContent: "flex-start" },
  rowTight: { marginBottom: 2 },
  rowGap: { marginBottom: 8 },
  avatarCol: {
    width: 26,
    marginRight: 6,
    flexShrink: 0
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13
  },
  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center"
  },
  bubble: {
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 5,
    maxWidth: "100%"
  },
  bubbleMe: { alignSelf: "flex-end" },
  bubbleOther: { alignSelf: "flex-start" },
  pressed: { opacity: 0.92 },
  sharedCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginBottom: 4
  },
  sharedCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5
  },
  sharedCardTitle: {
    fontSize: 13,
    fontWeight: "700"
  },
  sharedCardHint: {
    fontSize: 11,
    marginTop: 2
  },
  inlineRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "flex-end",
    maxWidth: "100%"
  },
  body: {
    flexGrow: 0,
    flexShrink: 1
  },
  textMe: { color: "#fff" },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginLeft: 8,
    marginBottom: 0,
    gap: 3,
    alignSelf: "flex-end"
  },
  metaOnly: {
    alignSelf: "flex-end"
  },
  time: { fontSize: 10, lineHeight: 13 },
  timeMe: { color: "rgba(255,255,255,0.78)" }
});

export const ChatMessageBubble = memo(ChatMessageBubbleComponent);
