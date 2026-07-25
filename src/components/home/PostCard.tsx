/**
 * Content-first feed post — soft container, hero media, unchanged interactions.
 */

import React, { useMemo, useRef, useCallback, useEffect, useState, memo } from "react";
import { View, Text, StyleSheet, Pressable, Animated, Easing } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { PostMedia } from "./PostMedia";
import { PostHeader } from "./PostHeader";
import { PostCaption } from "./PostCaption";
import { PostActions } from "./PostActions";
import { CommentPreview } from "./CommentPreview";
import { useTheme } from "../../theme/ThemeContext";
import { feedCardShadow } from "../../theme/feedStyles";

export type PostCardData = {
  id: string;
  userName: string;
  authorUserId?: number;
  authorUsername?: string | null;
  userAvatarUri?: string | null;
  timeAgo: string;
  postType: string;
  title: string;
  description: string;
  imageUri?: string | null;
  mediaType?: "image" | "video" | "none" | string | null;
  thumbnailUrl?: string | null;
  videoDuration?: number | null;
  isMediaActive?: boolean;
  isMediaPreload?: boolean;
  likeCount: number;
  commentCount: number;
  likedByMe?: boolean;
  savedByMe?: boolean;
  isTrending?: boolean;
  engagementScore?: number;
  isRepost?: boolean;
  originalAuthorName?: string | null;
  originalPostId?: number | null;
  isVerified?: boolean;
  audience?: string | null;
  firstLikerName?: string | null;
};

const DOUBLE_TAP_DELAY_MS = 280;
const HEART_SIZE = 88;
const GLOW_SIZE = 120;
const HEART_COLOR = "#E91E63";
const GLOW_COLOR = "rgba(233, 30, 99, 0.45)";

type PostCardProps = {
  post: PostCardData;
  onPress?: () => void;
  onAuthorPress?: () => void;
  onViewDetails?: () => void;
  onDoubleTap?: () => void;
  onLikePress?: () => void;
  onLikeCountPress?: () => void;
  onCommentPress?: () => void;
  onSavePress?: () => void;
  onSharePress?: () => void;
  onMenuPress?: () => void;
};

function PostCardInner({
  post,
  onPress,
  onAuthorPress,
  onViewDetails,
  onDoubleTap,
  onLikePress,
  onLikeCountPress,
  onCommentPress,
  onSavePress,
  onSharePress,
  onMenuPress
}: PostCardProps) {
  const { colors, mode } = useTheme();
  const lastTapTime = useRef(0);
  const singleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [heartVisible, setHeartVisible] = useState(false);
  const [heartPosition, setHeartPosition] = useState({ x: 0, y: 0 });
  const heartScale = useRef(new Animated.Value(0)).current;
  const heartOpacity = useRef(new Animated.Value(1)).current;
  const glowScale = useRef(new Animated.Value(0)).current;
  const glowOpacity = useRef(new Animated.Value(0.6)).current;

  const runHeartAnimation = useCallback(() => {
    heartScale.setValue(0);
    heartOpacity.setValue(1);
    glowScale.setValue(0);
    glowOpacity.setValue(0.6);
    setHeartVisible(true);

    Animated.parallel([
      Animated.spring(heartScale, {
        toValue: 1.15,
        friction: 5.5,
        tension: 140,
        useNativeDriver: true
      }),
      Animated.timing(glowScale, {
        toValue: 1.65,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(glowOpacity, {
        toValue: 0,
        duration: 520,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true
      }),
      Animated.sequence([
        Animated.delay(220),
        Animated.timing(heartOpacity, {
          toValue: 0,
          duration: 480,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true
        })
      ])
    ]).start(({ finished }) => {
      if (finished) setHeartVisible(false);
    });
  }, [heartScale, heartOpacity, glowScale, glowOpacity]);

  const handlePress = useCallback(
    (ev: { nativeEvent: { locationX: number; locationY: number } }) => {
      const now = Date.now();
      const x = ev.nativeEvent.locationX;
      const y = ev.nativeEvent.locationY;
      if (onDoubleTap && now - lastTapTime.current < DOUBLE_TAP_DELAY_MS) {
        if (singleTapTimer.current) {
          clearTimeout(singleTapTimer.current);
          singleTapTimer.current = null;
        }
        lastTapTime.current = 0;
        if (!post.likedByMe) {
          const overlaySize = GLOW_SIZE * 1.2;
          setHeartPosition({ x: x - overlaySize / 2, y: y - overlaySize / 2 });
          runHeartAnimation();
          onDoubleTap();
        }
        return;
      }
      lastTapTime.current = now;
      singleTapTimer.current = setTimeout(() => {
        singleTapTimer.current = null;
        onPress?.();
      }, DOUBLE_TAP_DELAY_MS);
    },
    [onPress, onDoubleTap, runHeartAnimation, post.likedByMe]
  );

  useEffect(
    () => () => {
      if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
    },
    []
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
          ...feedCardShadow(mode)
        },
        cardPressed: { opacity: 0.99 },
        repost: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingHorizontal: 20,
          paddingTop: 14
        },
        mediaPad: {
          paddingHorizontal: 6,
          marginTop: 2,
          marginBottom: 0
        },
        mediaClip: {
          borderRadius: 14,
          overflow: "hidden",
          backgroundColor: colors.surfaceElevated
        },
        heartOverlay: {
          position: "absolute",
          width: GLOW_SIZE * 1.2,
          height: GLOW_SIZE * 1.2,
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10,
          pointerEvents: "none"
        },
        heartGlow: {
          position: "absolute",
          width: GLOW_SIZE,
          height: GLOW_SIZE,
          left: (GLOW_SIZE * 1.2 - GLOW_SIZE) / 2,
          top: (GLOW_SIZE * 1.2 - GLOW_SIZE) / 2,
          borderRadius: GLOW_SIZE / 2,
          backgroundColor: GLOW_COLOR
        },
        heartIconWrap: { alignItems: "center", justifyContent: "center" }
      }),
    [colors, mode]
  );

  return (
    <Pressable style={({ pressed }) => [s.card, pressed && s.cardPressed]} onPress={handlePress}>
      {heartVisible ? (
        <View
          style={[s.heartOverlay, { left: heartPosition.x, top: heartPosition.y }]}
          pointerEvents="none"
        >
          <Animated.View
            style={[s.heartGlow, { transform: [{ scale: glowScale }], opacity: glowOpacity }]}
          />
          <Animated.View
            style={[s.heartIconWrap, { transform: [{ scale: heartScale }], opacity: heartOpacity }]}
          >
            <Ionicons name="heart" size={HEART_SIZE} color={HEART_COLOR} />
          </Animated.View>
        </View>
      ) : null}

      {post.isRepost ? (
        <View style={s.repost}>
          <Ionicons name="repeat-outline" size={14} color={colors.textSecondary} />
          <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textSecondary }}>
            Reposted by {post.userName}
            {post.originalAuthorName ? ` · original by ${post.originalAuthorName}` : ""}
          </Text>
        </View>
      ) : null}

      <PostHeader
        userName={post.userName}
        authorUsername={post.authorUsername}
        userAvatarUri={post.userAvatarUri}
        timeAgo={post.timeAgo}
        communityTag={post.postType}
        isVerified={Boolean(post.isVerified)}
        isTrending={Boolean(post.isTrending)}
        onAuthorPress={onAuthorPress}
        onMenuPress={onMenuPress ?? onViewDetails}
      />

      {post.imageUri ? (
        <View style={s.mediaPad}>
          <View style={s.mediaClip}>
            <PostMedia
              mediaUrl={post.imageUri}
              mediaType={post.mediaType}
              thumbnailUrl={post.thumbnailUrl}
              videoDuration={post.videoDuration}
              isActive={Boolean(post.isMediaActive)}
              isPreload={Boolean(post.isMediaPreload)}
              feedMode
              cornerRadius={14}
            />
          </View>
        </View>
      ) : null}

      <PostActions
        likedByMe={post.likedByMe}
        savedByMe={post.savedByMe}
        likeCount={post.likeCount}
        commentCount={post.commentCount}
        onLikePress={onLikePress}
        onLikeCountPress={onLikeCountPress}
        onCommentPress={onCommentPress}
        onSharePress={onSharePress}
        onSavePress={onSavePress}
      />

      <PostCaption title={post.title} description={post.description} variant="title" />
      <PostCaption title={post.title} description={post.description} variant="caption" maxLines={3} />

      <CommentPreview
        likeCount={post.likeCount}
        commentCount={post.commentCount}
        firstLikerName={post.firstLikerName}
        onLikeCountPress={onLikeCountPress}
        onViewComments={onCommentPress}
        compact
      />
    </Pressable>
  );
}

export const PostCard = memo(PostCardInner);
