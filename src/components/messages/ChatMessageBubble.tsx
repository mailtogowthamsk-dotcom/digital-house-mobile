import React, { memo, useCallback } from "react";
import { View, Text, StyleSheet, Image, Pressable, Platform } from "react-native";
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
};

function ChatMessageBubbleComponent({
  item,
  mine,
  maxWidth,
  fontSize,
  colors,
  otherAvatarUri
}: Props) {
  const time = new Date(item.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
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

  return (
    <View style={[styles.row, mine ? styles.rowMe : styles.rowOther]}>
      {!mine ? (
        <View style={styles.avatarCol}>
          {otherAvatarUri ? (
            <Image source={{ uri: otherAvatarUri }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.surfaceElevated }]}>
              <Ionicons name="person" size={16} color={colors.textMuted} />
            </View>
          )}
        </View>
      ) : null}

      <Pressable
        onLongPress={onLongPress}
        delayLongPress={400}
        style={({ pressed }) => [
          styles.bubble,
          { maxWidth },
          mine ? styles.bubbleMe : styles.bubbleOther,
          mine
            ? { backgroundColor: colors.primary }
            : { backgroundColor: colors.surfaceElevated },
          pressed && styles.pressed
        ]}
      >
        <Text
          style={[
            styles.body,
            { fontSize, lineHeight: fontSize + 6 },
            mine ? styles.textMe : { color: colors.text }
          ]}
        >
          {item.body}
        </Text>
        <View style={styles.meta}>
          <Text style={[styles.time, mine ? styles.timeMe : { color: colors.textMuted }]}>
            {time}
          </Text>
          {mine && tick ? <Ionicons name={tick as any} size={14} color={tickColor} /> : null}
        </View>
      </Pressable>
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
  body: { flexShrink: 1 },
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
