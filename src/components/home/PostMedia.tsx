import React from "react";
import { View, StyleSheet, Image } from "react-native";
import { WebView } from "react-native-webview";
import { getImageUrl } from "../../api/client";
import { isYouTubeUrl, getYouTubeEmbedUrl } from "../../utils/youtube";

type PostMediaProps = {
  /** Raw media URL from API (image URL or YouTube sharing link) */
  mediaUrl: string | null | undefined;
  /** Height for the media area (card vs detail can use different heights) */
  height?: number;
  /** Optional style for the container */
  style?: object;
};

/**
 * Renders post media: YouTube embed (playable) or image.
 * YouTube: youtu.be/..., youtube.com/watch?v=... → embedded WebView player.
 * Other URLs → Image (with getImageUrl for relative/Drive URLs).
 */
export function PostMedia({ mediaUrl, height = 220, style }: PostMediaProps) {
  const raw = mediaUrl?.trim();
  if (!raw) return null;

  if (isYouTubeUrl(raw)) {
    const embedUrl = getYouTubeEmbedUrl(raw);
    if (!embedUrl) return null;
    // Embed params: playsinline (iOS), rel=0, modestbranding
    const embedUri = `${embedUrl}?playsinline=1&rel=0&modestbranding=1`;
    // Load embed URL directly so video plays reliably; minimal player UI (no search in embed)
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

  const imageUri = getImageUrl(raw);
  if (!imageUri) return null;
  return (
    <View style={[s.wrap, { height }, style]}>
      <Image source={{ uri: imageUri }} style={s.image} resizeMode="cover" />
    </View>
  );
}

const s = StyleSheet.create({
  wrap: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "#000"
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
