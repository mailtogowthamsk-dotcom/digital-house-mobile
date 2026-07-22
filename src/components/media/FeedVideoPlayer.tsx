import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Modal,
  useWindowDimensions,
  StatusBar,
  Image
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { usePlaybackAllowed } from "../../hooks/usePlaybackAllowed";
import { useFeedAudioControls } from "../../hooks/useFeedAudioControls";
import { getFeedAudioMuted } from "../../media/feedAudioState";
import { registerFeedVideoPlayer, pauseAllFeedVideos } from "../../media/feedVideoPlayback";

type FeedVideoPlayerProps = {
  uri: string;
  thumbnailUrl?: string | null;
  height?: number;
  /** When true, this is the single autoplay candidate in the viewport. */
  isActive?: boolean;
  /**
   * Mount a paused player to warm buffers for the next likely video.
   * Must never autoplay — only the active item plays.
   */
  isPreload?: boolean;
  style?: object;
};

type ActivePlayerProps = {
  uri: string;
  thumbnailUrl?: string | null;
  height: number;
  isActive: boolean;
  isPreload: boolean;
  style?: object;
  colors: { surfaceElevated: string };
  screenWidth: number;
  screenHeight: number;
};

/**
 * Poster-only shell — no native VideoPlayer / decoder until mounted.
 */
function VideoPosterShell({
  thumbnailUrl,
  height,
  style,
  colors,
  onPressPlay,
  showPlayIcon = true
}: {
  thumbnailUrl?: string | null;
  height: number;
  style?: object;
  colors: { surfaceElevated: string };
  onPressPlay?: () => void;
  /** Decorative play glyph when not interactive (e.g. off-screen poster). */
  showPlayIcon?: boolean;
}) {
  const s = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          width: "100%",
          height,
          backgroundColor: colors.surfaceElevated,
          overflow: "hidden"
        },
        poster: { ...StyleSheet.absoluteFillObject },
        center: {
          ...StyleSheet.absoluteFillObject,
          alignItems: "center",
          justifyContent: "center"
        }
      }),
    [colors.surfaceElevated, height]
  );

  return (
    <View style={[s.wrap, style]}>
      {thumbnailUrl ? (
        <Image source={{ uri: thumbnailUrl }} style={s.poster} resizeMode="cover" />
      ) : null}
      {onPressPlay ? (
        <Pressable
          style={s.center}
          onPress={onPressPlay}
          accessibilityRole="button"
          accessibilityLabel="Play video"
        >
          <Ionicons name="play-circle" size={64} color="rgba(255,255,255,0.92)" />
        </Pressable>
      ) : showPlayIcon ? (
        <View style={s.center} pointerEvents="none">
          <Ionicons name="play-circle" size={64} color="rgba(255,255,255,0.92)" />
        </View>
      ) : null}
    </View>
  );
}

/**
 * Native player — only mounted when active or preloading.
 * Mute follows the feed-wide audio preference (not per-video state).
 */
function ActiveFeedVideoPlayer({
  uri,
  thumbnailUrl,
  height,
  isActive,
  isPreload,
  style,
  colors,
  screenWidth,
  screenHeight
}: ActivePlayerProps) {
  const playbackAllowed = usePlaybackAllowed();
  const { muted, toggleMute, setMuted } = useFeedAudioControls();
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showPoster, setShowPoster] = useState(true);

  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.volume = 1;
    // Snapshot global preference at player create — effect keeps it in sync after.
    p.muted = getFeedAudioMuted();
    p.audioMixingMode = getFeedAudioMuted() ? "auto" : "doNotMix";
  });

  const shouldAutoplay = isActive && playbackAllowed && !isPreload;
  const shouldPlay = playbackAllowed && ((isActive && !isPreload) || fullscreen);

  useEffect(() => {
    try {
      player.muted = muted;
      player.volume = 1;
      player.audioMixingMode = muted ? "auto" : "doNotMix";
    } catch {
      /* ignore */
    }
  }, [muted, player]);

  useEffect(() => {
    const statusSub = player.addListener("statusChange", (status) => {
      if (status.status === "readyToPlay") setReady(true);
    });
    // Keep global preference aligned if native fullscreen controls change mute.
    const mutedSub = player.addListener("mutedChange", ({ muted: next }) => {
      setMuted(next);
    });
    const playingSub = player.addListener("playingChange", ({ isPlaying }) => {
      setPlaying(isPlaying);
      if (isPlaying) setShowPoster(false);
    });
    return () => {
      statusSub.remove();
      mutedSub.remove();
      playingSub.remove();
    };
  }, [player, setMuted]);

  useEffect(() => {
    return registerFeedVideoPlayer(() => {
      try {
        player.pause();
      } catch (_) {}
    });
  }, [player]);

  useEffect(() => {
    if (!playbackAllowed && fullscreen) {
      setFullscreen(false);
    }
  }, [playbackAllowed, fullscreen]);

  useEffect(() => {
    try {
      if (shouldPlay) {
        pauseAllFeedVideos();
        player.play();
        if (shouldAutoplay) setShowPoster(false);
      } else {
        player.pause();
        if (isPreload && !isActive) setShowPoster(true);
      }
    } catch (_) {}
  }, [shouldPlay, shouldAutoplay, player, isPreload, isActive]);

  useEffect(() => {
    return () => {
      try {
        player.pause();
        void player.replaceAsync?.(null as any);
      } catch (_) {
        try {
          player.replace?.(null as any);
        } catch {
          /* ignore */
        }
      }
    };
  }, [player]);

  const togglePlay = useCallback(() => {
    if (!playbackAllowed) return;
    if (isPreload && !isActive) return;
    try {
      if (player.playing) {
        player.pause();
      } else {
        player.play();
        setShowPoster(false);
      }
    } catch (_) {}
  }, [player, playbackAllowed, isPreload, isActive]);

  const s = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          width: "100%",
          height,
          backgroundColor: colors.surfaceElevated,
          overflow: "hidden"
        },
        video: { width: "100%", height: "100%" },
        poster: { ...StyleSheet.absoluteFillObject },
        center: {
          ...StyleSheet.absoluteFillObject,
          alignItems: "center",
          justifyContent: "center"
        },
        controls: {
          position: "absolute",
          right: 10,
          bottom: 10,
          flexDirection: "row",
          gap: 8
        },
        ctrlBtn: {
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: "rgba(0,0,0,0.55)",
          alignItems: "center",
          justifyContent: "center"
        },
        fsWrap: {
          flex: 1,
          backgroundColor: "#000",
          justifyContent: "center"
        },
        fsVideo: { width: screenWidth, height: screenHeight },
        fsControls: {
          position: "absolute",
          top: 48,
          right: 16,
          flexDirection: "row",
          gap: 8
        }
      }),
    [colors.surfaceElevated, height, screenWidth, screenHeight]
  );

  // Preload-only: warm buffers, no VideoView (saves compositor work).
  // No audio-state subscription needed — poster shell has no mute control.
  if (isPreload && !isActive) {
    return (
      <VideoPosterShell
        thumbnailUrl={thumbnailUrl}
        height={height}
        style={style}
        colors={colors}
        showPlayIcon={false}
      />
    );
  }

  return (
    <>
      <View style={[s.wrap, style]}>
        <VideoView
          style={s.video}
          player={player}
          contentFit="cover"
          nativeControls={false}
          allowsFullscreen={false}
        />
        {showPoster && thumbnailUrl ? (
          <Image source={{ uri: thumbnailUrl }} style={s.poster} resizeMode="cover" />
        ) : null}
        {!ready ? (
          <View style={s.center}>
            <ActivityIndicator color="#fff" />
          </View>
        ) : null}
        <Pressable style={s.center} onPress={togglePlay}>
          {!playing ? (
            <Ionicons name="play-circle" size={64} color="rgba(255,255,255,0.92)" />
          ) : null}
        </Pressable>
        <View style={s.controls}>
          <Pressable
            style={s.ctrlBtn}
            onPress={toggleMute}
            accessibilityRole="button"
            accessibilityLabel={muted ? "Unmute video" : "Mute video"}
          >
            <Ionicons
              name={muted ? "volume-mute" : "volume-high"}
              size={18}
              color="#fff"
            />
          </Pressable>
          <Pressable
            style={s.ctrlBtn}
            onPress={() => {
              if (!playbackAllowed) return;
              setFullscreen(true);
            }}
            accessibilityRole="button"
            accessibilityLabel="Fullscreen"
          >
            <Ionicons name="expand" size={18} color="#fff" />
          </Pressable>
        </View>
      </View>

      <Modal visible={fullscreen} animationType="fade" onRequestClose={() => setFullscreen(false)}>
        <StatusBar hidden />
        <View style={s.fsWrap}>
          <VideoView
            style={s.fsVideo}
            player={player}
            contentFit="contain"
            nativeControls
            allowsFullscreen
          />
          <View style={s.fsControls}>
            <Pressable
              style={s.ctrlBtn}
              onPress={toggleMute}
              accessibilityRole="button"
              accessibilityLabel={muted ? "Unmute video" : "Mute video"}
            >
              <Ionicons
                name={muted ? "volume-mute" : "volume-high"}
                size={18}
                color="#fff"
              />
            </Pressable>
            <Pressable
              style={s.ctrlBtn}
              onPress={() => setFullscreen(false)}
              accessibilityRole="button"
              accessibilityLabel="Close fullscreen"
            >
              <Ionicons name="close" size={20} color="#fff" />
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
}

/**
 * Feed video with Instagram-like lifecycle:
 * - Poster only until active / preload.
 * - Unmount releases the native player (memory).
 * - Mute is feed-global (see feedAudioState) — not per video.
 */
function FeedVideoPlayerInner({
  uri,
  thumbnailUrl,
  height = 320,
  isActive = false,
  isPreload = false,
  style
}: FeedVideoPlayerProps) {
  const { colors } = useTheme();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const shouldMountPlayer = isActive || isPreload;

  if (!shouldMountPlayer) {
    return (
      <VideoPosterShell
        thumbnailUrl={thumbnailUrl}
        height={height}
        style={style}
        colors={colors}
        showPlayIcon
      />
    );
  }

  return (
    <ActiveFeedVideoPlayer
      uri={uri}
      thumbnailUrl={thumbnailUrl}
      height={height}
      isActive={isActive}
      isPreload={isPreload && !isActive}
      style={style}
      colors={colors}
      screenWidth={screenWidth}
      screenHeight={screenHeight}
    />
  );
}

export const FeedVideoPlayer = memo(FeedVideoPlayerInner);
