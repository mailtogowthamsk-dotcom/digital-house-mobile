import React, { memo } from "react";
import { Pressable, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

type Props = {
  visible: boolean;
  onPress: () => void;
  primaryColor: string;
  iconColor: string;
};

function ChatScrollFabComponent({ visible, onPress, primaryColor, iconColor }: Props) {
  if (!visible) return null;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.fab,
        { backgroundColor: primaryColor, opacity: pressed ? 0.88 : 1 }
      ]}
      accessibilityRole="button"
      accessibilityLabel="Scroll to latest messages"
    >
      <Ionicons name="chevron-down" size={22} color={iconColor} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 16,
    bottom: 12,
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4
  }
});

export const ChatScrollFab = memo(ChatScrollFabComponent);
