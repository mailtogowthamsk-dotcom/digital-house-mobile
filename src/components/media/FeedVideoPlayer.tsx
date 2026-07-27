import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, StyleSheet, Pressable, Animated, Easing } from "react-native";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { useIsFocused } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { usePlaybackAllowed } from "../../hooks/usePlaybackAllowed";
import { useFeedAudioControls } from "../../hooks/useFeedAudioControls";
import { getFeedAudioMuted } from "../../media/feedAudioState";
import { registerFeedVideoPlayer, pauseOtherFeedVideos } from "../../media/feedVideoPlayback";
import { markVideoUriWarmed, isVideoUriWarmed } from "../../utils/videoUriWarmCache";
import { buildFeedVideoSource } from "../../utils/videoSource";
import {
  peekCachedVideoUri,
  resolveCachedVideoUri,
  isVideoFileCached
} from "../../utils/feedVideoFileCache";
import { stickySignedMediaUrl } from "../../utils/stickySignedUrlCache";
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
  /**
   * Previous clip kept mounted (paused) so scroll-back hits disk cache + warm decoder.
   * Never autoplays.
   */
  isRetain?: boolean;
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
  isRetain: boolean;
  style?: object;
  colors: { surfaceElevated: string };
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
        <Image
          source={{ uri: thumbnailUrl }}
          style={s.poster}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={thumbnailUrl ? thumbnailUrl.split("?")[0] : undefined}
        />
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
  isRetain,
  style,
  colors,
  onTogglePlayRef,
  onDoubleTapLike
}: ActivePlayerProps) {
  const playbackAllowed = usePlaybackAllowed();
  const { muted, toggleMute, setMuted } = useFeedAudioControls();
  const alreadyWarmed = isVideoUriWarmed(uri) || isVideoFileCached(uri) || uri.startsWith("file:");
  const [ready, setReady] = useState(alreadyWarmed);
  const [loading, setLoading] = useState(!alreadyWarmed);
  const [playing, setPlaying] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showPoster, setShowPoster] = useState(!alreadyWarmed || isPreload || isRetain);
  const userPausedRef = useRef(false);
  const aliveRef = useRef(true);
  const videoRef = useRef<VideoView | null>(null);
  const lastTapTime = useRef(0);
  const singleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    aliveRef.current = true;
    return () => {
      aliveRef.current = false;
    };
  }, []);

  const source = useMemo(() => buildFeedVideoSource(uri), [uri]);

  const player = useVideoPlayer(source, (p) => {
    p.loop = true;
    p.volume = 1;
    p.muted = getFeedAudioMuted();
    p.audioMixingMode = getFeedAudioMuted() ? "auto" : "doNotMix";
    try {
      // Prefer uninterrupted playback over aggressive prefetch (avoids stall after ~2s on slow links).
      p.bufferOptions = {
        preferredForwardBufferDuration: 8,
        waitsToMinimizeStalling: true,
        minBufferForPlayback: 0.8,
        prioritizeTimeOverSizeThreshold: true
      };
    } catch {
      /* older native builds */
    }
  });

  const shouldAutoplay = isActive && playbackAllowed && !isPreload && !isRetain;
  const shouldPlay = playbackAllowed && ((isActive && !isPreload && !isRetain) || fullscreen);
  const showLoader =
    (loading || !ready) &&
    !alreadyWarmed &&
    !isRetain &&
    !(uri.startsWith("file:") || uri.startsWith("/"));

  useEffect(() => {
    try {
      player.muted = muted;
      player.volume = 1;
      player.audioMixingMode = muted ? "auto" : "doNotMix";
    } catch {
      /* ignore */
    }
  }, [muted, player]);

  // Do not reset ready/loading when only active↔preload↔retain flags change.
  useEffect(() => {
    const warmed =
      isVideoUriWarmed(uri) || isVideoFileCached(uri) || uri.startsWith("file:");
    setReady(warmed);
    setLoading(!warmed);
    setShowPoster(!warmed || isPreload || isRetain);
  }, [uri]);

  useEffect(() => {
    if (isPreload || isRetain) {
      setShowPoster(true);
    }
  }, [isPreload, isRetain]);

  useEffect(() => {
    const statusSub = player.addListener("statusChange", (payload) => {
      const status = payload?.status;
      if (status === "readyToPlay") {
        setReady(true);
        setLoading(false);
        markVideoUriWarmed(uri);
      } else if (status === "loading") {
        if (!isVideoUriWarmed(uri)) setLoading(true);
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
        markVideoUriWarmed(uri);
      }
    });
    return () => {
      statusSub.remove();
      mutedSub.remove();
      playingSub.remove();
    };
  }, [player, setMuted, uri]);

  useEffect(() => {
    return registerFeedVideoPlayer(player, () => {
      try {
        player.pause();
      } catch (_) {}
    });
  }, [player]);

  useEffect(() => {
    if (!playbackAllowed && fullscreen) {
      try {
        void videoRef.current?.exitFullscreen();
      } catch {
        /* ignore */
      }
      setFullscreen(false);
    }
  }, [playbackAllowed, fullscreen]);

  useEffect(() => {
    if (!aliveRef.current) return;
    try {
      if (shouldPlay && !userPausedRef.current) {
        pauseOtherFeedVideos(player);
        player.play();
        if (shouldAutoplay) setShowPoster(false);
      } else if (!shouldPlay) {
        // Leaving active viewport — pause, but keep userPaused so resume stays intentional.
        player.pause();
        if ((isPreload || isRetain) && !isActive) setShowPoster(true);
      } else {
        // shouldPlay but user paused
        player.pause();
      }
    } catch {
      /* released */
    }
  }, [shouldPlay, shouldAutoplay, player, isPreload, isRetain, isActive]);

  useEffect(() => {
    return () => {
      try {
        player.pause();
      } catch {
        /* already released */
      }
    };
  }, [player]);

  const togglePlay = useCallback(() => {
    if (!playbackAllowed) return;
    if ((isPreload || isRetain) && !isActive) return;
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
  }, [player, playbackAllowed, isPreload, isRetain, isActive]);

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
    // Double-tap → like; single-tap → play / pause
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
      togglePlay();
    }, 280);
  }, [onDoubleTapLike, togglePlay]);

  const openNativeFullscreen = useCallback(async () => {
    if (!playbackAllowed) return;
    try {
      await videoRef.current?.enterFullscreen();
    } catch {
      /* unsupported */
    }
  }, [playbackAllowed]);

  const onFullscreenEnter = useCallback(() => {
    setFullscreen(true);
  }, []);

  const onFullscreenExit = useCallback(() => {
    setFullscreen(false);
    // Native fullscreen tears down its surface — resume inline if still active.
    if (!aliveRef.current) return;
    try {
      if (isActive && playbackAllowed && !userPausedRef.current) {
        pauseOtherFeedVideos(player);
        player.play();
        setShowPoster(false);
        setPlaying(true);
      }
    } catch {
      /* ignore */
    }
  }, [isActive, playbackAllowed, player]);

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
          borderRadius: 21,
          backgroundColor: "rgba(15,23,42,0.55)",
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: "rgba(255,255,255,0.28)",
          alignItems: "center",
          justifyContent: "center"
        },
        playGlyph: {
          width: 72,
          height: 72,
          borderRadius: 36,
          backgroundColor: "rgba(15,23,42,0.55)",
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: "rgba(255,255,255,0.35)",
          alignItems: "center",
          justifyContent: "center"
        }
      }),
    [height]
  );

  // Preload-only: warm disk cache / buffers, no VideoView (saves compositor work).
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

  const showPausedGlyph = !showLoader && !playing && ready && isActive && !isRetain;

  return (
    <View style={[s.wrap, style]}>
      <VideoView
        ref={videoRef}
        style={s.video}
        player={player}
        contentFit="cover"
        nativeControls={false}
        fullscreenOptions={{ enable: true, orientation: "default" }}
        onFullscreenEnter={onFullscreenEnter}
        onFullscreenExit={onFullscreenExit}
      />
      {showPoster && thumbnailUrl ? (
        <Image
          source={{ uri: thumbnailUrl }}
          style={s.poster}
          contentFit="cover"
          cachePolicy="memory-disk"
          recyclingKey={thumbnailUrl ? thumbnailUrl.split("?")[0] : undefined}
        />
      ) : null}
      {showLoader ? (
        <View
          style={[s.center, { backgroundColor: "rgba(15,23,42,0.28)" }]}
          pointerEvents="none"
        >
          <FeedVideoLoader />
        </View>
      ) : (
        <Pressable
          style={s.center}
          onPress={handleSurfacePress}
          accessibilityRole="button"
          accessibilityLabel={playing ? "Pause video" : "Play video"}
        >
          {showPausedGlyph ? (
            <View style={s.playGlyph} pointerEvents="none">
              <Ionicons name="play" size={30} color="rgba(255,255,255,0.96)" style={{ marginLeft: 3 }} />
            </View>
          ) : null}
        </Pressable>
      )}
      <View style={s.controlsBar} pointerEvents="box-none">
        <Pressable
          style={s.ctrlBtn}
          onPress={toggleMute}
          accessibilityRole="button"
          accessibilityLabel={muted ? "Unmute video" : "Mute video"}
        >
          <Ionicons name={muted ? "volume-mute" : "volume-high"} size={18} color="#fff" />
        </Pressable>
        <Pressable
          style={s.ctrlBtn}
          onPress={() => void openNativeFullscreen()}
          accessibilityRole="button"
          accessibilityLabel="Fullscreen"
        >
          <Ionicons name="expand" size={18} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

/**
 * Feed video with Instagram-like lifecycle:
 * - Poster only until active / preload / retain.
 * - expo-video `useCaching` — disk LRU; scroll-back should not re-download.
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
      isRetain = false,
      style,
      onRequestPlay,
      onDoubleTapLike
    },
    ref
  ) {
    const { colors } = useTheme();
    const isScreenFocused = useIsFocused();
    const togglePlayRef = useRef<(() => void) | null>(null);
    // Pick source once per remote URI. Never remount mid-play (no remote→file swap).
    const [bootUri, setBootUri] = useState(
      () => peekCachedVideoUri(uri) ?? stickySignedMediaUrl(uri) ?? uri
    );

    useEffect(() => {
      setBootUri(peekCachedVideoUri(uri) ?? stickySignedMediaUrl(uri) ?? uri);
    }, [uri]);

    // Disk pin only after scroll-away — never while active/preload (that stalled V1 / hung V2).
    useEffect(() => {
      if (!isRetain) return;
      void resolveCachedVideoUri(uri).then(() => markVideoUriWarmed(uri));
    }, [isRetain, uri]);

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

    // Active + retain only. Preload is poster-only (no parallel decoder/network vs current).
    const shouldMountPlayer = (isActive || isRetain) && isScreenFocused && !isPreload;

    if (isPreload && !isActive && isScreenFocused) {
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

    if (!shouldMountPlayer) {
      return (
        <VideoPosterShell
          thumbnailUrl={thumbnailUrl}
          height={height}
          style={style}
          colors={colors}
          showPlayIcon
          onPressPlay={onRequestPlay}
        />
      );
    }

    return (
      <ActiveFeedVideoPlayer
        key={stableBootKey(uri)}
        uri={bootUri}
        thumbnailUrl={thumbnailUrl}
        height={height}
        isActive={isActive}
        isPreload={false}
        isRetain={isRetain && !isActive}
        style={style}
        colors={colors}
        onTogglePlayRef={togglePlayRef}
        onDoubleTapLike={onDoubleTapLike}
      />
    );
  }
);

function stableBootKey(remoteOrLocal: string): string {
  const q = remoteOrLocal.indexOf("?");
  return q >= 0 ? remoteOrLocal.slice(0, q) : remoteOrLocal;
}

export const FeedVideoPlayer = memo(FeedVideoPlayerInner);
