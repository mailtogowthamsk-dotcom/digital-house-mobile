import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Modal,
  useWindowDimensions,
  StatusBar,
  Image,
  Animated,
  Easing
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { usePlaybackAllowed } from "../../hooks/usePlaybackAllowed";
import { useFeedAudioControls } from "../../hooks/useFeedAudioControls";
import { getFeedAudioMuted } from "../../media/feedAudioState";
import { registerFeedVideoPlayer, pauseOtherFeedVideos } from "../../media/feedVideoPlayback";

/** Feed-branded spinner — dark green / white / dark red (matches feed backdrop). */
function FeedVideoLoader({ size = 44 }: { size?: number }) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 850,
        easing: Easing.linear,
        useNativeDriver: true
      })
    );
    loop.start();
    return () => loop.stop();
  }, [spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"]
  });

  const ring = size;
  const pad = Math.max(4, Math.round(size * 0.14));

  return (
    <View
      style={{
        width: size + pad * 2,
        height: size + pad * 2,
        borderRadius: (size + pad * 2) / 2,
        backgroundColor: "rgba(15,23,42,0.35)",
        alignItems: "center",
        justifyContent: "center"
      }}
      accessibilityLabel="Loading video"
    >
      <Animated.View
        style={{
          width: ring,
          height: ring,
          borderRadius: ring / 2,
          borderWidth: 3.5,
          borderTopColor: "#166534",
          borderRightColor: "#FFFFFF",
          borderBottomColor: "#991B1B",
          borderLeftColor: "#FFFFFF",
          transform: [{ rotate }]
        }}
      />
    </View>
  );
}

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
  /** Invoked when the inactive poster play control is pressed. */
  onRequestPlay?: () => void;
  /** Double-tap like from the video surface (VideoView steals parent presses). */
  onDoubleTapLike?: () => void;
};

export type FeedVideoPlayerHandle = {
  togglePlay: () => void;
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
  onTogglePlayRef?: React.MutableRefObject<(() => void) | null>;
  onDoubleTapLike?: () => void;
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
          backgroundColor: "#0B1220",
          overflow: "hidden"
        },
        poster: { ...StyleSheet.absoluteFillObject },
        center: {
          ...StyleSheet.absoluteFillObject,
          alignItems: "center",
          justifyContent: "center"
        },
        playGlyph: {
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: "rgba(15,23,42,0.4)",
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: "rgba(255,255,255,0.3)",
          alignItems: "center",
          justifyContent: "center"
        }
      }),
    [height]
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
          <View style={s.playGlyph}>
            <Ionicons name="play" size={30} color="rgba(255,255,255,0.96)" style={{ marginLeft: 3 }} />
          </View>
        </Pressable>
      ) : showPlayIcon ? (
        <View style={s.center} pointerEvents="none">
          <View style={s.playGlyph}>
            <Ionicons name="play" size={30} color="rgba(255,255,255,0.96)" style={{ marginLeft: 3 }} />
          </View>
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
  screenHeight,
  onTogglePlayRef,
  onDoubleTapLike
}: ActivePlayerProps) {
  const playbackAllowed = usePlaybackAllowed();
  const { muted, toggleMute, setMuted } = useFeedAudioControls();
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showPoster, setShowPoster] = useState(true);
  const userPausedRef = useRef(false);
  const lastTapTime = useRef(0);
  const singleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.volume = 1;
    // Snapshot global preference at player create — effect keeps it in sync after.
    p.muted = getFeedAudioMuted();
    p.audioMixingMode = getFeedAudioMuted() ? "auto" : "doNotMix";
  });

  const shouldAutoplay = isActive && playbackAllowed && !isPreload;
  const shouldPlay = playbackAllowed && ((isActive && !isPreload) || fullscreen);
  const showLoader = loading || !ready;

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
    setReady(false);
    setLoading(true);
    setShowPoster(true);
  }, [uri]);

  useEffect(() => {
    const statusSub = player.addListener("statusChange", (payload) => {
      const status = payload?.status;
      if (status === "readyToPlay") {
        setReady(true);
        setLoading(false);
      } else if (status === "loading") {
        setLoading(true);
      } else if (status === "error") {
        setLoading(false);
      }
    });
    // Keep global preference aligned if native fullscreen controls change mute.
    const mutedSub = player.addListener("mutedChange", ({ muted: next }) => {
      setMuted(next);
    });
    const playingSub = player.addListener("playingChange", ({ isPlaying }) => {
      setPlaying(isPlaying);
      if (isPlaying) {
        setShowPoster(false);
        setLoading(false);
        setReady(true);
      }
    });
    return () => {
      statusSub.remove();
      mutedSub.remove();
      playingSub.remove();
    };
  }, [player, setMuted]);

  useEffect(() => {
    return registerFeedVideoPlayer(player, () => {
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
      if (shouldPlay && !userPausedRef.current) {
        pauseOtherFeedVideos(player);
        player.play();
        if (shouldAutoplay) setShowPoster(false);
      } else if (!shouldPlay) {
        userPausedRef.current = false;
        player.pause();
        if (isPreload && !isActive) setShowPoster(true);
      } else {
        // shouldPlay but user paused — keep paused
        player.pause();
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
        userPausedRef.current = true;
        player.pause();
        setPlaying(false);
      } else {
        userPausedRef.current = false;
        pauseOtherFeedVideos(player);
        player.play();
        setShowPoster(false);
        setPlaying(true);
      }
    } catch (_) {}
  }, [player, playbackAllowed, isPreload, isActive]);

  useEffect(() => {
    if (!onTogglePlayRef) return;
    onTogglePlayRef.current = togglePlay;
    return () => {
      if (onTogglePlayRef.current === togglePlay) {
        onTogglePlayRef.current = null;
      }
    };
  }, [onTogglePlayRef, togglePlay]);

  useEffect(
    () => () => {
      if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
    },
    []
  );

  const handleSurfacePress = useCallback(() => {
    const now = Date.now();
    // Double-tap like only — no single-tap play/pause (Instagram-style autoplay).
    if (onDoubleTapLike && now - lastTapTime.current < 280) {
      if (singleTapTimer.current) {
        clearTimeout(singleTapTimer.current);
        singleTapTimer.current = null;
      }
      lastTapTime.current = 0;
      onDoubleTapLike();
      return;
    }
    lastTapTime.current = now;
    if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
    singleTapTimer.current = setTimeout(() => {
      singleTapTimer.current = null;
    }, 280);
  }, [onDoubleTapLike]);

  const s = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          width: "100%",
          height,
          backgroundColor: "#0B1220",
          overflow: "hidden"
        },
        video: { width: "100%", height: "100%", backgroundColor: "#0B1220" },
        poster: { ...StyleSheet.absoluteFillObject },
        center: {
          ...StyleSheet.absoluteFillObject,
          alignItems: "center",
          justifyContent: "center"
        },
        controlsBar: {
          position: "absolute",
          right: 12,
          bottom: 12,
          flexDirection: "row",
          gap: 8,
          zIndex: 4
        },
        ctrlBtn: {
          width: 42,
          height: 42,
          borderRadius: 15,
          backgroundColor: "rgba(15,23,42,0.45)",
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: "rgba(255,255,255,0.25)",
          alignItems: "center",
          justifyContent: "center"
        },
        playGlyph: {
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: "rgba(15,23,42,0.4)",
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: "rgba(255,255,255,0.3)",
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
    [height, screenWidth, screenHeight]
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
        {showLoader ? (
          <View
            style={[s.center, { backgroundColor: "rgba(15,23,42,0.28)" }]}
            pointerEvents="none"
          >
            <FeedVideoLoader />
          </View>
        ) : (
          <Pressable style={s.center} onPress={handleSurfacePress}>
            {/* Autoplay — no play glyph; double-tap likes */}
          </Pressable>
        )}
        <View style={s.controlsBar} pointerEvents="box-none">
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
const FeedVideoPlayerInner = React.forwardRef<FeedVideoPlayerHandle, FeedVideoPlayerProps>(
  function FeedVideoPlayerInner(
    {
      uri,
      thumbnailUrl,
      height = 320,
      isActive = false,
      isPreload = false,
      style,
      onRequestPlay,
      onDoubleTapLike
    },
    ref
  ) {
    const { colors } = useTheme();
    const { width: screenWidth, height: screenHeight } = useWindowDimensions();
    const togglePlayRef = useRef<(() => void) | null>(null);

    useEffect(() => {
      if (!ref) return;
      const handle: FeedVideoPlayerHandle = {
        togglePlay: () => {
          if (togglePlayRef.current) {
            togglePlayRef.current();
            return;
          }
          onRequestPlay?.();
        }
      };
      if (typeof ref === "function") ref(handle);
      else ref.current = handle;
      return () => {
        if (typeof ref === "function") ref(null);
        else ref.current = null;
      };
    }, [ref, onRequestPlay]);

    const shouldMountPlayer = isActive || isPreload;

    if (!shouldMountPlayer) {
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
        onTogglePlayRef={togglePlayRef}
        onDoubleTapLike={onDoubleTapLike}
      />
    );
  }
);

export const FeedVideoPlayer = memo(FeedVideoPlayerInner);
