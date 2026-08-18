import React, { memo } from "react";
import { View, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { getPostTypeBadge } from "../../utils/postTypeBadge";

type Props = {
  postType?: string | null;
  /** Light icon on a translucent white circle (video overlay headers). */
  overlay?: boolean;
  /** Dark translucent circle with a tinted icon (photo grid overlays). */
  onDark?: boolean;
  size?: number;
};

function PostTypeIconBadgeInner({
  postType,
  overlay = false,
  onDark = false,
  size = 20
}: Props) {
  const badge = getPostTypeBadge(postType);
  if (!badge) return null;

  const iconSize = size <= 22 ? 12 : Math.round(size * 0.55);
  const backgroundColor = overlay
    ? "rgba(255,255,255,0.22)"
    : onDark
      ? "rgba(15,23,42,0.72)"
      : `${badge.color}22`;
  const iconColor = overlay ? "#FFFFFF" : badge.color;

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={badge.label}
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor
        }
      ]}
    >
      <Ionicons name={badge.icon} size={iconSize} color={iconColor} />
    </View>
  );
}

export const PostTypeIconBadge = memo(PostTypeIconBadgeInner);

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0
  }
});
