import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View, type ViewStyle } from "react-native";
import { useTheme } from "../../theme/ThemeContext";

type Props = {
  width?: number | `${number}%`;
  height: number;
  borderRadius?: number;
  style?: ViewStyle;
};

/** Lightweight shimmer placeholder for feed skeletons. */
export function Shimmer({ width = "100%", height, borderRadius = 8, style }: Props) {
  const { colors, mode } = useTheme();
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

  const base = mode === "dark" ? colors.border : "#E8ECF0";

  return (
    <View style={[styles.wrap, { width, height, borderRadius }, style]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: base, borderRadius, opacity }
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: "hidden" }
});
