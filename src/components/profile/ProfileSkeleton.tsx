import React, { useEffect, useRef, useMemo } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";

function SkeletonBox({
  width,
  height,
  style,
  boxStyle
}: {
  width?: number | string;
  height: number;
  style?: object;
  boxStyle: object;
}) {
  const opacity = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.8, useNativeDriver: true, duration: 600 }),
        Animated.timing(opacity, { toValue: 0.4, useNativeDriver: true, duration: 600 })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);
  return (
    <Animated.View
      style={[boxStyle, { width: width ?? "100%", height, opacity }, style]}
    />
  );
}

export function ProfileSkeleton() {
  const { colors } = useTheme();
  const s = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, paddingHorizontal: spacing.xl },
        box: { backgroundColor: colors.border, borderRadius: radius.sm },
        headerCard: {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          padding: spacing.xxl,
          alignItems: "center",
          marginBottom: spacing.xl,
          borderWidth: 1,
          borderColor: colors.border
        },
        avatar: { borderRadius: 48, marginBottom: spacing.lg },
        line: { marginBottom: spacing.md },
        section: { marginBottom: spacing.xl },
        sectionTitle: { marginBottom: spacing.md },
        card: {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          padding: spacing.lg,
          borderWidth: 1,
          borderColor: colors.border
        },
        row: { marginBottom: spacing.md },
        statsRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
        statCard: { borderRadius: radius.md },
        tabRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
        btn: { borderRadius: radius.md, marginBottom: spacing.sm }
      }),
    [colors]
  );

  return (
    <View style={s.container}>
      <View style={s.headerCard}>
        <SkeletonBox width={96} height={96} style={s.avatar} boxStyle={s.box} />
        <SkeletonBox width="60%" height={24} style={s.line} boxStyle={s.box} />
        <SkeletonBox width="40%" height={16} style={s.line} boxStyle={s.box} />
      </View>
      <View style={s.section}>
        <SkeletonBox width={140} height={18} style={s.sectionTitle} boxStyle={s.box} />
        <View style={s.card}>
          {[1, 2, 3, 4, 5].map((i) => (
            <SkeletonBox key={i} width="100%" height={20} style={s.row} boxStyle={s.box} />
          ))}
        </View>
      </View>
      <View style={s.section}>
        <SkeletonBox width={160} height={18} style={s.sectionTitle} boxStyle={s.box} />
        <View style={s.card}>
          {[1, 2, 3, 4].map((i) => (
            <SkeletonBox key={i} width="100%" height={20} style={s.row} boxStyle={s.box} />
          ))}
        </View>
      </View>
      <View style={s.section}>
        <SkeletonBox width={120} height={18} style={s.sectionTitle} boxStyle={s.box} />
        <View style={s.statsRow}>
          {[1, 2, 3, 4].map((i) => (
            <SkeletonBox key={i} width={80} height={70} style={s.statCard} boxStyle={s.box} />
          ))}
        </View>
      </View>
      <View style={s.section}>
        <SkeletonBox width={100} height={18} style={s.sectionTitle} boxStyle={s.box} />
        <View style={s.tabRow}>
          <SkeletonBox width={80} height={36} boxStyle={s.box} />
          <SkeletonBox width={70} height={36} boxStyle={s.box} />
          <SkeletonBox width={60} height={36} boxStyle={s.box} />
        </View>
        <SkeletonBox width="100%" height={120} style={s.card} boxStyle={s.box} />
      </View>
      <View style={s.section}>
        <SkeletonBox width="100%" height={52} style={s.btn} boxStyle={s.box} />
        <SkeletonBox width="100%" height={52} style={s.btn} boxStyle={s.box} />
      </View>
    </View>
  );
}
