/**
 * Android feed video via HTML5 <video> in a WebView.
 *
 * expo-video (ExoPlayer) frequently fails to paint / leave "loading" in Expo Go
 * on Android after SDK 57, even when the CDN MP4 is valid H.264/AAC. WebView
 * playback is reliable for progressive MP4 and preserves muted autoplay.
 */

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Animated,
  Easing,
  Modal,
  StatusBar,
  Dimensions
} from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { usePlaybackAllowed } from "../../hooks/usePlaybackAllowed";
import { useFeedAudioControls } from "../../hooks/useFeedAudioControls";
import { registerFeedVideoPlayer, pauseOtherFeedVideos } from "../../media/feedVideoPlayback";
import { markVideoUriWarmed } from "../../utils/videoUriWarmCache";
import { FeedMediaLoader } from "./FeedMediaLoader";

type Props = {
  uri: string;
  thumbnailUrl?: string | null;
  height: number;
  isActive: boolean;
  isPreload: boolean;
  isRetain: boolean;
  style?: object;
  onTogglePlayRef?: React.MutableRefObject<(() => void) | null>;
  onDoubleTapLike?: () => void;
};

function mediaBaseUrl(uri: string): string {
  try {
    const u = new URL(uri);
    return `${u.protocol}//${u.host}`;
  } catch {
    return "https://localhost";
  }
}

function buildHtml(uri: string, muted: boolean, autoplay: boolean): string {
  const src = JSON.stringify(uri);
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
<style>
  html,body{margin:0;padding:0;background:#0B1220;width:100%;height:100%;overflow:hidden}
  video{position:absolute;top:-2px;left:-2px;width:calc(100% + 4px);height:calc(100% + 4px);object-fit:cover;background:#0B1220;display:block;border:0;outline:none}
</style>
</head>
<body>
<video id="v" playsinline webkit-playsinline loop preload="auto"></video>
<script>
(function(){
  var v=document.getElementById('v');
  var src=${src};
  var wantPlay=${autoplay ? "true" : "false"};
  var userPaused=false;
  function post(msg){
    try{window.ReactNativeWebView&&window.ReactNativeWebView.postMessage(msg);}catch(e){}
  }
  v.muted=${muted ? "true" : "false"};
  v.src=src;
  v.addEventListener('playing',function(){post('playing');});
  v.addEventListener('pause',function(){post('paused');});
  v.addEventListener('error',function(){post('error');});
  v.addEventListener('loadeddata',function(){post('ready');});
  function tryPlay(){
    if(!wantPlay||userPaused)return;
    var p=v.play();
    if(p&&p.catch)p.catch(function(){post('play_blocked');});
  }
  window.__dhSetMuted=function(m){v.muted=!!m;};
  window.__dhPlay=function(){userPaused=false;wantPlay=true;tryPlay();};
  window.__dhPause=function(){userPaused=true;wantPlay=false;try{v.pause();}catch(e){}};
  window.__dhSetWantPlay=function(w){
    wantPlay=!!w;
    if(!wantPlay){try{v.pause();}catch(e){}return;}
    if(!userPaused)tryPlay();
  };
  tryPlay();
  setTimeout(tryPlay,300);
  setTimeout(tryPlay,1000);
})();
</script>
</body>
</html>`;
}

function AndroidFeedVideoInner({
  uri,
  thumbnailUrl,
  height,
  isActive,
  isPreload,
  isRetain,
  style,
  onTogglePlayRef,
  onDoubleTapLike
}: Props) {
  const playbackAllowed = usePlaybackAllowed();
  const { muted, toggleMute } = useFeedAudioControls();
  const insets = useSafeAreaInsets();
  const webRef = useRef<WebView>(null);
  const pauseKeyRef = useRef({ uri });
  const [windowSize, setWindowSize] = useState(() => Dimensions.get("window"));
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [errored, setErrored] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [posterMounted, setPosterMounted] = useState(true);
  const hasPaintedFrameRef = useRef(false);
  const userPausedRef = useRef(false);
  const lastTapTime = useRef(0);
  const singleTapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const posterOpacity = useRef(new Animated.Value(1)).current;

  const shouldPlay =
    playbackAllowed && ((isActive && !isPreload && !isRetain) || fullscreen) && !userPausedRef.current;

  const html = useMemo(
    () => buildHtml(uri, muted, shouldPlay),
    // Recreate document only when the clip identity changes — mute/play via JS.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [uri]
  );

  const hidePosterSmoothly = useCallback(() => {
    setReady(true);
    setErrored(false);
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

  const inject = useCallback((js: string) => {
    try {
      webRef.current?.injectJavaScript(`${js};true;`);
    } catch {
      /* webview gone */
    }
  }, []);

  const pauseSelf = useCallback(() => {
    inject("window.__dhPause&&window.__dhPause()");
    setPlaying(false);
  }, [inject]);

  useEffect(() => {
    pauseKeyRef.current = { uri };
    return registerFeedVideoPlayer(pauseKeyRef.current, pauseSelf);
  }, [uri, pauseSelf]);

  useEffect(() => {
    inject(`window.__dhSetMuted&&window.__dhSetMuted(${muted ? "true" : "false"})`);
  }, [muted, inject]);

  useEffect(() => {
    if (!playbackAllowed && fullscreen) setFullscreen(false);
  }, [playbackAllowed, fullscreen]);

  useEffect(() => {
    if (shouldPlay) {
      pauseOtherFeedVideos(pauseKeyRef.current);
      inject("window.__dhSetWantPlay&&window.__dhSetWantPlay(true)");
      inject("window.__dhPlay&&window.__dhPlay()");
      return;
    }
    inject("window.__dhSetWantPlay&&window.__dhSetWantPlay(false)");
    setPlaying(false);
  }, [shouldPlay, inject, uri]);

  useEffect(() => {
    hasPaintedFrameRef.current = false;
    userPausedRef.current = false;
    setReady(false);
    setErrored(false);
    setPlaying(false);
    setPosterMounted(true);
    posterOpacity.setValue(1);
  }, [uri, posterOpacity]);

  useEffect(() => {
    if (!fullscreen) return;
    setWindowSize(Dimensions.get("window"));
    const sub = Dimensions.addEventListener("change", ({ window: next }) => setWindowSize(next));
    return () => sub.remove();
  }, [fullscreen]);

  useEffect(
    () => () => {
      if (singleTapTimer.current) clearTimeout(singleTapTimer.current);
    },
    []
  );

  const onMessage = useCallback(
    (e: WebViewMessageEvent) => {
      const msg = e.nativeEvent.data;
      if (msg === "playing") {
        setPlaying(true);
        hidePosterSmoothly();
      } else if (msg === "paused") {
        setPlaying(false);
      } else if (msg === "ready") {
        setReady(true);
      } else if (msg === "error" || msg === "play_blocked") {
        if (__DEV__) console.warn("[AndroidFeedVideo]", msg, uri.slice(0, 120));
        setErrored(true);
        setReady(true);
      }
    },
    [hidePosterSmoothly, uri]
  );

  const togglePlay = useCallback(() => {
    if (!playbackAllowed) return;
    if ((isPreload || isRetain) && !isActive && !fullscreen) return;
    if (playing) {
      userPausedRef.current = true;
      pauseSelf();
      return;
    }
    userPausedRef.current = false;
    pauseOtherFeedVideos(pauseKeyRef.current);
    inject("window.__dhPlay&&window.__dhPlay()");
    setPlaying(true);
    hidePosterSmoothly();
  }, [
    playbackAllowed,
    isPreload,
    isRetain,
    isActive,
    fullscreen,
    playing,
    pauseSelf,
    inject,
    hidePosterSmoothly
  ]);

  useEffect(() => {
    if (!onTogglePlayRef) return;
    onTogglePlayRef.current = togglePlay;
    return () => {
      if (onTogglePlayRef.current === togglePlay) onTogglePlayRef.current = null;
    };
  }, [onTogglePlayRef, togglePlay]);

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

  const s = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          width: "100%",
          height,
          backgroundColor: "#0B1220",
          overflow: "hidden"
        },
        video: {
          position: "absolute",
          top: -2,
          left: -2,
          right: -2,
          bottom: -2,
          backgroundColor: "#0B1220",
          borderWidth: 0
        },
        poster: { ...StyleSheet.absoluteFill },
        center: {
          ...StyleSheet.absoluteFill,
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
          width: windowSize.width,
          height: windowSize.height,
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
    [height, windowSize.width, windowSize.height]
  );

  if (isPreload && !isActive) {
    return (
      <View style={[s.wrap, style]}>
        {thumbnailUrl ? (
          <Image
            source={{ uri: thumbnailUrl }}
            style={s.poster}
            contentFit="cover"
            cachePolicy="memory-disk"
            transition={0}
          />
        ) : null}
      </View>
    );
  }

  const posterVisible = posterMounted && Boolean(thumbnailUrl);
  const showLoader = !hasPaintedFrameRef.current && !ready && !errored && shouldPlay;
  const showPausedGlyph =
    !showLoader && (!posterVisible || errored) && !playing && ready && isActive && !isRetain;

  const web = (
    <WebView
      ref={webRef}
      style={s.video}
      containerStyle={{ backgroundColor: "#0B1220", flex: 1 }}
      originWhitelist={["*"]}
      source={{ html, baseUrl: mediaBaseUrl(uri) }}
      allowsInlineMediaPlayback
      mediaPlaybackRequiresUserAction={false}
      javaScriptEnabled
      domStorageEnabled
      mixedContentMode="always"
      allowsFullscreenVideo
      scrollEnabled={false}
      bounces={false}
      overScrollMode="never"
      setSupportMultipleWindows={false}
      androidLayerType="hardware"
      onMessage={onMessage}
      pointerEvents="none"
    />
  );

  return (
    <>
      <View style={[s.wrap, style]}>
        {!fullscreen ? web : <View style={s.video} />}
        {posterVisible && !fullscreen && thumbnailUrl ? (
          <Animated.View style={[s.poster, { opacity: posterOpacity }]} pointerEvents="none">
            <Image
              source={{ uri: thumbnailUrl }}
              style={s.poster}
              contentFit="cover"
              cachePolicy="memory-disk"
              recyclingKey={thumbnailUrl.split("?")[0]}
              transition={0}
            />
          </Animated.View>
        ) : null}
        {showLoader && !fullscreen ? (
          <View style={[s.center, { backgroundColor: "rgba(15,23,42,0.28)" }]} pointerEvents="none">
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
              onPress={() => playbackAllowed && setFullscreen(true)}
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
          onRequestClose={() => setFullscreen(false)}
          statusBarTranslucent
        >
          <StatusBar hidden />
          <View style={s.fsRoot}>
            <WebView
              style={s.fsVideo}
              originWhitelist={["*"]}
              source={{ html: buildHtml(uri, muted, true), baseUrl: mediaBaseUrl(uri) }}
              allowsInlineMediaPlayback
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled
              domStorageEnabled
              mixedContentMode="always"
              allowsFullscreenVideo
              scrollEnabled={false}
              onMessage={onMessage}
            />
            <Pressable
              style={StyleSheet.absoluteFill}
              onPress={handleSurfacePress}
              accessibilityRole="button"
              accessibilityLabel={playing ? "Pause video" : "Play video"}
            />
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
                onPress={() => setFullscreen(false)}
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

export const AndroidFeedVideo = memo(AndroidFeedVideoInner);
