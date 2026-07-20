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
import { registerFeedVideoPlayer } from "../../media/feedVideoPlayback";

type FeedVideoPlayerProps = {
  uri: string;
  thumbnailUrl?: string | null;
  height?: number;
  /** When false, pause and avoid unnecessary playback. */
  isActive?: boolean;
  /**
   * Initial mute for autoplay (feed convention).
   * User can unmute via the speaker control; state is owned by this component.
   */
  initiallyMuted?: boolean;
  style?: object;
};

/**
 * Feed video player with Instagram-like lifecycle:
 * - Plays only when `isActive` AND the host screen is focused AND app is foreground.
 * - Leaving the feed (stack push, tab change, background) pauses immediately.
 * - Returning resumes only if the parent still marks this item active (visible).
 */
function FeedVideoPlayerInner({
  uri,
  thumbnailUrl,
  height = 320,
  isActive = false,
  initiallyMuted = true,
  style
}: FeedVideoPlayerProps) {
  const { colors } = useTheme();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const playbackAllowed = usePlaybackAllowed();
  const [ready, setReady] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showPoster, setShowPoster] = useState(true);
  const [muted, setMuted] = useState(initiallyMuted);

  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.volume = 1;
    p.muted = initiallyMuted;
    p.audioMixingMode = "auto";
  });

  /** Autoplay / resume only when visible on an active, focused, foreground screen. */
  const shouldAutoplay = isActive && playbackAllowed;
  /** User-opened fullscreen may keep playing while allowed; never in background. */
  const shouldPlay = playbackAllowed && (isActive || fullscreen);

  useEffect(() => {
    player.muted = muted;
    player.volume = 1;
    player.audioMixingMode = muted ? "auto" : "doNotMix";
  }, [muted, player]);

  useEffect(() => {
    const statusSub = player.addListener("statusChange", (status) => {
      if (status.status === "readyToPlay") setReady(true);
    });
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
  }, [player]);

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
        player.play();
        if (shouldAutoplay) setShowPoster(false);
      } else {
        player.pause();
      }
    } catch (_) {}
  }, [shouldPlay, shouldAutoplay, player]);

  useEffect(() => {
    return () => {
      try {
        player.pause();
      } catch (_) {}
    };
  }, [player]);

  const togglePlay = useCallback(() => {
    if (!playbackAllowed) return;
    try {
      if (player.playing) {
        player.pause();
      } else {
        player.play();
        setShowPoster(false);
      }
    } catch (_) {}
  }, [player, playbackAllowed]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => !prev);
  }, []);

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
    [colors, height, screenWidth, screenHeight]
  );

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

export const FeedVideoPlayer = memo(FeedVideoPlayerInner);
