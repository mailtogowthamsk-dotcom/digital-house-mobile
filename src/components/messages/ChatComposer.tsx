import React, { memo } from "react";
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

const MIN_INPUT_HEIGHT = 44;
const MAX_INPUT_HEIGHT = 120;
const SEND_SIZE = 40;

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
          paddingBottom,
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
              color: colors.text,
              borderColor: colors.border
            }
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder="Message"
          placeholderTextColor={colors.textMuted}
          multiline
          blurOnSubmit={false}
          maxLength={5000}
          selectionColor={colors.primary}
          cursorColor={colors.primary}
          underlineColorAndroid="transparent"
          allowFontScaling
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
            <Ionicons name="send" size={17} color={colors.white} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
    flexShrink: 0,
    flexGrow: 0
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8
  },
  input: {
    flex: 1,
    minWidth: 0,
    minHeight: MIN_INPUT_HEIGHT,
    maxHeight: MAX_INPUT_HEIGHT,
    borderRadius: 22,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 12 : 10,
    paddingBottom: Platform.OS === "ios" ? 12 : 10,
    fontSize: 16,
    ...(Platform.OS === "android" ? { includeFontPadding: false, textAlignVertical: "top" } : {})
  },
  sendBtn: {
    width: SEND_SIZE,
    height: SEND_SIZE,
    borderRadius: SEND_SIZE / 2,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginBottom: 2
  },
  sendDisabled: { opacity: 0.45 }
});

export const ChatComposer = memo(ChatComposerComponent);
