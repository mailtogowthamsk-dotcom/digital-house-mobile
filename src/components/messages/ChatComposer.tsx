import React, { memo, useState } from "react";
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { textFieldCompactPad } from "../../theme/textField";

const MIN_INPUT_HEIGHT = 44;
const MAX_INPUT_HEIGHT = 120;
const SEND_SIZE = 44;

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  sending: boolean;
  paddingBottom: number;
  horizontalPadding: number;
  hasAttachment?: boolean;
  placeholder?: string;
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
  hasAttachment = false,
  placeholder = "Message",
  colors
}: Props) {
  const [focused, setFocused] = useState(false);
  const canSend = (value.trim().length > 0 || hasAttachment) && !sending;

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
              borderColor: focused ? colors.primary : colors.border
            }
          ]}
          value={value}
          accessibilityLabel="Message"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChangeText={onChangeText}
          placeholder={placeholder}
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
          style={({ pressed }) => [
            styles.sendBtn,
            { backgroundColor: canSend || sending ? "#163E31" : colors.surfaceElevated },
            pressed && styles.sendPressed
          ]}
          onPress={onSend}
          disabled={!canSend}
          accessibilityRole="button"
          accessibilityLabel="Send message"
          accessibilityState={{ disabled: !canSend, busy: sending }}
        >
          {sending ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Ionicons name="send-outline" size={18} color={canSend ? "#FFFFFF" : colors.textMuted} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
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
    borderRadius: 15,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    ...textFieldCompactPad,
    paddingTop: 8,
    paddingBottom: 8,
    fontSize: 14,
    ...(Platform.OS === "android" ? { textAlignVertical: "top" } : {})
  },
  sendBtn: {
    width: SEND_SIZE,
    height: SEND_SIZE,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  },
  sendPressed: { opacity: 0.78 }
});

export const ChatComposer = memo(ChatComposerComponent);
