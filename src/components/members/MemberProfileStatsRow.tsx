import React, { memo, useEffect, useMemo, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { spacing } from "../../theme/spacing";

function formatCompact(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) {
    const v = n / 1000;
    return `${v >= 10 ? Math.round(v) : v.toFixed(1).replace(/\.0$/, "")}K`;
  }
  const v = n / 1_000_000;
  return `${v >= 10 ? Math.round(v) : v.toFixed(1).replace(/\.0$/, "")}M`;
}

type StatItemProps = {
  label: string;
  value: number;
};

const StatItem = memo(function StatItem({ label, value }: StatItemProps) {
  const { colors } = useTheme();
  const anim = useRef(new Animated.Value(0)).current;
  const [display, setDisplay] = React.useState(0);

  useEffect(() => {
    anim.stopAnimation();
    anim.setValue(0);
    const id = anim.addListener(({ value: v }) => setDisplay(Math.round(v)));
    Animated.timing(anim, {
      toValue: value,
      duration: 520,
      useNativeDriver: false
    }).start();
    return () => {
      anim.removeListener(id);
    };
  }, [value, anim]);

  return (
    <View style={styles.stat}>
      <Text style={[styles.value, { color: colors.text }]}>{formatCompact(display)}</Text>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
});

type Props = {
  postsCount: number;
  connectionsCount: number;
  likesReceivedCount: number;
};

function MemberProfileStatsRowInner({
  postsCount,
  connectionsCount,
  likesReceivedCount
}: Props) {
  const { colors, mode } = useTheme();
  const s = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          flexDirection: "row",
          marginTop: spacing.lg,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          paddingTop: spacing.md
        }
      }),
    [colors]
  );

  return (
    <View style={s.wrap}>
      <StatItem label="Posts" value={postsCount} />
      <View style={[styles.divider, { backgroundColor: mode === "dark" ? "#334155" : "#E2E8F0" }]} />
      <StatItem label="Connections" value={connectionsCount} />
      <View style={[styles.divider, { backgroundColor: mode === "dark" ? "#334155" : "#E2E8F0" }]} />
      <StatItem label="Likes" value={likesReceivedCount} />
    </View>
  );
}

export const MemberProfileStatsRow = memo(MemberProfileStatsRowInner);

const styles = StyleSheet.create({
  stat: { flex: 1, alignItems: "center", gap: 2 },
  value: { fontSize: 18, fontWeight: "800" },
  label: { fontSize: 12, fontWeight: "600" },
  divider: { width: StyleSheet.hairlineWidth, alignSelf: "stretch", marginVertical: 4 }
});
