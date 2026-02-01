import React, { useState, useEffect, useCallback } from "react";
import { View, StyleSheet, Image } from "react-native";
import { WebView } from "react-native-webview";
import { getImageUrl } from "../../api/client";
import { isYouTubeUrl, getYouTubeEmbedUrl } from "../../utils/youtube";
import { colors } from "../../theme/colors";

/** Same max height as CreatePostScreen preview – post image matches create preview size */
const IMAGE_MAX_HEIGHT = 400;
const IMAGE_PLACEHOLDER_HEIGHT = 200;

type PostMediaProps = {
  /** Raw media URL from API (image URL or YouTube sharing link) */
  mediaUrl: string | null | undefined;
  /** Height for YouTube embed only; images use aspect ratio (same as create preview) */
  height?: number;
  /** Optional style for the container */
  style?: object;
};

/**
 * Renders post media: YouTube embed (playable) or image.
 * Images use same aspect-ratio logic as CreatePostScreen preview: full width, height from dimensions, max 400px.
 */
export function PostMedia({ mediaUrl, height = 220, style }: PostMediaProps) {
  const raw = mediaUrl?.trim();
  const [containerWidth, setContainerWidth] = useState<number | null>(null);
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);

  const imageUri = raw && !isYouTubeUrl(raw) ? getImageUrl(raw) : null;

  useEffect(() => {
    if (!imageUri) {
      setImageDimensions(null);
      return;
    }
    let cancelled = false;
    Image.getSize(
      imageUri,
      (w, h) => {
        if (!cancelled) setImageDimensions({ width: w, height: h });
      },
      () => {
        if (!cancelled) setImageDimensions({ width: 1, height: 1 });
      }
    );
    return () => {
      cancelled = true;
    };
  }, [imageUri]);

  const onLayout = useCallback((e: { nativeEvent: { layout: { width: number } } }) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setContainerWidth(w);
  }, []);

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

  const imageHeight =
    containerWidth != null && imageDimensions
      ? Math.min(containerWidth * (imageDimensions.height / imageDimensions.width), IMAGE_MAX_HEIGHT)
      : IMAGE_PLACEHOLDER_HEIGHT;

  return (
    <View style={[s.wrapOuter, style]} onLayout={onLayout}>
      <View style={[s.wrap, { height: imageHeight }]}>
        <Image source={{ uri: imageUri }} style={s.image} resizeMode="contain" />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  wrapOuter: {
    width: "100%"
  },
  wrap: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: colors.surfaceElevated
  },
  webview: {
    flex: 1,
    width: "100%",
    backgroundColor: "transparent"
  },
  image: {
    width: "100%",
    height: "100%"
  }
});
