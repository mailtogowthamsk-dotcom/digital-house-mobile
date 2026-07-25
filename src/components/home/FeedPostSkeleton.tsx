import React, { useMemo } from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import { Shimmer } from "../ui/Shimmer";
import { useTheme } from "../../theme/ThemeContext";
import { feedCardShadow } from "../../theme/feedStyles";

export function FeedPostSkeleton() {
  const { colors, mode } = useTheme();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const mediaW = screenWidth - 28;
  const mediaH = Math.round(
    Math.min(screenHeight * 0.78, Math.max(mediaW * 1.1, mediaW * 1.25))
  );

  const s = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: mode === "dark" ? colors.surface : "rgba(255,255,255,0.92)",
          marginHorizontal: 8,
          marginBottom: 14,
          borderRadius: 16,
          overflow: "hidden",
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: mode === "dark" ? colors.border : "rgba(15,23,42,0.04)",
          paddingBottom: 12,
          ...feedCardShadow(mode)
        },
        row: {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 20,
          paddingTop: 18,
          marginBottom: 14,
          gap: 12
        },
        media: {
          marginHorizontal: 6,
          borderRadius: 14,
          overflow: "hidden"
        },
        actionBar: {
          flexDirection: "row",
          paddingHorizontal: 12,
          paddingTop: 6,
          gap: 12
        }
      }),
    [colors, mode]
  );

  return (
    <View style={s.card}>
      <View style={s.row}>
        <Shimmer width={52} height={52} borderRadius={26} />
        <View style={{ flex: 1, gap: 8 }}>
          <Shimmer width="46%" height={15} borderRadius={6} />
          <Shimmer width="34%" height={11} borderRadius={6} />
        </View>
        <Shimmer width={28} height={28} borderRadius={14} />
      </View>
      <View style={s.media}>
        <Shimmer width="100%" height={mediaH} borderRadius={14} />
      </View>
      <View style={s.actionBar}>
        <Shimmer width={28} height={28} borderRadius={14} />
        <Shimmer width={36} height={14} borderRadius={6} />
        <Shimmer width={28} height={28} borderRadius={14} />
        <View style={{ flex: 1 }} />
        <Shimmer width={28} height={28} borderRadius={14} />
        <Shimmer width={28} height={28} borderRadius={14} />
      </View>
    </View>
  );
}
