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
    marginVertical: 8
  },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 10
  },
  text: {
    fontSize: 11,
    fontWeight: "600"
  }
});

export const ChatDateSeparator = memo(ChatDateSeparatorComponent);
