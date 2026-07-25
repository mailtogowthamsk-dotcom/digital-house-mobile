import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import Ionicons from "@expo/vector-icons/Ionicons";
import { formatBytes, formatDuration } from "../../../config/media.config";
import { spacing, radius } from "../../../theme/spacing";

type Props = {
  uri: string;
  durationSec: number | null;
  width: number | null;
  height: number | null;
  fileSize: number | null;
  accentColor: string;
  textColor: string;
  mutedColor: string;
  surfaceColor: string;
};

/**
 * Custom in-app video preview (not the OS player UI).
 * V1: play / pause / seek / mute.
 * Future: optional trimStartSec / trimEndSec / coverFrameMs without redesign.
 */
function PreviewVideoPlayerInner({
  uri,
  durationSec,
  width,
  height,
  fileSize,
  accentColor,
  textColor,
  mutedColor,
  surfaceColor
}: Props) {
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [positionSec, setPositionSec] = useState(0);
  const [trackedDuration, setTrackedDuration] = useState(durationSec ?? 0);
  const [barWidth, setBarWidth] = useState(0);

  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = false;
  });

  useEffect(() => {
    player.muted = muted;
  }, [muted, player]);

  useEffect(() => {
    const statusSub = player.addListener("statusChange", (payload: { status?: string } | string) => {
      const status = typeof payload === "string" ? payload : payload?.status;
      if (status === "readyToPlay") {
        setReady(true);
        try {
          if (player.duration > 0) setTrackedDuration(player.duration);
        } catch {
          /* ignore */
        }
      }
    });
    const playingSub = player.addListener("playingChange", ({ isPlaying }: { isPlaying: boolean }) => {
      setPlaying(isPlaying);
    });

    const tick = setInterval(() => {
      try {
        setPositionSec(player.currentTime || 0);
        if (player.duration > 0) setTrackedDuration(player.duration);
      } catch {
        /* player released */
      }
    }, 250);

    return () => {
      statusSub.remove();
      playingSub.remove();
      clearInterval(tick);
      try {
        player.pause();
      } catch {
        /* unmount */
      }
    };
  }, [player]);

  const togglePlay = useCallback(() => {
    if (playing) player.pause();
    else player.play();
  }, [playing, player]);

  const toggleMute = useCallback(() => {
    setMuted((m) => !m);
  }, []);

  const seekToRatio = useCallback(
    (ratio: number) => {
      const dur = trackedDuration > 0 ? trackedDuration : durationSec ?? 0;
      if (dur <= 0) return;
      const t = Math.max(0, Math.min(dur, ratio * dur));
      try {
        player.currentTime = t;
        setPositionSec(t);
      } catch {
        /* seek unavailable */
      }
    },
    [durationSec, player, trackedDuration]
  );

  const resolutionLabel =
    width != null && height != null && width > 0 && height > 0
      ? `${width}×${height}`
      : "—";

  const durationLabel = formatDuration(
    trackedDuration > 0 ? trackedDuration : durationSec ?? 0
  );

  const meta = useMemo(
    () =>
      [
        durationLabel,
        resolutionLabel,
        fileSize != null && fileSize > 0 ? formatBytes(fileSize) : null
      ]
        .filter(Boolean)
        .join("  ·  "),
    [durationLabel, fileSize, resolutionLabel]
  );

  return (
    <View style={styles.root}>
      <View style={styles.stage}>
        <VideoView
          style={StyleSheet.absoluteFill}
          player={player}
          contentFit="contain"
          nativeControls={false}
          allowsFullscreen={false}
          allowsPictureInPicture={false}
        />
        {!ready ? (
          <View style={styles.loading}>
            <ActivityIndicator color="#fff" />
          </View>
        ) : null}
        <Pressable style={styles.centerHit} onPress={togglePlay}>
          {!playing ? (
            <View style={styles.playOrb}>
              <Ionicons name="play" size={36} color="#fff" />
            </View>
          ) : null}
        </Pressable>
      </View>

      <View style={styles.controls}>
        <Pressable onPress={togglePlay} hitSlop={10} style={styles.iconBtn}>
          <Ionicons name={playing ? "pause" : "play"} size={22} color="#fff" />
        </Pressable>

        <Text style={[styles.time, { color: mutedColor }]}>
          {formatDuration(positionSec)}
        </Text>

        <Pressable
          style={styles.seekTrack}
          onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}
          onPress={(e) => {
            if (barWidth <= 0) return;
            seekToRatio(e.nativeEvent.locationX / barWidth);
          }}
        >
          <View style={[styles.seekBg, { backgroundColor: "rgba(255,255,255,0.2)" }]} />
          <View
            style={[
              styles.seekFill,
              {
                backgroundColor: accentColor,
                width: `${
                  trackedDuration > 0
                    ? Math.min(100, (positionSec / trackedDuration) * 100)
                    : 0
                }%` as `${number}%`
              }
            ]}
          />
        </Pressable>

        <Text style={[styles.time, { color: mutedColor }]}>{durationLabel}</Text>

        <Pressable onPress={toggleMute} hitSlop={10} style={styles.iconBtn}>
          <Ionicons
            name={muted ? "volume-mute" : "volume-high"}
            size={22}
            color="#fff"
          />
        </Pressable>
      </View>

      <View style={[styles.metaCard, { backgroundColor: surfaceColor }]}>
        <Text style={[styles.metaText, { color: textColor }]}>{meta}</Text>
        <Text style={[styles.metaHint, { color: mutedColor }]}>
          Tip: use Trim for a shorter clip · Max 60 seconds
        </Text>
      </View>
    </View>
  );
}

export const PreviewVideoPlayer = memo(PreviewVideoPlayerInner);

const styles = StyleSheet.create({
  root: { flex: 1 },
  stage: {
    flex: 1,
    backgroundColor: "#000",
    overflow: "hidden"
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.35)"
  },
  centerHit: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center"
  },
  playOrb: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 4
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)"
  },
  time: { fontSize: 12, fontWeight: "600", minWidth: 36, textAlign: "center" },
  seekTrack: {
    flex: 1,
    height: 28,
    justifyContent: "center"
  },
  seekBg: {
    height: 4,
    borderRadius: 2,
    width: "100%"
  },
  seekFill: {
    position: "absolute",
    left: 0,
    height: 4,
    borderRadius: 2
  },
  metaCard: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  metaText: { fontSize: 13, fontWeight: "600" },
  metaHint: { fontSize: 12, marginTop: 4 }
});
