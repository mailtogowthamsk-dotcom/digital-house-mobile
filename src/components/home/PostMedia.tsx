import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import { View, StyleSheet, Image, useWindowDimensions } from "react-native";
import { WebView } from "react-native-webview";
import { getImageUrl } from "../../api/client";
import { isYouTubeUrl, getYouTubeEmbedUrl } from "../../utils/youtube";
import { useTheme } from "../../theme/ThemeContext";
import { Shimmer } from "../ui/Shimmer";
import {
  DEFAULT_FEED_ASPECT_RATIO,
  getCachedAspectRatio,
  prefetchAspectRatio,
  setCachedAspectRatio
} from "../../utils/imageDimensions";

const IMAGE_MAX_HEIGHT = 520;
const YOUTUBE_HEIGHT = 220;

type PostMediaProps = {
  mediaUrl: string | null | undefined;
  height?: number;
  style?: object;
  /** Full-bleed feed image (cover, edge-to-edge) */
  feedMode?: boolean;
};

function PostMediaInner({ mediaUrl, height = YOUTUBE_HEIGHT, style, feedMode = false }: PostMediaProps) {
  const { colors } = useTheme();
  const { width: screenWidth } = useWindowDimensions();
  const raw = mediaUrl?.trim();
  const imageUri = raw && !isYouTubeUrl(raw) ? getImageUrl(raw) : null;

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

  if (!raw) return null;

  if (isYouTubeUrl(raw)) {
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
