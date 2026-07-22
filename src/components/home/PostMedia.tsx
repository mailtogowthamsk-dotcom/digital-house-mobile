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

const IMAGE_MAX_HEIGHT = 520;
const YOUTUBE_HEIGHT = 220;
const VIDEO_HEIGHT = 360;

type PostMediaProps = {
  mediaUrl: string | null | undefined;
  mediaType?: PostMediaKind | string | null;
  thumbnailUrl?: string | null;
  videoDuration?: number | null;
  /** When true, video may autoplay (feed-global mute preference applies). */
  isActive?: boolean;
  /** Mount a paused player to preload the next likely video. */
  isPreload?: boolean;
  height?: number;
  style?: object;
  /** Full-bleed feed image (cover, edge-to-edge) */
  feedMode?: boolean;
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
  height = YOUTUBE_HEIGHT,
  style,
  feedMode = false
}: PostMediaProps) {
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const raw = mediaUrl?.trim();
  const kind = resolveKind(raw, mediaType);
  const imageUri = kind === "image" && raw ? getImageUrl(raw) : null;
  const videoUri = kind === "video" && raw ? getImageUrl(raw) : null;
  const thumbUri = thumbnailUrl ? getImageUrl(thumbnailUrl) : null;

  const [loaded, setLoaded] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number | null>(() =>
    imageUri ? getCachedAspectRatio(imageUri) : null
  );

  const contentWidth = feedMode ? screenWidth : screenWidth - 32;

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

  const imageHeight = useMemo(() => {
    const ratio = aspectRatio ?? DEFAULT_FEED_ASPECT_RATIO;
    return Math.min(contentWidth * ratio, IMAGE_MAX_HEIGHT);
  }, [aspectRatio, contentWidth]);

  const s = useMemo(
    () =>
      StyleSheet.create({
        wrapOuter: { width: "100%" },
        wrap: {
          width: "100%",
          overflow: "hidden",
          backgroundColor: colors.surfaceElevated,
          ...(feedMode ? {} : { borderRadius: 0 })
        },
        webview: { flex: 1, width: "100%", backgroundColor: "transparent" },
        image: { width: "100%", height: "100%" },
        shimmer: { ...StyleSheet.absoluteFillObject }
      }),
    [colors, feedMode]
  );

  const onImageLoad = useCallback(
    (e: { nativeEvent: { source: { width: number; height: number } } }) => {
      const { width: w, height: h } = e.nativeEvent.source;
      if (imageUri && w > 0 && h > 0) {
        setCachedAspectRatio(imageUri, w, h);
        setAspectRatio(h / w);
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
      <View style={[s.wrap, { height }, style]}>
        <WebView
          source={{ uri: embedUri }}
          style={[s.webview, { height }]}
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
      <View style={[s.wrapOuter, style]}>
        <FeedVideoPlayer
          uri={videoUri}
          thumbnailUrl={thumbUri}
          height={VIDEO_HEIGHT}
          isActive={isActive}
          isPreload={isPreload && !isActive}
        />
      </View>
    );
  }

  if (!imageUri) return null;

  return (
    <View style={[s.wrapOuter, style]}>
      <View style={[s.wrap, { height: imageHeight }]}>
        {!loaded ? <Shimmer height={imageHeight} borderRadius={0} style={s.shimmer} /> : null}
        <Image
          source={{ uri: imageUri }}
          style={[s.image, { opacity: loaded ? 1 : 0 }]}
          resizeMode={feedMode ? "cover" : "contain"}
          onLoad={onImageLoad}
          fadeDuration={0}
        />
      </View>
    </View>
  );
}

export const PostMedia = memo(PostMediaInner);
