import React from "react";
import { View, Text, StyleSheet } from "react-native";

export function MatrimonyChip({ label }: { label: string }) {
  return (
    <View style={styles.chip}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

export function MatrimonyChipRow({ labels }: { labels: string[] }) {
  if (!labels.length) return null;
  return (
    <View style={styles.row}>
      {labels.map((l) => (
        <MatrimonyChip key={l} label={l} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", flexWrap: "wrap", marginTop: 6 },
  chip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    marginRight: 4,
    marginBottom: 4,
    backgroundColor: "#EFF6FF"
  },
  text: { fontSize: 10, fontWeight: "600", color: "#1D4ED8" }
});
