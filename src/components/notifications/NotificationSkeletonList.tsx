import React, { useEffect, useMemo, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";

function ShimmerBlock({
  width,
  height,
  style
}: {
  width: number | `${number}%`;
  height: number;
  style?: object;
}) {
  const { colors } = useTheme();
  const opacity = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.75, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.35, duration: 700, useNativeDriver: true })
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: radius.sm,
          backgroundColor: colors.surfaceElevated,
          opacity
        },
        style
      ]}
    />
  );
}

function SkeletonRow() {
  const { colors } = useTheme();
  return (
    <View
      style={{
        flexDirection: "row",
        gap: spacing.sm,
        paddingHorizontal: spacing.md,
        paddingVertical: 8,
        minHeight: 58,
        backgroundColor: colors.surface,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: colors.border
      }}
    >
      <ShimmerBlock width={38} height={38} style={{ borderRadius: 12 }} />
      <View style={{ flex: 1, gap: 6 }}>
        <ShimmerBlock width="72%" height={14} />
        <ShimmerBlock width="92%" height={12} />
        <ShimmerBlock width="28%" height={10} />
      </View>
    </View>
  );
}

export function NotificationSkeletonList({ rows = 8 }: { rows?: number }) {
  const s = useMemo(() => StyleSheet.create({ fill: { paddingTop: spacing.sm } }), []);
  return (
    <View style={s.fill}>
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonRow key={i} />
      ))}
    </View>
  );
}
