import React, { useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { Shimmer } from "../ui/Shimmer";
import { useTheme } from "../../theme/ThemeContext";

export function FeedPostSkeleton() {
  const { colors } = useTheme();
  const s = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: colors.surface,
          borderRadius: 16,
          padding: 16,
          marginBottom: 14,
          overflow: "hidden"
        },
        row: { flexDirection: "row", alignItems: "center", marginBottom: 14, gap: 12 },
        block: { marginBottom: 10 }
      }),
    [colors]
  );

  return (
    <View style={s.card}>
      <View style={s.row}>
        <Shimmer width={44} height={44} borderRadius={22} />
        <View style={{ flex: 1, gap: 8 }}>
          <Shimmer width="55%" height={14} />
          <Shimmer width="35%" height={12} />
        </View>
      </View>
      <View style={s.block}>
        <Shimmer width="90%" height={16} />
      </View>
      <View style={s.block}>
        <Shimmer width="100%" height={12} />
        <Shimmer width="80%" height={12} style={{ marginTop: 8 }} />
      </View>
      <Shimmer width="100%" height={160} borderRadius={12} style={{ marginBottom: 12 }} />
      <Shimmer width="100%" height={44} borderRadius={10} />
    </View>
  );
}
