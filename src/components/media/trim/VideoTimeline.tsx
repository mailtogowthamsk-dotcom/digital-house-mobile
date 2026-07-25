import React, { memo, useEffect, useMemo, useState } from "react";
import { View, Image, StyleSheet, ActivityIndicator } from "react-native";
import * as VideoThumbnails from "expo-video-thumbnails";
import { spacing, radius } from "../../../theme/spacing";

type Props = {
  uri: string;
  durationSec: number;
  /** Number of filmstrip frames. */
  frameCount?: number;
  height?: number;
};

/**
 * Filmstrip of thumbnails across the source video (for trim timeline).
 */
function VideoTimelineInner({ uri, durationSec, frameCount = 10, height = 56 }: Props) {
  const [frames, setFrames] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const timesMs = useMemo(() => {
    const durMs = Math.max(1, durationSec * 1000);
    const n = Math.max(4, frameCount);
    const out: number[] = [];
    for (let i = 0; i < n; i++) {
      const t = Math.min(durMs - 1, (i / Math.max(1, n - 1)) * durMs);
      out.push(Math.max(0, Math.floor(t)));
    }
    return out;
  }, [durationSec, frameCount]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFrames([]);
    (async () => {
      const uris: string[] = [];
      for (const t of timesMs) {
        try {
          const thumb = await VideoThumbnails.getThumbnailAsync(uri, {
            time: t,
            quality: 0.35
          });
          if (cancelled) return;
          uris.push(thumb.uri);
        } catch {
          uris.push("");
        }
      }
      if (!cancelled) {
        setFrames(uris);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [uri, timesMs]);

  return (
    <View style={[styles.row, { height }]}>
      {loading && frames.length === 0 ? (
        <View style={styles.loading}>
          <ActivityIndicator color="#fff" />
        </View>
      ) : (
        frames.map((src, i) =>
          src ? (
            <Image key={`${src}-${i}`} source={{ uri: src }} style={styles.frame} />
          ) : (
            <View key={`empty-${i}`} style={[styles.frame, styles.frameEmpty]} />
          )
        )
      )}
    </View>
  );
}

export const VideoTimeline = memo(VideoTimelineInner);

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    overflow: "hidden",
    borderRadius: radius.sm,
    backgroundColor: "rgba(255,255,255,0.06)"
  },
  frame: { flex: 1, height: "100%" },
  frameEmpty: { backgroundColor: "rgba(255,255,255,0.08)" },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center"
  }
});
