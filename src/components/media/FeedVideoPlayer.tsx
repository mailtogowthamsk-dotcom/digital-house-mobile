import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
  Modal,
  StatusBar,
  useWindowDimensions
} from "react-native";
import { Image } from "expo-image";
import { useVideoPlayer, VideoView } from "expo-video";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  isVideoFileCached
} from "../../utils/feedVideoFileCache";
import { stickySignedMediaUrl } from "../../utils/stickySignedUrlCache";
import { FeedMediaLoader } from "./FeedMediaLoader";

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
 * Native player — mounted for active OR retained (previous) clip.
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
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const alreadyWarmed = isVideoUriWarmed(uri) || isVideoFileCached(uri) || uri.startsWith("file:");
  const [ready, setReady] = useState(alreadyWarmed);
  const [loading, setLoading] = useState(!alreadyWarmed);
  const [playing, setPlaying] = useState(false);
  const [errored, setErrored] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  /**
   * The poster covers the surface from mount until the decoder paints, cached or
   * not — a `VideoView` renders black before its first frame, which is the blink
   * seen on scroll-back. It cross-fades out exactly once per mount and never
   * re-appears while mounted, so active↔retain never flashes the thumbnail.
   */
  const [posterMounted, setPosterMounted] = useState(true);
  const hasPaintedFrameRef = useRef(false);
  const userPausedRef = useRef(false);
  const aliveRef = useRef(true);
  const lastTapTime = useRef(0);
  const singleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const posterOpacity = useRef(new Animated.Value(1)).current;

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

  const shouldPlay = playbackAllowed && ((isActive && !isPreload && !isRetain) || fullscreen);
  const shouldPlayRef = useRef(shouldPlay);
  shouldPlayRef.current = shouldPlay;

  /**
   * On a cold open the active clip mounts before its source is loaded, so the
   * mount-time `play()` is dropped by the native player and nothing retries it.
   * Re-assert playback whenever the player reports it can actually start.
   */
  const ensurePlaying = useCallback(() => {
    if (!aliveRef.current || !shouldPlayRef.current || userPausedRef.current) return;
    try {
      if (player.playing) return;
      pauseOtherFeedVideos(player);
      player.play();
    } catch {
      /* released */
    }
  }, [player]);

  // Loader only for cold network first paint — never on cached / painted / retain.
  const showLoader =
    !hasPaintedFrameRef.current &&
    (loading || !ready) &&
    !alreadyWarmed &&
    !(uri.startsWith("file:") || uri.startsWith("/"));

  const hidePosterSmoothly = useCallback(() => {
    setReady(true);
    setLoading(false);
    if (hasPaintedFrameRef.current) return;
    hasPaintedFrameRef.current = true;
    markVideoUriWarmed(uri);
    Animated.timing(posterOpacity, {
      toValue: 0,
      duration: 160,
      easing: Easing.out(Easing.quad),
      useNativeDriver: true
    }).start(({ finished }) => {
      if (finished) setPosterMounted(false);
    });
  }, [posterOpacity, uri]);

  useEffect(() => {
    try {
      player.muted = muted;
      player.volume = 1;
      player.audioMixingMode = muted ? "auto" : "doNotMix";
    } catch {
      /* ignore */
    }
  }, [muted, player]);

  // Reset visual gates only when the URI identity changes — not on active↔retain.
  // Warmth suppresses the loader, never the poster: the poster is what hides the
  // black surface until the decoder paints.
  useEffect(() => {
    const warmed =
      isVideoUriWarmed(uri) || isVideoFileCached(uri) || uri.startsWith("file:");
    hasPaintedFrameRef.current = false;
    setReady(warmed);
    setLoading(!warmed);
    setErrored(false);
    setPosterMounted(true);
    posterOpacity.setValue(1);
  }, [uri, posterOpacity]);

  useEffect(() => {
    const statusSub = player.addListener("statusChange", (payload) => {
      const status = payload?.status;
      if (status === "readyToPlay") {
        hidePosterSmoothly();
        ensurePlaying();
      } else if (status === "loading") {
        if (!hasPaintedFrameRef.current && !isVideoUriWarmed(uri)) setLoading(true);
      } else if (status === "error") {
        setLoading(false);
        setErrored(true);
      }
    });
    const mutedSub = player.addListener("mutedChange", ({ muted: next }) => {
      setMuted(next);
    });
    const playingSub = player.addListener("playingChange", ({ isPlaying }) => {
      setPlaying(isPlaying);
      if (isPlaying) hidePosterSmoothly();
    });
    // The source can already be ready before these listeners attach.
    try {
      if (player.status === "readyToPlay") {
        hidePosterSmoothly();
        ensurePlaying();
      }
    } catch {
      /* released */
    }
    return () => {
      statusSub.remove();
      mutedSub.remove();
      playingSub.remove();
    };
  }, [player, setMuted, uri, hidePosterSmoothly, ensurePlaying]);

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
    if (!aliveRef.current) return;
    if (shouldPlay) {
      // Do not force poster off here before a frame — hidePosterSmoothly handles it.
      // If the source is not loaded yet this is a no-op; `statusChange` re-asserts it.
      ensurePlaying();
      return;
    }
    try {
      // Scroll away / retain: pause only. Keep last decoded frame visible (no poster).
      player.pause();
    } catch {
      /* released */
    }
  }, [shouldPlay, player, ensurePlaying]);

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
    if ((isPreload || isRetain) && !isActive && !fullscreen) return;
    try {
      if (player.playing) {
        userPausedRef.current = true;
        player.pause();
        setPlaying(false);
      } else {
        userPausedRef.current = false;
        pauseOtherFeedVideos(player);
        player.play();
        hidePosterSmoothly();
        setPlaying(true);
      }
    } catch (_) {}
  }, [player, playbackAllowed, isPreload, isRetain, isActive, fullscreen, hidePosterSmoothly]);

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

  const openFullscreen = useCallback(() => {
    if (!playbackAllowed) return;
    setFullscreen(true);
  }, [playbackAllowed]);

  const closeFullscreen = useCallback(() => {
    setFullscreen(false);
    if (!aliveRef.current) return;
    try {
      if (isActive && playbackAllowed && !userPausedRef.current) {
        pauseOtherFeedVideos(player);
        player.play();
        hidePosterSmoothly();
        setPlaying(true);
      }
    } catch {
      /* ignore */
    }
  }, [isActive, playbackAllowed, player, hidePosterSmoothly]);

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
        },
        fsRoot: {
          flex: 1,
          backgroundColor: "#000",
          justifyContent: "center",
          alignItems: "center"
        },
        fsVideo: {
          width: screenWidth,
          height: screenHeight,
          backgroundColor: "#000"
        },
        fsTopBar: {
          position: "absolute",
          left: 0,
          right: 0,
          flexDirection: "row",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 10,
          paddingHorizontal: 16,
          zIndex: 8
        },
        fsBtn: {
          width: 44,
          height: 44,
          borderRadius: 22,
          backgroundColor: "rgba(15,23,42,0.72)",
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: "rgba(255,255,255,0.32)",
          alignItems: "center",
          justifyContent: "center"
        }
      }),
    [height, screenWidth, screenHeight]
  );

  // Preload-only path should not reach here — parent keeps poster shell.
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

  const posterVisible = posterMounted && Boolean(thumbnailUrl);
  // Never show the paused affordance while the poster still covers the surface —
  // a warm remount is `ready` before it is `playing`, which flashed the glyph.
  // A failed source keeps the poster, so it still needs the retry affordance.
  const showPausedGlyph =
    !showLoader && (!posterVisible || errored) && !playing && ready && isActive && !isRetain;
  const showFsPausedGlyph = !showLoader && !playing && ready;

  return (
    <>
      <View style={[s.wrap, style]}>
        {!fullscreen ? (
          <VideoView
            style={s.video}
            player={player}
            contentFit="cover"
            nativeControls={false}
            fullscreenOptions={{ enable: false }}
          />
        ) : (
          <View style={s.video} />
        )}
        {posterVisible && !fullscreen ? (
          <Animated.View style={[s.poster, { opacity: posterOpacity }]} pointerEvents="none">
            <Image
              source={{ uri: thumbnailUrl }}
              style={s.poster}
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey={thumbnailUrl?.split("?")[0]}
            />
          </Animated.View>
        ) : null}
        {showLoader && !fullscreen ? (
          <View
            style={[s.center, { backgroundColor: "rgba(15,23,42,0.28)" }]}
            pointerEvents="none"
          >
            <FeedMediaLoader accessibilityLabel="Loading video" />
          </View>
        ) : !fullscreen ? (
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
        ) : null}
        {!fullscreen ? (
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
              onPress={openFullscreen}
              accessibilityRole="button"
              accessibilityLabel="Fullscreen"
            >
              <Ionicons name="expand" size={18} color="#fff" />
            </Pressable>
          </View>
        ) : null}
      </View>

      {fullscreen ? (
        <Modal
          visible
          animationType="fade"
          presentationStyle="fullScreen"
          supportedOrientations={["portrait", "landscape", "landscape-left", "landscape-right"]}
          onRequestClose={closeFullscreen}
          statusBarTranslucent
        >
          <StatusBar hidden />
          <View style={s.fsRoot}>
            <VideoView
              style={s.fsVideo}
              player={player}
              contentFit="contain"
              nativeControls={false}
              fullscreenOptions={{ enable: false }}
            />
            <Pressable
              style={StyleSheet.absoluteFillObject}
              onPress={handleSurfacePress}
              accessibilityRole="button"
              accessibilityLabel={playing ? "Pause video" : "Play video"}
            >
              {showFsPausedGlyph ? (
                <View style={s.center} pointerEvents="none">
                  <View style={s.playGlyph}>
                    <Ionicons name="play" size={30} color="rgba(255,255,255,0.96)" style={{ marginLeft: 3 }} />
                  </View>
                </View>
              ) : null}
            </Pressable>
            <View
              style={[s.fsTopBar, { top: Math.max(insets.top, 12) + 4 }]}
              pointerEvents="box-none"
            >
              <Pressable
                style={s.fsBtn}
                onPress={toggleMute}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={muted ? "Unmute video" : "Mute video"}
              >
                <Ionicons name={muted ? "volume-mute" : "volume-high"} size={20} color="#fff" />
              </Pressable>
              <Pressable
                style={s.fsBtn}
                onPress={closeFullscreen}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel="Close fullscreen"
              >
                <Ionicons name="close" size={22} color="#fff" />
              </Pressable>
            </View>
          </View>
        </Modal>
      ) : null}
    </>
  );
}

/**
 * Feed video with Instagram-like lifecycle:
 * - Active: autoplay decoder
 * - Retain (previous): same player paused — no remount flicker on scroll-back
 * - Preload (next): poster only — no third decoder
 * - expo-video `useCaching` — disk LRU; scroll-back should not re-download
 * - Mute is feed-global (see feedAudioState)
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
    const togglePlayRef = useRef<(() => void) | null>(null);
    // Pick source once per remote URI. Never remount mid-play (no remote→file swap).
    const [bootUri, setBootUri] = useState(
      () => peekCachedVideoUri(uri) ?? stickySignedMediaUrl(uri) ?? uri
    );

    useEffect(() => {
      setBootUri(peekCachedVideoUri(uri) ?? stickySignedMediaUrl(uri) ?? uri);
    }, [uri]);

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

    // Active + previous (retain) keep one native player each (max 2).
    // Screen focus only gates playback (see usePlaybackAllowed), never mounting —
    // unmounting on blur destroyed the decoder and re-created it on return.
    // Never pin-download here — that froze reverse scroll; useCaching covers bytes.
    const shouldMountPlayer = (isActive || isRetain) && !isPreload;

    if (isPreload && !isActive && !isRetain) {
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
