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
        container: {
          flex: 1,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.xxl
        },
        box: { backgroundColor: colors.border, borderRadius: radius.sm },
        avatar: { borderRadius: 46, marginBottom: spacing.md },
        line: { marginBottom: spacing.sm },
        editBtn: { borderRadius: radius.md, marginTop: spacing.md },
        hero: {
          backgroundColor: colors.surface,
          borderRadius: radius.xl,
          padding: spacing.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          marginBottom: spacing.lg
        },
        section: { marginBottom: spacing.md },
        card: {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          padding: spacing.md,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border
        },
        row: { marginBottom: spacing.md },
        logout: { borderRadius: radius.lg, marginTop: spacing.lg }
      }),
    [colors]
  );

  return (
    <View style={s.container}>
      <View style={s.hero}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 14 }}>
          <SkeletonBox width={84} height={84} style={s.avatar} boxStyle={s.box} />
          <View style={{ flex: 1 }}>
            <SkeletonBox width="70%" height={20} style={s.line} boxStyle={s.box} />
            <SkeletonBox width="40%" height={14} style={s.line} boxStyle={s.box} />
            <SkeletonBox width="55%" height={12} boxStyle={s.box} />
          </View>
        </View>
        <SkeletonBox width="100%" height={44} style={s.editBtn} boxStyle={s.box} />
      </View>
      <View style={s.section}>
        <SkeletonBox width={90} height={12} style={s.line} boxStyle={s.box} />
        <View style={s.card}>
          <SkeletonBox width="100%" height={48} style={s.row} boxStyle={s.box} />
          <SkeletonBox width="100%" height={48} boxStyle={s.box} />
        </View>
      </View>
      <View style={s.section}>
        <View style={s.card}>
          <SkeletonBox width="100%" height={20} style={s.row} boxStyle={s.box} />
        </View>
      </View>
      <View style={s.section}>
        <View style={s.card}>
          <SkeletonBox width="100%" height={20} boxStyle={s.box} />
        </View>
      </View>
      <SkeletonBox width="100%" height={44} style={s.logout} boxStyle={s.box} />
    </View>
  );
}
