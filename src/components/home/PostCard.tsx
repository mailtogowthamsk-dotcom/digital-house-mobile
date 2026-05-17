import React, { useMemo, useRef, useCallback, useEffect, useState, memo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  Animated,
  Easing,
  Share
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { getImageUrl } from "../../api/client";
import { PostMedia } from "./PostMedia";
import { useTheme } from "../../theme/ThemeContext";

export type PostCardData = {
  id: string;
  userName: string;
  userAvatarUri?: string | null;
  timeAgo: string;
  postType: string;
  title: string;
  description: string;
  imageUri?: string | null;
  likeCount: number;
  commentCount: number;
  likedByMe?: boolean;
  savedByMe?: boolean;
  isTrending?: boolean;
  engagementScore?: number;
};

const DOUBLE_TAP_DELAY_MS = 400;
const HEART_SIZE = 88;
const GLOW_SIZE = 120;
const HEART_COLOR = "#E91E63";
const GLOW_COLOR = "rgba(233, 30, 99, 0.45)";

type PostCardProps = {
  post: PostCardData;
  onPress?: () => void;
  onViewDetails?: () => void;
  onDoubleTap?: () => void;
  onLikePress?: () => void;
  onCommentPress?: () => void;
  onSavePress?: () => void;
  onSharePress?: () => void;
};

function PostCardInner({
  post,
  onPress,
  onViewDetails,
  onDoubleTap,
  onLikePress,
  onCommentPress,
  onSavePress,
  onSharePress
}: PostCardProps) {
  const { colors, mode } = useTheme();
  const lastTapTime = useRef(0);
  const singleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const likeScale = useRef(new Animated.Value(1)).current;
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

  const bumpLikeIcon = useCallback(() => {
    likeScale.setValue(1);
    Animated.sequence([
      Animated.spring(likeScale, { toValue: 1.35, friction: 4, useNativeDriver: true }),
      Animated.spring(likeScale, { toValue: 1, friction: 5, useNativeDriver: true })
    ]).start();
  }, [likeScale]);

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

  useEffect(() => () => {
    if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
  }, []);

  const handleLike = useCallback(() => {
    bumpLikeIcon();
    onLikePress?.();
  }, [bumpLikeIcon, onLikePress]);

  const handleShare = useCallback(async () => {
    onSharePress?.();
    try {
      await Share.share({
        message: `${post.title}\n\n— ${post.userName} on Digital House`
      });
    } catch {
      // cancelled
    }
  }, [onSharePress, post.title, post.userName]);

  const s = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: colors.surface,
          borderRadius: 16,
          marginBottom: 14,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
          elevation: 3,
          overflow: "hidden"
        },
        cardPressed: { opacity: 0.98 },
        header: {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingTop: 16,
          marginBottom: 12
        },
        avatarWrap: {
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: mode === "dark" ? "#1E3A5F" : "#EFF6FF",
          alignItems: "center",
          justifyContent: "center",
          marginRight: 12,
          overflow: "hidden"
        },
        avatarImg: { width: 44, height: 44, borderRadius: 22 },
        avatarText: { fontSize: 18, fontWeight: "700", color: colors.primary },
        headerText: { flex: 1, minWidth: 0 },
        userName: { fontSize: 16, fontWeight: "600", color: colors.text, marginBottom: 2 },
        meta: { fontSize: 12, color: colors.textSecondary },
        trending: {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          backgroundColor: mode === "dark" ? "#3D2A10" : "#FFF7ED",
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 12
        },
        trendingText: { fontSize: 11, fontWeight: "700", color: "#EA580C" },
        body: { paddingHorizontal: 16 },
        title: { fontSize: 17, fontWeight: "600", color: colors.text, marginBottom: 8 },
        description: {
          fontSize: 14,
          color: colors.textSecondary,
          lineHeight: 22,
          marginBottom: 14
        },
        bannerWrap: {
          marginHorizontal: 16,
          borderRadius: 12,
          overflow: "hidden",
          marginBottom: 12,
          backgroundColor: colors.border
        },
        actionBar: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 8,
          paddingVertical: 8,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border
        },
        actionGroup: { flexDirection: "row", alignItems: "center" },
        actionBtn: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderRadius: 10
        },
        actionBtnPressed: { opacity: 0.65 },
        actionCount: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
        actionCountActive: { color: HEART_COLOR },
        viewDetailsBtn: {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          paddingHorizontal: 12,
          paddingVertical: 10
        },
        viewDetailsText: { fontSize: 13, fontWeight: "600", color: colors.primary },
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

  const initial = post.userName.trim().charAt(0).toUpperCase() || "?";

  return (
    <Pressable style={({ pressed }) => [s.card, pressed && s.cardPressed]} onPress={handlePress}>
      {heartVisible && (
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
      )}

      <View style={s.header}>
        <View style={s.avatarWrap}>
          {getImageUrl(post.userAvatarUri) ? (
            <Image source={{ uri: getImageUrl(post.userAvatarUri)! }} style={s.avatarImg} />
          ) : (
            <Text style={s.avatarText}>{initial}</Text>
          )}
        </View>
        <View style={s.headerText}>
          <Text style={s.userName} numberOfLines={1}>
            {post.userName}
          </Text>
          <Text style={s.meta}>
            {post.timeAgo} · {post.postType}
          </Text>
        </View>
        {post.isTrending ? (
          <View style={s.trending}>
            <Ionicons name="flame" size={14} color="#EA580C" />
            <Text style={s.trendingText}>Trending</Text>
          </View>
        ) : null}
      </View>

      <View style={s.body}>
        <Text style={s.title} numberOfLines={2}>
          {post.title}
        </Text>
        <Text style={s.description} numberOfLines={4}>
          {post.description}
        </Text>
      </View>

      {post.imageUri ? (
        <View style={s.bannerWrap}>
          <PostMedia mediaUrl={post.imageUri} />
        </View>
      ) : null}

      <View style={s.actionBar}>
        <View style={s.actionGroup}>
          <Pressable
            style={({ pressed }) => [s.actionBtn, pressed && s.actionBtnPressed]}
            onPress={(e) => {
              e.stopPropagation();
              handleLike();
            }}
            hitSlop={8}
          >
            <Animated.View style={{ transform: [{ scale: likeScale }] }}>
              <Ionicons
                name={post.likedByMe ? "heart" : "heart-outline"}
                size={22}
                color={post.likedByMe ? HEART_COLOR : colors.textSecondary}
              />
            </Animated.View>
            <Text style={[s.actionCount, post.likedByMe && s.actionCountActive]}>{post.likeCount}</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [s.actionBtn, pressed && s.actionBtnPressed]}
            onPress={(e) => {
              e.stopPropagation();
              onCommentPress?.();
            }}
            hitSlop={8}
          >
            <Ionicons name="chatbubble-outline" size={21} color={colors.textSecondary} />
            <Text style={s.actionCount}>{post.commentCount}</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [s.actionBtn, pressed && s.actionBtnPressed]}
            onPress={(e) => {
              e.stopPropagation();
              onSavePress?.();
            }}
            hitSlop={8}
          >
            <Ionicons
              name={post.savedByMe ? "bookmark" : "bookmark-outline"}
              size={21}
              color={post.savedByMe ? colors.primary : colors.textSecondary}
            />
          </Pressable>

          <Pressable
            style={({ pressed }) => [s.actionBtn, pressed && s.actionBtnPressed]}
            onPress={(e) => {
              e.stopPropagation();
              void handleShare();
            }}
            hitSlop={8}
          >
            <Ionicons name="share-outline" size={21} color={colors.textSecondary} />
          </Pressable>
        </View>

        <Pressable
          style={({ pressed }) => [s.viewDetailsBtn, pressed && s.actionBtnPressed]}
          onPress={(e) => {
            e.stopPropagation();
            onViewDetails?.();
          }}
        >
          <Text style={s.viewDetailsText}>Details</Text>
          <Ionicons name="chevron-forward" size={14} color={colors.primary} />
        </Pressable>
      </View>
    </Pressable>
  );
}

export const PostCard = memo(PostCardInner);
