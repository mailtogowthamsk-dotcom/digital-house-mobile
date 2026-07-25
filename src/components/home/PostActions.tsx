/**
 * Action bar under hero media.
 * Order: Like · Comment ····· Save · Share
 * Handlers unchanged.
 */

import React, { memo, useCallback, useRef } from "react";
import { View, Text, StyleSheet, Pressable, Animated } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { typography } from "../../theme/typography";

const HEART_COLOR = "#E11D48";
const ICON_SIZE = 25;

type Props = {
  likedByMe?: boolean;
  savedByMe?: boolean;
  likeCount?: number;
  commentCount?: number;
  onLikePress?: () => void;
  onLikeCountPress?: () => void;
  onCommentPress?: () => void;
  onSharePress?: () => void;
  onSavePress?: () => void;
};

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

function bounce(anim: Animated.Value, peak = 1.22) {
  anim.setValue(1);
  Animated.sequence([
    Animated.spring(anim, { toValue: peak, friction: 5, tension: 200, useNativeDriver: true }),
    Animated.spring(anim, { toValue: 1, friction: 6, tension: 160, useNativeDriver: true })
  ]).start();
}

function PostActionsInner({
  likedByMe,
  savedByMe,
  likeCount = 0,
  commentCount = 0,
  onLikePress,
  onLikeCountPress,
  onCommentPress,
  onSharePress,
  onSavePress
}: Props) {
  const { colors, mode } = useTheme();
  const likeScale = useRef(new Animated.Value(1)).current;
  const saveScale = useRef(new Animated.Value(1)).current;
  const shareScale = useRef(new Animated.Value(1)).current;

  const handleLike = useCallback(() => {
    bounce(likeScale, 1.28);
    onLikePress?.();
  }, [likeScale, onLikePress]);

  const handleSave = useCallback(() => {
    bounce(saveScale, 1.18);
    onSavePress?.();
  }, [saveScale, onSavePress]);

  const handleShare = useCallback(() => {
    bounce(shareScale, 1.14);
    onSharePress?.();
  }, [shareScale, onSharePress]);

  const pressedBg = mode === "dark" ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.05)";
  const idle = colors.text;

  return (
    <View style={styles.row}>
      <View style={styles.group}>
        <Pressable
          style={({ pressed }) => [styles.btn, pressed && { backgroundColor: pressedBg }]}
          onPress={handleLike}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={likedByMe ? "Unlike" : "Like"}
        >
          <Animated.View style={{ transform: [{ scale: likeScale }] }}>
            <Ionicons
              name={likedByMe ? "heart" : "heart-outline"}
              size={ICON_SIZE}
              color={likedByMe ? HEART_COLOR : idle}
            />
          </Animated.View>
        </Pressable>
        {likeCount > 0 ? (
          <Pressable
            onPress={() => {
              if (onLikeCountPress) onLikeCountPress();
              else handleLike();
            }}
            hitSlop={6}
            style={styles.countHit}
            accessibilityRole="button"
            accessibilityLabel={`${likeCount} likes`}
          >
            <Text
              style={[typography.feedCount, { color: likedByMe ? HEART_COLOR : colors.text }]}
            >
              {formatCount(likeCount)}
            </Text>
          </Pressable>
        ) : null}

        <Pressable
          style={({ pressed }) => [
            styles.btn,
            styles.commentBtn,
            pressed && { backgroundColor: pressedBg }
          ]}
          onPress={onCommentPress}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Comment"
        >
          <Ionicons name="chatbubble-outline" size={ICON_SIZE - 1} color={idle} />
          {commentCount > 0 ? (
            <Text style={[typography.feedCount, { color: colors.text, marginLeft: 6 }]}>
              {formatCount(commentCount)}
            </Text>
          ) : null}
        </Pressable>
      </View>

      <View style={styles.group}>
        <Pressable
          style={({ pressed }) => [styles.btn, pressed && { backgroundColor: pressedBg }]}
          onPress={handleSave}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel={savedByMe ? "Remove bookmark" : "Bookmark"}
        >
          <Animated.View style={{ transform: [{ scale: saveScale }] }}>
            <Ionicons
              name={savedByMe ? "bookmark" : "bookmark-outline"}
              size={ICON_SIZE - 1}
              color={savedByMe ? colors.primary : idle}
            />
          </Animated.View>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.btn, pressed && { backgroundColor: pressedBg }]}
          onPress={handleShare}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Share"
        >
          <Animated.View style={{ transform: [{ scale: shareScale }] }}>
            <Ionicons name="paper-plane-outline" size={ICON_SIZE - 1} color={idle} />
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}

export const PostActions = memo(PostActionsInner);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingTop: 4,
    paddingBottom: 2,
    minHeight: 48
  },
  group: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  btn: {
    minWidth: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6
  },
  commentBtn: {
    flexDirection: "row",
    paddingHorizontal: 10
  },
  countHit: {
    paddingVertical: 8,
    paddingRight: 10,
    marginLeft: -2
  }
});
