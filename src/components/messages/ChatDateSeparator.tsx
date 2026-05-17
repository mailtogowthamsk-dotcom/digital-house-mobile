import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";

type Props = {
  label: string;
  textColor: string;
  pillColor: string;
};

function ChatDateSeparatorComponent({ label, textColor, pillColor }: Props) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.pill, { backgroundColor: pillColor }]}>
        <Text style={[styles.text, { color: textColor }]}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    marginVertical: 12
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12
  },
  text: {
    fontSize: 12,
    fontWeight: "700"
  }
});

export const ChatDateSeparator = memo(ChatDateSeparatorComponent);
