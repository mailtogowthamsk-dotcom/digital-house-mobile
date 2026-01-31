import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Animated } from "react-native";

const SKELETON_BG = "#E5E7EB";
const SHIMMER_BG = "#F3F4F6";

/**
 * Simple skeleton placeholder: rounded rect with optional shimmer.
 * Used for welcome card, quick action grid, and feed while loading.
 */
export function SkeletonCard({
  width,
  height,
  style
}: {
  width?: number | string;
  height?: number;
  style?: object;
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

/** Full-width skeleton for welcome card */
export function WelcomeCardSkeleton() {
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

/** Single line skeleton */
export function SkeletonLine({ width = "100%" }: { width?: number | string }) {
  return <SkeletonCard width={width} height={16} style={s.line} />;
}

const s = StyleSheet.create({
  box: {
    backgroundColor: SKELETON_BG,
    borderRadius: 12
  },
  line: { marginBottom: 8 },
  lineShort: { marginTop: 4 },
  welcomeWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
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
});
