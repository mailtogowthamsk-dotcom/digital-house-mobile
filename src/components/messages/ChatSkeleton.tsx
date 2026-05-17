import React, { memo, useMemo } from "react";
import { View, StyleSheet } from "react-native";
import { SkeletonCard } from "../home/SkeletonCard";
import { useTheme } from "../../theme/ThemeContext";

/** Skeleton rows for thread list while loading */
export const ThreadListSkeleton = memo(function ThreadListSkeleton({ count = 8 }: { count?: number }) {
  const { colors } = useTheme();
  const s = useMemo(
    () =>
      StyleSheet.create({
        row: {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          gap: 12,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border
        },
        lines: { flex: 1, gap: 8 }
      }),
    [colors.border]
  );

  return (
    <View>
      {Array.from({ length: count }).map((_, i) => (
        <View key={i} style={s.row}>
          <SkeletonCard width={44} height={44} style={{ borderRadius: 22 }} />
          <View style={s.lines}>
            <SkeletonCard width="55%" height={14} />
            <SkeletonCard width="80%" height={12} />
          </View>
        </View>
      ))}
    </View>
  );
});

/** Skeleton bubbles while chat history loads */
export const ChatMessagesSkeleton = memo(function ChatMessagesSkeleton() {
  const s = useMemo(
    () =>
      StyleSheet.create({
        wrap: { flex: 1, padding: 16, gap: 12, justifyContent: "flex-end" },
        row: { flexDirection: "row", gap: 8, alignItems: "flex-end" },
        rowMe: { justifyContent: "flex-end" }
      }),
    []
  );

  const widths = ["62%", "48%", "70%", "40%", "55%"] as const;

  return (
    <View style={s.wrap}>
      {widths.map((w, i) => {
        const mine = i % 2 === 1;
        return (
          <View key={i} style={[s.row, mine && s.rowMe]}>
            {!mine ? <SkeletonCard width={32} height={32} style={{ borderRadius: 16 }} /> : null}
            <SkeletonCard width={w} height={mine ? 44 : 40} style={{ borderRadius: 16 }} />
          </View>
        );
      })}
    </View>
  );
});
