/**
 * Content-first feed post — Instagram-style video (full-bleed + overlay header).
 */

import React, { useMemo, useRef, useCallback, useEffect, useState, memo } from "react";
import { View, Text, StyleSheet, Pressable, Animated, Easing } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
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
  /** Extra signed image URLs if primary fails (medium / full / thumb). */
  imageUriFallbacks?: string[];
  mediaType?: "image" | "video" | "none" | string | null;
  thumbnailUrl?: string | null;
  videoDuration?: number | null;
  isMediaActive?: boolean;
  isMediaPreload?: boolean;
  /** Keep previous video player mounted for instant scroll-back (disk cache warm). */
  isMediaRetain?: boolean;
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

function isVideoPost(post: PostCardData): boolean {
  const t = (post.mediaType || "").toLowerCase();
  if (t === "video") return true;
  if (post.imageUri && /\.(mp4|mov|m4v)(\?|$)/i.test(post.imageUri)) return true;
  return false;
}

type PostCardProps = {
  post: PostCardData;
  /** Prefer separate flags over mutating `post` — keeps React.memo effective. */
  isMediaActive?: boolean;
  isMediaPreload?: boolean;
  isMediaRetain?: boolean;
  onPress?: () => void;
  onAuthorPress?: () => void;
  onDoubleTap?: () => void;
  onLikePress?: () => void;
  onLikeCountPress?: () => void;
  onCommentPress?: () => void;
  onSavePress?: () => void;
  onSharePress?: () => void;
  onMenuPress?: () => void;
  onActivateMedia?: (postId: string) => void;
};

function PostCardInner({
  post,
  isMediaActive: isMediaActiveProp,
  isMediaPreload: isMediaPreloadProp,
  isMediaRetain: isMediaRetainProp,
  onAuthorPress,
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

  const video = isVideoPost(post);
  const isMediaActive = isMediaActiveProp ?? Boolean(post.isMediaActive);
  const isMediaPreload = isMediaPreloadProp ?? Boolean(post.isMediaPreload);
  const isMediaRetain = isMediaRetainProp ?? Boolean(post.isMediaRetain);

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

  const triggerDoubleTapLike = useCallback(
    (x?: number, y?: number) => {
      if (!onDoubleTap || post.likedByMe) return;
      if (x != null && y != null) {
        const overlaySize = GLOW_SIZE * 1.2;
        setHeartPosition({ x: x - overlaySize / 2, y: y - overlaySize / 2 });
      }
      runHeartAnimation();
      onDoubleTap();
    },
    [onDoubleTap, post.likedByMe, runHeartAnimation]
  );

  /** Stable — avoids new function identity breaking PostMedia / FeedVideoPlayer memo. */
  const onMediaDoubleTapLike = useCallback(() => {
    if (!onDoubleTap || post.likedByMe) return;
    setHeartPosition({ x: 80, y: 140 });
    triggerDoubleTapLike();
  }, [onDoubleTap, post.likedByMe, triggerDoubleTapLike]);

  /** Image posts: double-tap like on media. Video: handled inside player (no single-tap play). */
  const handleImageRegionPress = useCallback(
    (ev: { nativeEvent: { locationX: number; locationY: number } }) => {
      if (video) return;
      const now = Date.now();
      const x = ev.nativeEvent.locationX;
      const y = ev.nativeEvent.locationY;
      if (onDoubleTap && now - lastTapTime.current < DOUBLE_TAP_DELAY_MS) {
        if (singleTapTimer.current) {
          clearTimeout(singleTapTimer.current);
          singleTapTimer.current = null;
        }
        lastTapTime.current = 0;
        triggerDoubleTapLike(x, y);
        return;
      }
      lastTapTime.current = now;
      singleTapTimer.current = setTimeout(() => {
        singleTapTimer.current = null;
      }, DOUBLE_TAP_DELAY_MS);
    },
    [video, onDoubleTap, triggerDoubleTapLike]
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
          borderWidth: video ? 0 : StyleSheet.hairlineWidth,
          borderColor: mode === "dark" ? colors.border : "rgba(15,23,42,0.04)",
          ...feedCardShadow(mode)
        },
        cardVideo: {
          // Match video chrome so rounded corners don’t flash white gaps
          backgroundColor: "#0B1220"
        },
        repost: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingHorizontal: 20,
          paddingTop: 14,
          paddingBottom: video ? 8 : 0,
          backgroundColor: mode === "dark" ? colors.surface : "rgba(255,255,255,0.92)"
        },
        videoStage: {
          position: "relative",
          width: "100%",
          backgroundColor: "#0B1220",
          overflow: "hidden"
        },
        videoFooter: {
          backgroundColor: mode === "dark" ? colors.surface : "rgba(255,255,255,0.92)",
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0
        },
        videoHeader: {
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 6
        },
        videoScrim: {
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 110,
          zIndex: 5
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
    [colors, mode, video]
  );

  const heartLayer = heartVisible ? (
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
  ) : null;

  const header = (
    <PostHeader
      userName={post.userName}
      authorUsername={post.authorUsername}
      userAvatarUri={post.userAvatarUri}
      timeAgo={post.timeAgo}
      communityTag={post.postType}
      isVerified={Boolean(post.isVerified)}
      isTrending={Boolean(post.isTrending)}
      onAuthorPress={onAuthorPress}
      onMenuPress={onMenuPress}
      variant={video ? "overlay" : "default"}
    />
  );

  return (
    <View style={[s.card, video && s.cardVideo]}>
      {post.isRepost ? (
        <View style={s.repost}>
          <Ionicons name="repeat-outline" size={14} color={colors.textSecondary} />
          <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textSecondary }}>
            Reposted by {post.userName}
            {post.originalAuthorName ? ` · original by ${post.originalAuthorName}` : ""}
          </Text>
        </View>
      ) : null}

      {video && post.imageUri ? (
        <View style={s.videoStage}>
          <PostMedia
            mediaUrl={post.imageUri}
            mediaType={post.mediaType}
            thumbnailUrl={post.thumbnailUrl}
            videoDuration={post.videoDuration}
            isActive={isMediaActive}
            isPreload={isMediaPreload}
            isRetain={isMediaRetain}
            feedMode
            cornerRadius={0}
            onDoubleTapLike={onDoubleTap && !post.likedByMe ? onMediaDoubleTapLike : undefined}
          />
          <LinearGradient
            colors={["rgba(0,0,0,0.55)", "rgba(0,0,0,0.2)", "transparent"]}
            locations={[0, 0.55, 1]}
            style={s.videoScrim}
            pointerEvents="none"
          />
          <View style={s.videoHeader} pointerEvents="box-none">
            {header}
          </View>
          {heartLayer}
        </View>
      ) : (
        <Pressable onPress={handleImageRegionPress}>
          {heartLayer}
          {header}
          {post.imageUri ? (
            <View style={s.mediaPad}>
              <View style={s.mediaClip}>
                <PostMedia
                  mediaUrl={post.imageUri}
                  mediaUrlFallbacks={post.imageUriFallbacks}
                  mediaType={post.mediaType}
                  thumbnailUrl={post.thumbnailUrl}
                  videoDuration={post.videoDuration}
                  isActive={isMediaActive}
                  isPreload={isMediaPreload}
                  isRetain={isMediaRetain}
                  feedMode
                  cornerRadius={14}
                />
              </View>
            </View>
          ) : null}
        </Pressable>
      )}

      <View style={video ? s.videoFooter : undefined}>
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
      </View>
    </View>
  );
}

export const PostCard = memo(PostCardInner, (prev, next) => {
  const a = prev.post;
  const b = next.post;
  return (
    a === b &&
    prev.isMediaActive === next.isMediaActive &&
    prev.isMediaPreload === next.isMediaPreload &&
    prev.isMediaRetain === next.isMediaRetain &&
    prev.onAuthorPress === next.onAuthorPress &&
    prev.onDoubleTap === next.onDoubleTap &&
    prev.onLikePress === next.onLikePress &&
    prev.onLikeCountPress === next.onLikeCountPress &&
    prev.onCommentPress === next.onCommentPress &&
    prev.onSavePress === next.onSavePress &&
    prev.onSharePress === next.onSharePress &&
    prev.onMenuPress === next.onMenuPress
  );
});
