import React, { useEffect, useRef, useMemo } from "react";
import { View, StyleSheet, Animated } from "react-native";
import { useTheme } from "../../theme/ThemeContext";

export function SkeletonCard({
  width,
  height,
  style
}: {
  width?: number | string;
  height?: number;
  style?: object;
}) {
  const { colors } = useTheme();
  const s = useMemo(
    () =>
      StyleSheet.create({
        box: {
          backgroundColor: colors.border,
          borderRadius: 12
        }
      }),
    [colors]
  );
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
      style={[
        s.box,
        width != null && { width },
        height != null && { height },
        { opacity },
        style
      ]}
    />
  );
}

export function WelcomeCardSkeleton() {
  const { colors } = useTheme();
  const s = useMemo(
    () =>
      StyleSheet.create({
        line: { marginBottom: 8 },
        lineShort: { marginTop: 4 },
        welcomeWrap: {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.surface,
          borderRadius: 16,
          padding: 18,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
          elevation: 3
        },
        avatar: { borderRadius: 28, marginRight: 16 },
        welcomeText: { flex: 1 }
      }),
    [colors]
  );
  return (
    <View style={s.welcomeWrap}>
      <SkeletonCard width={56} height={56} style={s.avatar} />
      <View style={s.welcomeText}>
        <SkeletonCard width="70%" height={22} style={s.line} />
        <SkeletonCard width="50%" height={16} style={[s.line, s.lineShort]} />
      </View>
    </View>
  );
}

export function SkeletonLine({ width = "100%" }: { width?: number | string }) {
  const { colors } = useTheme();
  const lineStyle = useMemo(
    () =>
      StyleSheet.create({
        line: { marginBottom: 8 }
      }),
    []
  );
  return <SkeletonCard width={width} height={16} style={lineStyle.line} />;
}
