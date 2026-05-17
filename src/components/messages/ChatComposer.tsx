import React, { memo } from "react";
import { View, TextInput, Pressable, StyleSheet, ActivityIndicator, Platform } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  sending: boolean;
  paddingBottom: number;
  horizontalPadding: number;
  colors: {
    surface: string;
    border: string;
    surfaceElevated: string;
    text: string;
    textMuted: string;
    primary: string;
    white: string;
  };
};

function ChatComposerComponent({
  value,
  onChangeText,
  onSend,
  sending,
  paddingBottom,
  horizontalPadding,
  colors
}: Props) {
  const canSend = value.trim().length > 0 && !sending;

  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          paddingBottom: paddingBottom + 8,
          paddingHorizontal: horizontalPadding
        }
      ]}
    >
      <View style={styles.row}>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.surfaceElevated,
              color: colors.text
            }
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder="Message"
          placeholderTextColor={colors.textMuted}
          multiline
          maxLength={5000}
          textAlignVertical="center"
          {...(Platform.OS === "web" ? ({ outlineStyle: "none" } as object) : {})}
        />
        <Pressable
          style={[
            styles.sendBtn,
            { backgroundColor: colors.primary },
            !canSend && styles.sendDisabled
          ]}
          onPress={onSend}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel="Send message"
        >
          {sending ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Ionicons name="send" size={18} color={colors.white} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    flexShrink: 0
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
    maxWidth: "100%"
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: Platform.OS === "ios" ? 12 : 10,
    fontSize: 15
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },
  sendDisabled: { opacity: 0.55 }
});

export const ChatComposer = memo(ChatComposerComponent);
