import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Dimensions,
  Modal,
  FlatList,
  ActivityIndicator,
  TextInput,
  Platform,
  Keyboard
} from "react-native";
import { Image } from "expo-image";
import { CommonActions, useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVideoPlayer, VideoView } from "expo-video";
import Ionicons from "@expo/vector-icons/Ionicons";
import Animated, {
  cancelAnimation,
  Easing,
  runOnJS,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming
} from "react-native-reanimated";
import { useTheme } from "../../theme/ThemeContext";
import { AvatarImage } from "../../components/ui/AvatarImage";
import {
  deleteStory,
  getStoryViewers,
  markStoryViewed,
  replyToStory,
  toggleStoryLike,
  type StoryGroup,
  type StoryViewer
} from "../../api/stories.api";
import type { RootStackParamList } from "../../navigation/types";
import { timeAgo } from "../../utils/timeAgo";
import { appAlert } from "../../context/AppAlertContext";
import { getImageUrl } from "../../api/client";
import {
  invalidateStoryMediaCache,
  prefetchNearbyStories,
  resolveCachedStoryMediaUri
} from "../../utils/storyMediaCache";
import { useKeyboardHeight } from "../../hooks/useKeyboardHeight";
import { emitStoriesChanged } from "../../utils/storiesEvents";

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get("window");
const REPLY_MAX = 500;
const PROGRESS_EASING = Easing.linear;

type Route = RouteProp<RootStackParamList, "StoryViewer">;

function ProgressSegment({
  mode,
  progressSV
}: {
  mode: "done" | "active" | "todo";
  progressSV: SharedValue<number>;
}) {
  const fillStyle = useAnimatedStyle(() => {
    const t = mode === "done" ? 1 : mode === "todo" ? 0 : Math.min(1, Math.max(0, progressSV.value));
    return { width: `${t * 100}%` };
  }, [mode]);

  return (
    <View style={styles.progressTrack}>
      <Animated.View style={[styles.progressFill, fillStyle]} />
    </View>
  );
}

function StoryVideo({
  uri,
  paused,
  onEnded,
  onProgress
}: {
  uri: string;
  paused: boolean;
  onEnded: () => void;
  onProgress: (p: number) => void;
}) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = false;
    p.muted = false;
    // Required — without this, timeUpdate never fires and the top progress bar stays empty.
    p.timeUpdateEventInterval = 0.04;
  });

  useEffect(() => {
    if (paused) player.pause();
    else player.play();
  }, [paused, player, uri]);

  useEffect(() => {
    const report = () => {
      const dur = player.duration;
      const cur = player.currentTime;
      if (Number.isFinite(dur) && dur > 0) {
        onProgress(Math.min(1, Math.max(0, cur / dur)));
      }
    };

    const endSub = player.addListener("playToEnd", () => {
      onProgress(1);
      onEnded();
    });
    const timeSub = player.addListener("timeUpdate", () => report());

    // ~30fps poll so the bar keeps gliding between native timeUpdate ticks.
    const poll = setInterval(() => {
      if (!paused) report();
    }, 33);

    report();
    return () => {
      endSub.remove();
      timeSub.remove();
      clearInterval(poll);
    };
  }, [player, onEnded, onProgress, paused]);

  return (
    <VideoView
      player={player}
      style={styles.media}
      contentFit="cover"
      nativeControls={false}
    />
  );
}

export function StoryViewerScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<Route>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const groups = route.params.groups;
  const [groupIndex, setGroupIndex] = useState(route.params.initialGroupIndex ?? 0);
  const [storyIndex, setStoryIndex] = useState(route.params.initialStoryIndex ?? 0);
  const progressSV = useSharedValue(0);
  const progressHoldRef = useRef(0);
  const [paused, setPaused] = useState(false);
  const [viewersOpen, setViewersOpen] = useState(false);
  const [viewers, setViewers] = useState<StoryViewer[]>([]);
  const [viewersLoading, setViewersLoading] = useState(false);
  const [playUri, setPlayUri] = useState<string | null>(null);
  const [mediaReady, setMediaReady] = useState(false);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [liveGroups, setLiveGroups] = useState(groups);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const markedRef = useRef<Set<number>>(new Set());
  const deletingRef = useRef(false);
  /** Android IME often under-reports; stack modal + edge-to-edge needs extra lift. */
  const keyboardOverlap = useKeyboardHeight();
  const androidImeExtra = Platform.OS === "android" && keyboardOverlap > 0 ? 28 : 0;
  const replyLift = keyboardOverlap + androidImeExtra;

  const group: StoryGroup | undefined = liveGroups[groupIndex];
  const story = group?.stories[storyIndex];

  useEffect(() => {
    setLiveGroups(groups);
  }, [groups]);

  useEffect(() => {
    if (!story) return;
    setLiked(!!story.liked_by_me);
    setLikeCount(story.like_count ?? 0);
    setReplyOpen(false);
    setReplyText("");
    Keyboard.dismiss();
  }, [story?.id]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const close = useCallback(() => {
    clearTimer();
    Keyboard.dismiss();
    // Unmount media first so we don't hit 404 after server delete.
    setPlayUri(null);
    setMediaReady(false);
    const dismiss = () => {
      if (navigation.canGoBack()) {
        navigation.goBack();
        return;
      }
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Home" }]
        })
      );
    };
    // Alert onPress + modal presentation: wait a beat so the native alert fully closes.
    requestAnimationFrame(() => {
      setTimeout(dismiss, Platform.OS === "android" ? 120 : 40);
    });
  }, [clearTimer, navigation]);

  const resetProgress = useCallback(() => {
    cancelAnimation(progressSV);
    progressSV.value = 0;
    progressHoldRef.current = 0;
  }, [progressSV]);

  const goNext = useCallback(() => {
    if (!group) {
      close();
      return;
    }
    if (storyIndex + 1 < group.stories.length) {
      resetProgress();
      setStoryIndex((i) => i + 1);
      return;
    }
    if (groupIndex + 1 < liveGroups.length) {
      resetProgress();
      setGroupIndex((g) => g + 1);
      setStoryIndex(0);
      return;
    }
    close();
  }, [group, storyIndex, groupIndex, liveGroups.length, close, resetProgress]);

  const goPrev = useCallback(() => {
    if (storyIndex > 0) {
      resetProgress();
      setStoryIndex((i) => i - 1);
      return;
    }
    if (groupIndex > 0) {
      const prevGroup = liveGroups[groupIndex - 1]!;
      resetProgress();
      setGroupIndex((g) => g - 1);
      setStoryIndex(Math.max(0, prevGroup.stories.length - 1));
    }
  }, [storyIndex, groupIndex, liveGroups, resetProgress]);

  const onVideoProgress = useCallback(
    (p: number) => {
      // Short linear ease between samples → continuous glide, not stepped jumps.
      progressSV.value = withTiming(p, { duration: 80, easing: PROGRESS_EASING });
      progressHoldRef.current = p;
    },
    [progressSV]
  );

  useEffect(() => {
    if (!story) return;
    if (!markedRef.current.has(story.id)) {
      markedRef.current.add(story.id);
      void markStoryViewed(story.id).catch(() => undefined);
    }
  }, [story?.id]);

  const openViewers = useCallback(async () => {
    if (!story || !group?.is_own) return;
    setViewersOpen(true);
    setViewersLoading(true);
    try {
      setViewers(await getStoryViewers(story.id));
    } catch {
      setViewers([]);
    } finally {
      setViewersLoading(false);
    }
  }, [story, group?.is_own]);

  const onDelete = useCallback(() => {
    if (!story || !group?.is_own || deletingRef.current) return;
    const deletingId = story.id;
    const deletingGroupIndex = groupIndex;
    const deletingStoryIndex = storyIndex;
    const wasOwnGroup = !!group.is_own;
    appAlert("Delete story?", "This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          void (async () => {
            if (deletingRef.current) return;
            deletingRef.current = true;
            try {
              // Stop playback immediately so native player doesn't 404.
              clearTimer();
              setPlayUri(null);
              setMediaReady(false);
              setPaused(true);
              await deleteStory(deletingId);
              void invalidateStoryMediaCache(deletingId);
              emitStoriesChanged({ deletedId: deletingId, reason: "deleted" });

              const next = liveGroups
                .map((g, gi) => {
                  if (gi !== deletingGroupIndex) return g;
                  return {
                    ...g,
                    stories: g.stories.filter((s) => s.id !== deletingId)
                  };
                })
                .filter((g) => g.stories.length > 0);

              // Own ring emptied (or nothing left) → leave viewer so Home tray refreshes cleanly.
              const ownStillHasStories = next.some((g) => g.is_own);
              if (next.length === 0 || (wasOwnGroup && !ownStillHasStories)) {
                close();
                return;
              }

              let safeGroup = Math.min(deletingGroupIndex, next.length - 1);
              // Prefer staying on own stories after a delete.
              if (wasOwnGroup) {
                const ownIdx = next.findIndex((g) => g.is_own);
                if (ownIdx >= 0) safeGroup = ownIdx;
              }
              const g = next[safeGroup]!;
              const safeStory =
                safeGroup === deletingGroupIndex
                  ? Math.min(deletingStoryIndex, Math.max(0, g.stories.length - 1))
                  : 0;
              setLiveGroups(next);
              setGroupIndex(safeGroup);
              setStoryIndex(safeStory);
              resetProgress();
              setPaused(false);
            } catch (e: any) {
              setPaused(false);
              appAlert(
                "Error",
                e?.response?.data?.message ?? e?.message ?? "Could not delete"
              );
            } finally {
              deletingRef.current = false;
            }
          })();
        }
      }
    ]);
  }, [story, group?.is_own, groupIndex, storyIndex, liveGroups, clearTimer, close, resetProgress]);

  const likingRef = useRef(false);
  const onToggleLike = useCallback(async () => {
    if (!story || likingRef.current) return;
    likingRef.current = true;
    const prevLiked = liked;
    const prevCount = likeCount;
    setLiked(!prevLiked);
    setLikeCount(Math.max(0, prevCount + (prevLiked ? -1 : 1)));
    try {
      const res = await toggleStoryLike(story.id);
      setLiked(res.liked);
      setLikeCount(res.like_count);
      setLiveGroups((prev) =>
        prev.map((g) => ({
          ...g,
          stories: g.stories.map((s) =>
            s.id === story.id
              ? { ...s, liked_by_me: res.liked, like_count: res.like_count }
              : s
          )
        }))
      );
    } catch (e: any) {
      setLiked(prevLiked);
      setLikeCount(prevCount);
      appAlert("Could not like", e?.message ?? "Try again");
    } finally {
      likingRef.current = false;
    }
  }, [story, liked, likeCount]);

  const onSendReply = useCallback(async () => {
    if (!story || !group || group.is_own || replySending) return;
    const body = replyText.trim();
    if (!body) return;
    setReplySending(true);
    try {
      const res = await replyToStory(story.id, body);
      Keyboard.dismiss();
      setReplyText("");
      setReplyOpen(false);
      setPaused(false);
      appAlert("Sent", "Your comment was sent in chat.", [
        { text: "OK", style: "cancel" },
        {
          text: "Open chat",
          onPress: () => {
            navigation.navigate("Chat", {
              otherUserId: res.recipient_user_id,
              name: group.user.name,
              profileImage: group.user.profile_image
            });
          }
        }
      ]);
    } catch (e: any) {
      appAlert("Could not send", e?.response?.data?.message ?? e?.message ?? "Try again");
    } finally {
      setReplySending(false);
    }
  }, [story, group, replyText, replySending, navigation]);

  const mediaUri = useMemo(
    () => getImageUrl(story?.media_url ?? null),
    [story?.media_url]
  );

  // Download once → store in mobile disk cache → play from file:// next time.
  useEffect(() => {
    if (!story) {
      setPlayUri(null);
      setMediaReady(false);
      return;
    }
    if (story.media_type === "text") {
      setPlayUri(null);
      setMediaReady(true);
      return;
    }
    if (!mediaUri) {
      setPlayUri(null);
      setMediaReady(false);
      return;
    }
    let cancelled = false;
    setMediaReady(false);
    setPlayUri(null);
    void resolveCachedStoryMediaUri(story.id, mediaUri, {
      mediaType: story.media_type === "video" ? "video" : "image",
      expiresAt: story.expires_at
    })
      .then((uri) => {
        if (!cancelled) {
          setPlayUri(uri);
          setMediaReady(true);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPlayUri(mediaUri);
          setMediaReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [story?.id, story?.media_type, story?.expires_at, mediaUri]);

  useEffect(() => {
    prefetchNearbyStories(liveGroups, groupIndex, storyIndex, 4);
  }, [liveGroups, groupIndex, storyIndex]);

  // Reset bar when switching stories.
  useEffect(() => {
    resetProgress();
  }, [story?.id, resetProgress]);

  useEffect(() => {
    clearTimer();
    if (!story || !mediaReady || replyOpen) return;
    if (story.media_type === "video") return;

    if (paused) {
      cancelAnimation(progressSV);
      progressHoldRef.current = progressSV.value;
      return;
    }

    const duration = Math.max(story.duration_ms || 5000, 2000);
    const from = Math.min(1, Math.max(0, progressHoldRef.current));
    progressSV.value = from;
    const remaining = Math.max(16, (1 - from) * duration);
    const finished = (done?: boolean) => {
      if (done) {
        progressHoldRef.current = 0;
        goNext();
      }
    };
    progressSV.value = withTiming(1, { duration: remaining, easing: PROGRESS_EASING }, (ok) => {
      if (ok) runOnJS(finished)(true);
    });

    return () => {
      cancelAnimation(progressSV);
      progressHoldRef.current = progressSV.value;
    };
  }, [
    story?.id,
    story?.media_type,
    story?.duration_ms,
    paused,
    mediaReady,
    replyOpen,
    clearTimer,
    goNext,
    progressSV
  ]);

  if (!group || !story || (story.media_type !== "text" && !mediaUri)) {
    return (
      <View style={[styles.root, { paddingTop: insets.top }]}>
        <Pressable onPress={close} style={{ padding: 20 }}>
          <Text style={{ color: "#fff" }}>Close</Text>
        </Pressable>
      </View>
    );
  }

  const caption = (story.caption ?? "").trim();
  const isTextStory = story.media_type === "text";

  return (
    <View style={styles.root}>
      {!mediaReady || (!isTextStory && !playUri) ? (
        <ActivityIndicator color="#fff" style={styles.mediaLoader} />
      ) : isTextStory ? (
        <View style={styles.textStoryBg}>
          <Text style={styles.textStoryBody}>{caption || "…"}</Text>
        </View>
      ) : story.media_type === "video" ? (
        <StoryVideo
          key={`${story.id}-${playUri}`}
          uri={playUri!}
          paused={paused || replyOpen}
          onEnded={goNext}
          onProgress={onVideoProgress}
        />
      ) : (
        <Image
          source={{ uri: playUri! }}
          style={styles.media}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={0}
        />
      )}

      <View style={styles.tapLayer} pointerEvents={replyOpen ? "none" : "box-none"}>
        <Pressable
          style={styles.tapLeft}
          onPress={goPrev}
          onLongPress={() => setPaused(true)}
          onPressOut={() => setPaused(false)}
        />
        <Pressable
          style={styles.tapRight}
          onPress={goNext}
          onLongPress={() => setPaused(true)}
          onPressOut={() => setPaused(false)}
        />
      </View>

      <View style={[styles.overlay, { paddingTop: insets.top + 8 }]} pointerEvents="box-none">
        <View style={styles.progressRow}>
          {group.stories.map((s, i) => (
            <ProgressSegment
              key={s.id}
              mode={i < storyIndex ? "done" : i === storyIndex ? "active" : "todo"}
              progressSV={progressSV}
            />
          ))}
        </View>

        <View style={styles.header}>
          <AvatarImage uri={group.user.profile_image} name={group.user.name} size={36} />
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={styles.name} numberOfLines={1}>
              {group.user.name}
            </Text>
            <Text style={styles.time}>{timeAgo(story.created_at)}</Text>
          </View>
          {group.is_own ? (
            <Pressable onPress={onDelete} hitSlop={10} style={{ padding: 6 }}>
              <Ionicons name="trash-outline" size={22} color="#fff" />
            </Pressable>
          ) : null}
          <Pressable onPress={close} hitSlop={10} style={{ padding: 6 }}>
            <Ionicons name="close" size={26} color="#fff" />
          </Pressable>
        </View>

        <View
          style={[
            styles.bottomBar,
            {
              // Absolute overlay: lift by measured keyboard overlap (+ Android IME chrome).
              bottom: replyLift,
              paddingBottom: replyLift > 0 ? 14 : Math.max(insets.bottom, 12)
            }
          ]}
        >
          {caption && !replyOpen && !isTextStory ? (
            <Text style={styles.caption} numberOfLines={3}>
              {caption}
            </Text>
          ) : null}

          {!replyOpen ? (
            <View style={styles.actionsRow}>
              <Pressable onPress={() => void onToggleLike()} style={styles.actionBtn} hitSlop={8}>
                <Ionicons
                  name={liked ? "heart" : "heart-outline"}
                  size={28}
                  color={liked ? "#ff4d6d" : "#fff"}
                />
                {likeCount > 0 ? <Text style={styles.actionCount}>{likeCount}</Text> : null}
              </Pressable>

              {!group.is_own ? (
                <Pressable
                  onPress={() => {
                    setReplyOpen(true);
                    setPaused(true);
                  }}
                  style={styles.actionBtn}
                  hitSlop={8}
                >
                  <Ionicons name="chatbubble-outline" size={26} color="#fff" />
                </Pressable>
              ) : (
                <Pressable onPress={() => void openViewers()} style={styles.seenChip}>
                  <Ionicons name="eye-outline" size={16} color="#fff" />
                  <Text style={styles.seenText}>Seen by {story.view_count ?? 0}</Text>
                </Pressable>
              )}
            </View>
          ) : null}

          {replyOpen && !group.is_own ? (
            <View style={styles.replyRow}>
              <TextInput
                value={replyText}
                onChangeText={(t) => setReplyText(t.slice(0, REPLY_MAX))}
                placeholder="Send a message…"
                placeholderTextColor="rgba(255,255,255,0.55)"
                style={styles.replyInput}
                maxLength={REPLY_MAX}
                autoFocus
                onSubmitEditing={() => void onSendReply()}
                returnKeyType="send"
                blurOnSubmit={false}
              />
              <Pressable
                onPress={() => void onSendReply()}
                disabled={replySending || !replyText.trim()}
                style={[styles.sendBtn, { opacity: replySending || !replyText.trim() ? 0.5 : 1 }]}
              >
                {replySending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons name="send" size={20} color="#fff" />
                )}
              </Pressable>
              <Pressable
                onPress={() => {
                  Keyboard.dismiss();
                  setReplyOpen(false);
                  setPaused(false);
                }}
                hitSlop={8}
                style={{ padding: 6 }}
              >
                <Ionicons name="close" size={22} color="#fff" />
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>

      <Modal visible={viewersOpen} animationType="slide" onRequestClose={() => setViewersOpen(false)}>
        <View style={[styles.modal, { backgroundColor: colors.background, paddingTop: insets.top }]}>
          <View style={styles.modalTop}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Viewers</Text>
            <Pressable onPress={() => setViewersOpen(false)}>
              <Ionicons name="close" size={24} color={colors.text} />
            </Pressable>
          </View>
          {viewersLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 24 }} />
          ) : (
            <FlatList
              data={viewers}
              keyExtractor={(v) => String(v.user_id)}
              contentContainerStyle={{ padding: 16, gap: 12 }}
              ListEmptyComponent={
                <Text style={{ color: colors.textMuted, textAlign: "center", marginTop: 24 }}>
                  No views yet
                </Text>
              }
              renderItem={({ item }) => (
                <View style={styles.viewerRow}>
                  <AvatarImage uri={item.profile_image} name={item.name} size={40} />
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ color: colors.text, fontWeight: "700" }}>{item.name}</Text>
                    <Text style={{ color: colors.textMuted, fontSize: 12 }}>
                      {timeAgo(item.viewed_at)}
                    </Text>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000" },
  media: { ...StyleSheet.absoluteFill, width: SCREEN_W, height: SCREEN_H },
  textStoryBg: {
    ...StyleSheet.absoluteFill,
    width: SCREEN_W,
    height: SCREEN_H,
    backgroundColor: "#0F172A",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28
  },
  textStoryBody: {
    color: "#F8FAFC",
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 38,
    textAlign: "center"
  },
  mediaLoader: { ...StyleSheet.absoluteFill, justifyContent: "center", alignItems: "center" },
  tapLayer: { ...StyleSheet.absoluteFill, flexDirection: "row", zIndex: 1 },
  tapLeft: { flex: 1 },
  tapRight: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFill, zIndex: 2 },
  progressRow: { flexDirection: "row", gap: 4, paddingHorizontal: 10 },
  progressTrack: {
    flex: 1,
    height: 2.5,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.35)",
    overflow: "hidden"
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#fff"
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingTop: 10
  },
  name: { color: "#fff", fontWeight: "800", fontSize: 14 },
  time: { color: "rgba(255,255,255,0.75)", fontSize: 11, marginTop: 1 },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 14,
    gap: 10
  },
  caption: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "600",
    textShadowColor: "rgba(0,0,0,0.55)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    marginBottom: 2
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18
  },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  actionCount: { color: "#fff", fontWeight: "700", fontSize: 13 },
  seenChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.45)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20
  },
  seenText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  replyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 24,
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6
  },
  replyInput: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
    paddingVertical: 8,
    maxHeight: 80
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center"
  },
  modal: { flex: 1 },
  modalTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  modalTitle: { fontSize: 18, fontWeight: "800" },
  viewerRow: { flexDirection: "row", alignItems: "center" }
});
