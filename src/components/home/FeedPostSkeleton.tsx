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
          marginBottom: 1,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
          overflow: "hidden"
        },
        row: {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingTop: 12,
          marginBottom: 12,
          gap: 12
        },
        body: { paddingHorizontal: 16, marginBottom: 14, gap: 10 },
        actionBar: {
          flexDirection: "row",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          gap: 16
        }
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
      <View style={s.body}>
        <Shimmer width="90%" height={16} />
        <Shimmer width="100%" height={12} />
        <Shimmer width="80%" height={12} />
      </View>
      <Shimmer width="100%" height={200} borderRadius={0} />
      <View style={s.actionBar}>
        <Shimmer width={56} height={22} borderRadius={6} />
        <Shimmer width={56} height={22} borderRadius={6} />
        <Shimmer width={28} height={22} borderRadius={6} />
        <Shimmer width={28} height={22} borderRadius={6} />
      </View>
    </View>
  );
}
