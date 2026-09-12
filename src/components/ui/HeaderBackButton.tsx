import React, { memo } from "react";
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";

type Props = {
  onPress: () => void;
  /** Override icon color (defaults to theme text). */
  color?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Shared top-left back control — same look on Menu, Messages, Profile, Settings, etc.
 */
function HeaderBackButtonInner({
  onPress,
  color,
  accessibilityLabel = "Go back",
  style
}: Props) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: colors.surfaceElevated },
        pressed && styles.pressed,
        style
      ]}
    >
      <Ionicons name="chevron-back" size={22} color={color ?? colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center"
  },
  pressed: { opacity: 0.7 }
});

export const HeaderBackButton = memo(HeaderBackButtonInner);
