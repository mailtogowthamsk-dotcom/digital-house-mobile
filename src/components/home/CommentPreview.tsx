import React, { memo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { typography } from "../../theme/typography";

type Props = {
  likeCount: number;
  commentCount: number;
  firstLikerName?: string | null;
  onLikeCountPress?: () => void;
  onViewComments?: () => void;
  /** Hide numeric “N likes” when counts already show on the action bar */
  compact?: boolean;
};

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

function CommentPreviewInner({
  likeCount,
  commentCount,
  firstLikerName,
  onLikeCountPress,
  onViewComments,
  compact = false
}: Props) {
  const { colors } = useTheme();

  const socialLike =
    firstLikerName?.trim() && likeCount > 0
      ? likeCount === 1
        ? `Liked by ${firstLikerName.trim()}`
        : `Liked by ${firstLikerName.trim()} and ${formatCount(Math.max(0, likeCount - 1))} others`
      : null;

  const numericLike =
    !compact && !socialLike && likeCount > 0
      ? likeCount === 1
        ? "1 like"
        : `${formatCount(likeCount)} likes`
      : null;

  const likedLine = socialLike ?? numericLike;

  if (!likedLine && commentCount <= 0) return null;

  return (
    <View style={[styles.wrap, compact && styles.wrapCompact]}>
      {likedLine ? (
        <Pressable
          onPress={onLikeCountPress}
          disabled={!onLikeCountPress || likeCount <= 0}
          hitSlop={4}
        >
          <Text style={[typography.feedCount, { color: colors.text }]}>{likedLine}</Text>
        </Pressable>
      ) : null}
      {commentCount > 0 ? (
        <Pressable onPress={onViewComments} hitSlop={4} style={styles.comments}>
          <Text style={[typography.feedMeta, { color: colors.textSecondary, fontWeight: "500" }]}>
            {commentCount === 1 ? "View 1 comment" : `View all ${formatCount(commentCount)} comments`}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export const CommentPreview = memo(CommentPreviewInner);

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 16,
    paddingTop: 2,
    paddingBottom: 2,
    gap: 2
  },
  wrapCompact: {
    paddingHorizontal: 14,
    paddingTop: 2,
    paddingBottom: 4,
    gap: 1
  },
  comments: {
    marginTop: 1
  }
});
