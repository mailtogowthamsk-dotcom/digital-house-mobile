import React, { useMemo, useRef, useCallback, useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable, Image, Animated, Easing } from "react-native";
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
  /** True if the current user has liked this post (double-tap only adds like, never removes) */
  likedByMe?: boolean;
};

const DOUBLE_TAP_DELAY_MS = 400;

type PostCardProps = {
  post: PostCardData;
  onPress?: () => void;
  onViewDetails?: () => void;
  /** Called when user double-taps the card (e.g. to like) */
  onDoubleTap?: () => void;
};

const HEART_SIZE = 88;
const GLOW_SIZE = 120;
const HEART_COLOR = "#E91E63";
const GLOW_COLOR = "rgba(233, 30, 99, 0.45)";

export function PostCard({ post, onPress, onViewDetails, onDoubleTap }: PostCardProps) {
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

    const popDuration = 380;
    const fadeStartDelay = 220;
    const fadeDuration = 480;

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
        Animated.delay(fadeStartDelay),
        Animated.timing(heartOpacity, {
          toValue: 0,
          duration: fadeDuration,
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
        if (post.likedByMe) return;
        const overlaySize = GLOW_SIZE * 1.2;
        setHeartPosition({ x: x - overlaySize / 2, y: y - overlaySize / 2 });
        runHeartAnimation();
        onDoubleTap();
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

  const s = useMemo(
    () =>
      StyleSheet.create({
        card: {
          backgroundColor: colors.surface,
          borderRadius: 16,
          padding: 18,
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
          marginBottom: 14
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
        avatarText: {
          fontSize: 18,
          fontWeight: "700",
          color: colors.primary
        },
        headerText: { flex: 1, minWidth: 0 },
        nameRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          marginBottom: 2
        },
        userName: {
          fontSize: 16,
          fontWeight: "600",
          color: colors.text,
          flex: 1
        },
        verifiedBadge: { flexDirection: "row", alignItems: "center", gap: 2 },
        verifiedText: {
          fontSize: 11,
          fontWeight: "600",
          color: colors.success
        },
        meta: { fontSize: 12, color: colors.textSecondary },
        title: {
          fontSize: 17,
          fontWeight: "600",
          color: colors.text,
          marginBottom: 8
        },
        description: {
          fontSize: 14,
          color: colors.textSecondary,
          lineHeight: 22,
          marginBottom: 14
        },
        bannerWrap: {
          borderRadius: 12,
          overflow: "hidden",
          marginBottom: 14,
          backgroundColor: colors.border
        },
        banner: { width: "100%", height: "100%" },
        footerDivider: {
          height: 1,
          backgroundColor: colors.border,
          marginBottom: 12
        },
        footer: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between"
        },
        footerLeft: { flexDirection: "row", alignItems: "center", gap: 6 },
        footerCount: { fontSize: 13, color: colors.textSecondary },
        footerSpacer: { width: 16 },
        viewDetailsBtn: {
          flexDirection: "row",
          alignItems: "center",
          gap: 4
        },
        viewDetailsBtnPressed: { opacity: 0.8 },
        viewDetailsText: {
          fontSize: 14,
          fontWeight: "600",
          color: colors.primary
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
        heartIconWrap: {
          alignItems: "center",
          justifyContent: "center",
          shadowColor: HEART_COLOR,
          shadowOffset: { width: 0, height: 0 },
          shadowOpacity: 0.5,
          shadowRadius: 12,
          elevation: 8
        }
      }),
    [colors, mode]
  );

  const initial = post.userName.trim().charAt(0).toUpperCase() || "?";

  return (
    <Pressable
      style={({ pressed }) => [s.card, pressed && s.cardPressed]}
      onPress={handlePress}
    >
      {heartVisible && (
        <View
          style={[s.heartOverlay, { left: heartPosition.x, top: heartPosition.y }]}
          pointerEvents="none"
        >
          <Animated.View
            style={[
              s.heartGlow,
              {
                transform: [{ scale: glowScale }],
                opacity: glowOpacity
              }
            ]}
          />
          <Animated.View
            style={[
              s.heartIconWrap,
              {
                transform: [{ scale: heartScale }],
                opacity: heartOpacity
              }
            ]}
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
          <View style={s.nameRow}>
            <Text style={s.userName} numberOfLines={1}>
              {post.userName}
            </Text>
            <View style={s.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} />
              <Text style={s.verifiedText}>Verified</Text>
            </View>
          </View>
          <Text style={s.meta}>
            {post.timeAgo} • {post.postType}
          </Text>
        </View>
      </View>

      <Text style={s.title} numberOfLines={2}>
        {post.title}
      </Text>
      <Text style={s.description} numberOfLines={4}>
        {post.description}
      </Text>

      {post.imageUri ? (
        <View style={s.bannerWrap}>
          <PostMedia mediaUrl={post.imageUri} />
        </View>
      ) : null}

      <View style={s.footerDivider} />
      <View style={s.footer}>
        <View style={s.footerLeft}>
          <Ionicons
            name={post.likedByMe ? "heart" : "heart-outline"}
            size={20}
            color={post.likedByMe ? HEART_COLOR : colors.textSecondary}
          />
          <Text style={s.footerCount}>{post.likeCount}</Text>
          <View style={s.footerSpacer} />
          <Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />
          <Text style={s.footerCount}>{post.commentCount}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [s.viewDetailsBtn, pressed && s.viewDetailsBtnPressed]}
          onPress={(e) => {
            e.stopPropagation();
            onViewDetails?.();
          }}
        >
          <Text style={s.viewDetailsText}>View Details</Text>
          <Ionicons name="arrow-forward" size={14} color={colors.primary} />
        </Pressable>
      </View>
    </Pressable>
  );
}
