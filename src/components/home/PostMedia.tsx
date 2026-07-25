/**
 * Feed media — layout sizing only. Playback behavior unchanged.
 * Images use natural aspect ratio so the full photo is visible (no crop).
 * Videos keep an immersive 4:5 frame.
 */

import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import { View, StyleSheet, Image, useWindowDimensions } from "react-native";
import { WebView } from "react-native-webview";
import { getImageUrl } from "../../api/client";
import { isYouTubeUrl, getYouTubeEmbedUrl } from "../../utils/youtube";
import { useTheme } from "../../theme/ThemeContext";
import { Shimmer } from "../ui/Shimmer";
import { FeedVideoPlayer } from "../media/FeedVideoPlayer";
import {
  DEFAULT_FEED_ASPECT_RATIO,
  getCachedAspectRatio,
  prefetchAspectRatio,
  setCachedAspectRatio
} from "../../utils/imageDimensions";
import type { PostMediaKind } from "../../config/media.config";

/** Video frame: width:height = 4:5 → height/width */
const VIDEO_PORTRAIT_RATIO = 5 / 4;
const CARD_H_MARGIN = 8;
const MEDIA_H_INSET = 6;

type PostMediaProps = {
  mediaUrl: string | null | undefined;
  mediaType?: PostMediaKind | string | null;
  thumbnailUrl?: string | null;
  videoDuration?: number | null;
  isActive?: boolean;
  isPreload?: boolean;
  height?: number;
  style?: object;
  feedMode?: boolean;
  cornerRadius?: number;
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

function PostMediaInner({
  mediaUrl,
  mediaType,
  thumbnailUrl,
  isActive = false,
  isPreload = false,
  height: heightProp,
  style,
  feedMode = false,
  cornerRadius = 14
}: PostMediaProps) {
  const { colors } = useTheme();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const raw = mediaUrl?.trim();
  const kind = resolveKind(raw, mediaType);
  const imageUri = kind === "image" && raw ? getImageUrl(raw) : null;
  const videoUri = kind === "video" && raw ? getImageUrl(raw) : null;
  const thumbUri = thumbnailUrl ? getImageUrl(thumbnailUrl) : null;

  const [loaded, setLoaded] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number | null>(() =>
    imageUri ? getCachedAspectRatio(imageUri) : null
  );

  const contentWidth = feedMode
    ? Math.max(240, screenWidth - CARD_H_MARGIN * 2 - MEDIA_H_INSET * 2)
    : screenWidth - 32;

  const maxImageHeight = Math.round(screenHeight * 0.85);

  /** Videos stay cinematic 4:5. */
  const videoFrameHeight = useMemo(() => {
    const ideal = contentWidth * VIDEO_PORTRAIT_RATIO;
    const maxH = Math.min(screenHeight * 0.78, contentWidth * 1.45);
    const minH = contentWidth * 0.9;
    return Math.round(Math.max(minH, Math.min(ideal, maxH)));
  }, [contentWidth, screenHeight]);

  useEffect(() => {
    if (!imageUri) {
      setAspectRatio(null);
      setLoaded(false);
      return;
    }
    const cached = getCachedAspectRatio(imageUri);
    if (cached != null) {
      setAspectRatio(cached);
      return;
    }
    let cancelled = false;
    prefetchAspectRatio(imageUri).then((ratio) => {
      if (!cancelled) setAspectRatio(ratio);
    });
    return () => {
      cancelled = true;
    };
  }, [imageUri]);

  /** Height from real image ratio so nothing is cropped. */
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
          backgroundColor: colors.surfaceElevated,
          borderRadius: cornerRadius
        },
        webview: { flex: 1, width: "100%", backgroundColor: "transparent" },
        image: { width: "100%", height: "100%" },
        shimmer: { ...StyleSheet.absoluteFillObject }
      }),
    [colors, cornerRadius]
  );

  const onImageLoad = useCallback(
    (e: { nativeEvent: { source: { width: number; height: number } } }) => {
      const { width: w, height: h } = e.nativeEvent.source;
      if (imageUri && w > 0 && h > 0) {
        const ratio = setCachedAspectRatio(imageUri, w, h);
        setAspectRatio(ratio);
      }
      setLoaded(true);
    },
    [imageUri]
  );

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
          uri={videoUri}
          thumbnailUrl={thumbUri}
          height={videoHeight}
          isActive={isActive}
          isPreload={isPreload && !isActive}
        />
      </View>
    );
  }

  if (!imageUri) return null;

  const naturalH = contentWidth * (aspectRatio ?? DEFAULT_FEED_ASPECT_RATIO);
  const imageResizeMode = naturalH > maxImageHeight ? "contain" : "cover";

  return (
    <View style={[s.wrapOuter, style]}>
      <View style={[s.wrap, { height: imageHeight }]}>
        {!loaded ? (
          <Shimmer height={imageHeight} borderRadius={cornerRadius} style={s.shimmer} />
        ) : null}
        <Image
          source={{ uri: imageUri }}
          style={[s.image, { opacity: loaded ? 1 : 0 }]}
          resizeMode={imageResizeMode}
          onLoad={onImageLoad}
          fadeDuration={280}
        />
      </View>
    </View>
  );
}

export const PostMedia = memo(PostMediaInner);
