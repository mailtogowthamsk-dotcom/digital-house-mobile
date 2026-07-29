/**
 * Feed media — layout sizing only. Playback behavior unchanged.
 * Images use natural aspect ratio so the full photo is visible (no crop).
 * Videos use a tall portrait frame (between 4:5 and 9:16).
 *
 * Feed photos use expo-image (same stack as avatars) — loader while cold download.
 */

import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";
import { Image } from "expo-image";
import { WebView } from "react-native-webview";
import { getImageUrl } from "../../api/client";
import { isYouTubeUrl, getYouTubeEmbedUrl } from "../../utils/youtube";
import { useTheme } from "../../theme/ThemeContext";
import { FeedVideoPlayer, type FeedVideoPlayerHandle } from "../media/FeedVideoPlayer";
import { FeedMediaLoader } from "../media/FeedMediaLoader";
import {
  DEFAULT_FEED_ASPECT_RATIO,
  getCachedAspectRatio,
  prefetchAspectRatio,
  setCachedAspectRatio,
  stableMediaCacheKey,
  aspectRatioChangedMeaningfully
} from "../../utils/imageDimensions";
import type { PostMediaKind } from "../../config/media.config";

/** Video frame: tall portrait, slightly under 9:16. */
const VIDEO_PORTRAIT_RATIO = 1.5;
const CARD_H_MARGIN = 8;
const MEDIA_H_INSET = 6;

/** Session-warmed image URIs — skip loader on scroll-back / remount. */
const warmedImageUris = new Set<string>();

function imageWarmKey(uri: string): string {
  return stableMediaCacheKey(uri) || uri;
}

function isImageUriWarmed(uri: string): boolean {
  return warmedImageUris.has(imageWarmKey(uri));
}

function markImageUriWarmed(uri: string): void {
  warmedImageUris.add(imageWarmKey(uri));
}

type PostMediaProps = {
  mediaUrl: string | null | undefined;
  /** Optional signed fallbacks when primary GET fails (e.g. missing _full). */
  mediaUrlFallbacks?: Array<string | null | undefined>;
  mediaType?: PostMediaKind | string | null;
  thumbnailUrl?: string | null;
  videoDuration?: number | null;
  isActive?: boolean;
  isPreload?: boolean;
  /** Keep previous clip mounted (paused) for instant scroll-back. */
  isRetain?: boolean;
  height?: number;
  style?: object;
  feedMode?: boolean;
  cornerRadius?: number;
  onRequestPlay?: () => void;
  onDoubleTapLike?: () => void;
};

function resolveKind(
  mediaUrl: string | null | undefined,
  mediaType?: string | null
): "youtube" | "video" | "image" | "none" {
  const raw = mediaUrl?.trim();
  if (!raw) return "none";
  if (isYouTubeUrl(raw)) return "youtube";
  const t = (mediaType || "").toLowerCase();
  if (t === "video") return "video";
  if (t === "image") return "image";
  if (/\.(mp4|mov|m4v)(\?|$)/i.test(raw) || /video\//i.test(raw)) return "video";
  return "image";
}

function buildImageCandidates(
  primary: string | null,
  fallbacks?: Array<string | null | undefined>
): string[] {
  const out: string[] = [];
  const push = (u: string | null | undefined) => {
    const resolved = getImageUrl(u ?? null);
    if (resolved && !out.includes(resolved)) out.push(resolved);
  };
  push(primary);
  for (const f of fallbacks ?? []) push(f);
  return out;
}

const PostMediaInner = React.forwardRef<FeedVideoPlayerHandle, PostMediaProps>(
  function PostMediaInner(
    {
      mediaUrl,
      mediaUrlFallbacks,
      mediaType,
      thumbnailUrl,
      isActive = false,
      isPreload = false,
      isRetain = false,
      height: heightProp,
      style,
      feedMode = false,
      cornerRadius = 14,
      onRequestPlay,
      onDoubleTapLike
    },
    ref
  ) {
    const { colors } = useTheme();
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();
    const raw = mediaUrl?.trim();
    const kind = resolveKind(raw, mediaType);
    const candidates = useMemo(
      () => (kind === "image" ? buildImageCandidates(raw ?? null, mediaUrlFallbacks) : []),
      [kind, raw, mediaUrlFallbacks]
    );
    const [candidateIndex, setCandidateIndex] = useState(0);
    const imageUri = candidates[candidateIndex] ?? null;
    const videoUri = kind === "video" && raw ? getImageUrl(raw) : null;
    const thumbUri = thumbnailUrl ? getImageUrl(thumbnailUrl) : null;

    const [aspectRatio, setAspectRatio] = useState<number | null>(() =>
      imageUri ? getCachedAspectRatio(imageUri) : null
    );
    const [imageLoading, setImageLoading] = useState(() =>
      imageUri ? !isImageUriWarmed(imageUri) : false
    );

    const contentWidth = feedMode
      ? Math.max(240, screenWidth - CARD_H_MARGIN * 2 - MEDIA_H_INSET * 2)
      : screenWidth - 32;

    const videoContentWidth = feedMode
      ? Math.max(240, screenWidth - CARD_H_MARGIN * 2)
      : contentWidth;

    const maxImageHeight = Math.round(screenHeight * 0.85);

    const videoFrameHeight = useMemo(() => {
      const ideal = videoContentWidth * VIDEO_PORTRAIT_RATIO;
      const maxH = Math.min(screenHeight * 0.78, videoContentWidth * 1.65);
      const minH = videoContentWidth * 1.1;
      return Math.round(Math.max(minH, Math.min(ideal, maxH)));
    }, [videoContentWidth, screenHeight]);

    useEffect(() => {
      setCandidateIndex(0);
    }, [raw]);

    useEffect(() => {
      if (!imageUri) {
        setImageLoading(false);
        return;
      }
      if (isImageUriWarmed(imageUri)) {
        setImageLoading(false);
        return;
      }
      setImageLoading(true);
      let cancelled = false;
      // expo-image disk cache is keyed by source URI (unless cacheKey is set).
      Image.getCachePathAsync(imageUri)
        .then((path) => {
          if (cancelled || !path) return;
          markImageUriWarmed(imageUri);
          setImageLoading(false);
        })
        .catch(() => {});
      return () => {
        cancelled = true;
      };
    }, [imageUri]);

    useEffect(() => {
      if (!imageUri) {
        setAspectRatio(null);
        return;
      }
      // Don't hit the network for dimensions until this card is current/next.
      if (feedMode && !isActive && !isPreload && !isRetain) {
        const cached = getCachedAspectRatio(imageUri);
        if (cached != null) setAspectRatio(cached);
        return;
      }
      const cached = getCachedAspectRatio(imageUri);
      if (cached != null) {
        setAspectRatio(cached);
      }
      let cancelled = false;
      prefetchAspectRatio(imageUri).then((ratio) => {
        if (cancelled) return;
        setAspectRatio((prev) =>
          aspectRatioChangedMeaningfully(prev, ratio) ? ratio : prev
        );
      });
      return () => {
        cancelled = true;
      };
    }, [imageUri, feedMode, isActive, isPreload, isRetain]);

    const imageHeight = useMemo(() => {
      const ratio = aspectRatio ?? DEFAULT_FEED_ASPECT_RATIO;
      const natural = contentWidth * ratio;
      return Math.round(Math.min(Math.max(natural, contentWidth * 0.45), maxImageHeight));
    }, [aspectRatio, contentWidth, maxImageHeight]);

    const youtubeHeight = feedMode ? videoFrameHeight : heightProp ?? 220;
    const videoHeight = feedMode ? videoFrameHeight : heightProp ?? videoFrameHeight;

    const s = useMemo(
      () =>
        StyleSheet.create({
          wrapOuter: { width: "100%" },
          wrap: {
            width: "100%",
            overflow: "hidden",
            backgroundColor: cornerRadius === 0 ? "#0B1220" : colors.surfaceElevated,
            borderRadius: cornerRadius
          },
          webview: { flex: 1, width: "100%", backgroundColor: "transparent" },
          loaderCenter: {
            ...StyleSheet.absoluteFillObject,
            alignItems: "center",
            justifyContent: "center"
          }
        }),
      [colors, cornerRadius]
    );

    const onImageLoad = useCallback(
      (e: { source?: { width?: number; height?: number } }) => {
        if (imageUri) {
          markImageUriWarmed(imageUri);
          setImageLoading(false);
        }
        const w = e?.source?.width ?? 0;
        const h = e?.source?.height ?? 0;
        if (imageUri && w > 0 && h > 0) {
          const ratio = setCachedAspectRatio(imageUri, w, h);
          setAspectRatio((prev) =>
            aspectRatioChangedMeaningfully(prev, ratio) ? ratio : prev
          );
        }
      },
      [imageUri]
    );

    const onImageError = useCallback(() => {
      setImageLoading(false);
      if (candidateIndex < candidates.length - 1) {
        setCandidateIndex((i) => i + 1);
        return;
      }
      if (__DEV__) {
        console.warn("[PostMedia] image failed", imageUri?.slice(0, 120));
      }
    }, [candidateIndex, candidates.length, imageUri]);

    if (!raw || kind === "none") return null;

    if (kind === "youtube") {
      const embedUrl = getYouTubeEmbedUrl(raw);
      if (!embedUrl) return null;
      const embedUri = `${embedUrl}?playsinline=1&rel=0&modestbranding=1`;
      return (
        <View style={[s.wrap, { height: youtubeHeight }, style]}>
          <WebView
            source={{ uri: embedUri }}
            style={[s.webview, { height: youtubeHeight }]}
            scrollEnabled={false}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction={false}
            javaScriptEnabled
            originWhitelist={["*"]}
            allowsFullscreenVideo
            mixedContentMode="compatibility"
            setSupportMultipleWindows={false}
            setBuiltInZoomControls={false}
            domStorageEnabled
          />
        </View>
      );
    }

    if (kind === "video" && videoUri) {
      return (
        <View style={[s.wrapOuter, s.wrap, style]}>
          <FeedVideoPlayer
            ref={ref}
            uri={videoUri}
            thumbnailUrl={thumbUri}
            height={videoHeight}
            isActive={isActive}
            isPreload={isPreload && !isActive}
            isRetain={isRetain && !isActive && !isPreload}
            onRequestPlay={onRequestPlay}
            onDoubleTapLike={onDoubleTapLike}
          />
        </View>
      );
    }

    if (!imageUri) return null;

    const naturalH = contentWidth * (aspectRatio ?? DEFAULT_FEED_ASPECT_RATIO);
    const contentFit = naturalH > maxImageHeight ? "contain" : "cover";
    // Feed images: current + next (+ retained previous for layout consistency).
    const shouldLoadRemote = !feedMode || isActive || isPreload || isRetain;
    const showImageLoader = shouldLoadRemote && imageLoading;

    return (
      <View style={[s.wrapOuter, style]}>
        <View style={[s.wrap, { height: imageHeight }]}>
          {shouldLoadRemote ? (
            <Image
              source={{ uri: imageUri }}
              style={{
                width: contentWidth,
                height: imageHeight,
                alignSelf: "center"
              }}
              contentFit={contentFit}
              cachePolicy="memory-disk"
              recyclingKey={imageWarmKey(imageUri)}
              transition={0}
              onLoadStart={() => {
                if (!isImageUriWarmed(imageUri)) setImageLoading(true);
              }}
              onLoad={onImageLoad}
              onError={onImageError}
              priority="high"
            />
          ) : null}
          {showImageLoader ? (
            <View style={s.loaderCenter} pointerEvents="none">
              <FeedMediaLoader accessibilityLabel="Loading image" />
            </View>
          ) : null}
        </View>
      </View>
    );
  }
);

export const PostMedia = memo(PostMediaInner);
