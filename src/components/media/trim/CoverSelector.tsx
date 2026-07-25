import React, { memo, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator
} from "react-native";
import * as VideoThumbnails from "expo-video-thumbnails";
import { spacing, radius } from "../../../theme/spacing";

type Props = {
  /** Video used to generate cover candidates (trimmed file preferred). */
  uri: string;
  durationSec: number;
  selectedMs: number;
  onSelect: (timeMs: number) => void;
  accentColor: string;
  textColor: string;
  mutedColor: string;
};

type Frame = { timeMs: number; uri: string };

/**
 * Cover / thumbnail frame picker after trim confirmation preview.
 */
function CoverSelectorInner({
  uri,
  durationSec,
  selectedMs,
  onSelect,
  accentColor,
  textColor,
  mutedColor
}: Props) {
  const [frames, setFrames] = useState<Frame[]>([]);
  const [loading, setLoading] = useState(true);

  const times = useMemo(() => {
    const durMs = Math.max(500, durationSec * 1000);
    const count = Math.min(12, Math.max(5, Math.floor(durationSec) + 1));
    const out: number[] = [];
    for (let i = 0; i < count; i++) {
      out.push(Math.floor((i / Math.max(1, count - 1)) * Math.max(0, durMs - 40)));
    }
    return out;
  }, [durationSec]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFrames([]);
    (async () => {
      const next: Frame[] = [];
      for (const timeMs of times) {
        try {
          const thumb = await VideoThumbnails.getThumbnailAsync(uri, {
            time: timeMs,
            quality: 0.55
          });
          if (cancelled) return;
          next.push({ timeMs, uri: thumb.uri });
        } catch {
          /* skip frame */
        }
      }
      if (!cancelled) {
        setFrames(next);
        setLoading(false);
        if (next.length > 0 && !next.some((f) => Math.abs(f.timeMs - selectedMs) < 80)) {
          onSelect(next[0].timeMs);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // intentionally not depending on selectedMs / onSelect to avoid reload loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uri, times]);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: textColor }]}>Cover photo</Text>
      <Text style={[styles.hint, { color: mutedColor }]}>
        Pick the frame that represents your clip
      </Text>
      {loading ? (
        <ActivityIndicator color={accentColor} style={{ marginVertical: spacing.md }} />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
          {frames.map((f) => {
            const active = Math.abs(f.timeMs - selectedMs) < 120;
            return (
              <Pressable
                key={f.timeMs}
                onPress={() => onSelect(f.timeMs)}
                style={[
                  styles.thumb,
                  active && { borderColor: accentColor, borderWidth: 2 }
                ]}
              >
                <Image source={{ uri: f.uri }} style={styles.img} />
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

export const CoverSelector = memo(CoverSelectorInner);

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  title: { fontSize: 15, fontWeight: "700" },
  hint: { fontSize: 12, marginTop: 2, marginBottom: spacing.sm },
  row: { gap: spacing.sm, paddingVertical: spacing.xs },
  thumb: {
    width: 72,
    height: 96,
    borderRadius: radius.md,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "transparent",
    backgroundColor: "rgba(255,255,255,0.08)"
  },
  img: { width: "100%", height: "100%" }
});
