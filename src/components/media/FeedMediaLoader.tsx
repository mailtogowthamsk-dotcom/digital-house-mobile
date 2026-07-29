/**
 * Feed-branded spinner — dark green / white / dark red (matches feed backdrop).
 * Shared by feed video and image downloads.
 */

import React, { useEffect, useRef } from "react";
import { View, Animated, Easing } from "react-native";

type Props = {
  size?: number;
  accessibilityLabel?: string;
};

export function FeedMediaLoader({
  size = 44,
  accessibilityLabel = "Loading media"
}: Props) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 850,
        easing: Easing.linear,
        useNativeDriver: true
      })
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"]
  });

  const ring = size;
  const pad = Math.max(4, Math.round(size * 0.14));

  return (
    <View
      style={{
        width: size + pad * 2,
        height: size + pad * 2,
        borderRadius: (size + pad * 2) / 2,
        backgroundColor: "rgba(15,23,42,0.35)",
        alignItems: "center",
        justifyContent: "center"
      }}
      accessibilityLabel={accessibilityLabel}
    >
      <Animated.View
        style={{
          width: ring,
          height: ring,
          borderRadius: ring / 2,
          borderWidth: 3.5,
          borderTopColor: "#166534",
          borderRightColor: "#FFFFFF",
          borderBottomColor: "#991B1B",
          borderLeftColor: "#FFFFFF",
          transform: [{ rotate }]
        }}
      />
    </View>
  );
}
