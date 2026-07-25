import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  StatusBar
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useVideoPlayer, VideoView } from "expo-video";
import Constants, { ExecutionEnvironment } from "expo-constants";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { formatDuration, VIDEO_MAX_DURATION_SEC } from "../../config/media.config";
import { VideoTimeline } from "../../components/media/trim/VideoTimeline";
import { TrimHandles } from "../../components/media/trim/TrimHandles";
import { CoverSelector } from "../../components/media/trim/CoverSelector";
import { pendingMediaDraft } from "../../media/pendingMediaDraft";
import {
  defaultTrimRange,
  needsRequiredTrim,
  trimVideoOnce,
  trimmedDurationSec,
  validateTrimRange,
  cleanupTempVideoUri,
  type TrimRange
} from "../../services/videoProcessing.service";
import { appAlert } from "../../utils/appAlert";

type Step = "trim" | "cover";

function isExpoGo(): boolean {
  return (
    Constants.appOwnership === "expo" ||
    Constants.executionEnvironment === ExecutionEnvironment.StoreClient
  );
}

/**
 * Professional short-form trim + cover selection before Create Post upload.
 */
export function VideoTrimScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const expoGo = isExpoGo();

  const draft = pendingMediaDraft.getAsset();
  const sourceUri = draft?.uri ?? "";
  const sourceDuration = draft?.durationSec && draft.durationSec > 0 ? draft.durationSec : 0;

  const [step, setStep] = useState<Step>("trim");
  const [range, setRange] = useState<TrimRange>(() =>
    defaultTrimRange(sourceDuration || VIDEO_MAX_DURATION_SEC)
  );
  const [playhead, setPlayhead] = useState(0);
  const [busy, setBusy] = useState(false);
  const [progressLabel, setProgressLabel] = useState<string | null>(null);
  const [trimmedUri, setTrimmedUri] = useState<string | null>(null);
  const [trimmedDuration, setTrimmedDuration] = useState(0);
  const [coverMs, setCoverMs] = useState(500);
  const trimmedCleanupRef = useRef<(() => Promise<void>) | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions?.({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    if (!draft || draft.kind !== "video" || sourceDuration <= 0) {
      appAlert("Missing video", "Go back and choose a video again.");
      navigation.goBack();
    }
  }, [draft, navigation, sourceDuration]);

  useEffect(() => {
    if (!expoGo) return;
    appAlert(
      "Development build required",
      "Video trim does not work in Expo Go. Install a native build:\n\nnpx expo run:ios\nor\nnpx expo run:android"
    );
  }, [expoGo]);

  useEffect(() => {
    setRange(defaultTrimRange(sourceDuration));
    setPlayhead(0);
  }, [sourceDuration, sourceUri]);

  const player = useVideoPlayer(sourceUri || null, (p) => {
    p.loop = false;
    p.muted = false;
  });

  useEffect(() => {
    const tick = setInterval(() => {
      try {
        const t = player.currentTime || 0;
        setPlayhead(t);
        if (step === "trim" && (t < range.startSec - 0.05 || t > range.endSec)) {
          player.currentTime = range.startSec;
        }
      } catch {
        /* released */
      }
    }, 200);
    return () => clearInterval(tick);
  }, [player, range.endSec, range.startSec, step]);

  const selectionDuration = trimmedDurationSec(range);
  const validation = validateTrimRange(range, sourceDuration);
  const canContinueTrim = validation.ok && !busy && !expoGo;

  const banner = useMemo(() => {
    if (expoGo) {
      return "Trim needs a development build — Expo Go is not supported.";
    }
    if (needsRequiredTrim(sourceDuration)) {
      return "This video is longer than 1 minute. Trim your video to continue.";
    }
    if (!validation.ok) return validation.message;
    return null;
  }, [expoGo, sourceDuration, validation]);

  const togglePlay = useCallback(() => {
    try {
      if (player.playing) player.pause();
      else {
        if (player.currentTime < range.startSec || player.currentTime > range.endSec) {
          player.currentTime = range.startSec;
        }
        player.play();
      }
    } catch {
      /* ignore */
    }
  }, [player, range.endSec, range.startSec]);

  const handleClose = useCallback(() => {
    void (async () => {
      await trimmedCleanupRef.current?.();
      trimmedCleanupRef.current = null;
      navigation.goBack();
    })();
  }, [navigation]);

  const runTrim = useCallback(async () => {
    if (expoGo) {
      appAlert(
        "Development build required",
        "Run npx expo run:ios or npx expo run:android, then open that app (not Expo Go)."
      );
      return;
    }
    if (!sourceUri || !canContinueTrim) return;
    setBusy(true);
    setProgressLabel("Trimming video…");
    try {
      await trimmedCleanupRef.current?.();
      trimmedCleanupRef.current = null;
      const result = await trimVideoOnce(sourceUri, range, sourceDuration);
      trimmedCleanupRef.current = result.cleanup;
      setTrimmedUri(result.uri);
      setTrimmedDuration(result.durationSec);
      setCoverMs(Math.min(500, Math.floor(result.durationSec * 1000 * 0.1)));
      try {
        player.pause();
      } catch {
        /* ignore */
      }
      setStep("cover");
    } catch (e) {
      appAlert("Trim failed", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
      setProgressLabel(null);
    }
  }, [canContinueTrim, expoGo, player, range, sourceDuration, sourceUri]);

  const confirmAll = useCallback(async () => {
    if (!draft || !trimmedUri) return;
    setBusy(true);
    setProgressLabel("Saving…");
    try {
      const next = {
        ...draft,
        uri: trimmedUri,
        durationSec: trimmedDuration,
        trimStartSec: range.startSec,
        trimEndSec: range.endSec,
        coverFrameMs: coverMs,
        fileName: draft.fileName.replace(/\.\w+$/, "") + "_trim.mp4",
        mimeType: "video/mp4",
        tempFileUri: trimmedUri
      };
      pendingMediaDraft.confirm(next);
      trimmedCleanupRef.current = null;
      if (typeof navigation.pop === "function") {
        navigation.pop(2);
      } else {
        navigation.navigate("CreatePost");
      }
    } catch (e) {
      appAlert("Could not save", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setBusy(false);
      setProgressLabel(null);
    }
  }, [coverMs, draft, navigation, range.endSec, range.startSec, trimmedDuration, trimmedUri]);

  if (!sourceUri || sourceDuration <= 0) {
    return (
      <View style={[styles.screen, styles.center]}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <StatusBar barStyle="light-content" />
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={handleClose} hitSlop={10} style={styles.headerBtn}>
          <Ionicons name="close" size={24} color="#fff" />
        </Pressable>
        <Text style={styles.headerTitle}>{step === "trim" ? "Trim video" : "Choose cover"}</Text>
        <View style={styles.headerBtn} />
      </View>

      {banner ? (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>{banner}</Text>
        </View>
      ) : null}

      <View style={styles.stage}>
        <VideoView
          style={StyleSheet.absoluteFill}
          player={player}
          contentFit="contain"
          nativeControls={false}
          allowsFullscreen={false}
        />
        <Pressable style={styles.centerHit} onPress={togglePlay}>
          <View style={styles.playOrb}>
            <Ionicons name="play" size={28} color="#fff" />
          </View>
        </Pressable>
      </View>

      {step === "trim" ? (
        <View style={styles.trimPanel}>
          <View style={styles.durationRow}>
            <Text style={styles.meta}>{formatDuration(playhead)}</Text>
            <Text style={[styles.metaStrong, { color: colors.primary }]}>
              {formatDuration(selectionDuration)} selected
            </Text>
            <Text style={styles.meta}>{formatDuration(sourceDuration)}</Text>
          </View>

          <View style={styles.timelineWrap}>
            <VideoTimeline uri={sourceUri} durationSec={sourceDuration} />
            <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
              <TrimHandles
                durationSec={sourceDuration}
                range={range}
                playheadSec={playhead}
                onChange={setRange}
                onSeek={(sec) => {
                  try {
                    player.currentTime = sec;
                    setPlayhead(sec);
                  } catch {
                    /* ignore */
                  }
                }}
                accentColor={colors.primary}
              />
            </View>
          </View>

          <Text style={styles.ruleHint}>
            Min 3s · Max {VIDEO_MAX_DURATION_SEC}s
          </Text>
        </View>
      ) : trimmedUri ? (
        <CoverSelector
          uri={trimmedUri}
          durationSec={trimmedDuration}
          selectedMs={coverMs}
          onSelect={setCoverMs}
          accentColor={colors.primary}
          textColor="#F8FAFC"
          mutedColor="#94A3B8"
        />
      ) : null}

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        {progressLabel ? (
          <View style={styles.progressRow}>
            <ActivityIndicator color="#fff" />
            <Text style={styles.progressText}>{progressLabel}</Text>
          </View>
        ) : null}

        {step === "cover" ? (
          <Pressable
            style={styles.secondaryBtn}
            onPress={() => {
              void cleanupTempVideoUri(trimmedUri);
              trimmedCleanupRef.current = null;
              setTrimmedUri(null);
              setStep("trim");
            }}
            disabled={busy}
          >
            <Text style={styles.secondaryText}>Back to trim</Text>
          </Pressable>
        ) : null}

        <Pressable
          style={[
            styles.primaryBtn,
            {
              backgroundColor: colors.primary,
              opacity:
                busy || (step === "trim" && !canContinueTrim) || (step === "cover" && !trimmedUri)
                  ? 0.45
                  : 1
            }
          ]}
          disabled={
            busy || (step === "trim" && !canContinueTrim) || (step === "cover" && !trimmedUri)
          }
          onPress={() => {
            if (step === "trim") void runTrim();
            else void confirmAll();
          }}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryText}>
              {step === "trim" ? "Preview trim" : "Use video"}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#0B1220" },
  center: { alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm
  },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    color: "#fff",
    fontSize: 17,
    fontWeight: "700"
  },
  banner: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: "rgba(234, 179, 8, 0.18)"
  },
  bannerText: { color: "#FDE68A", fontSize: 13, lineHeight: 18, fontWeight: "600" },
  stage: {
    flex: 1,
    backgroundColor: "#000",
    marginHorizontal: spacing.md,
    borderRadius: radius.lg,
    overflow: "hidden"
  },
  centerHit: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center"
  },
  playOrb: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
    paddingLeft: 3
  },
  trimPanel: { paddingTop: spacing.md },
  durationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm
  },
  meta: { color: "#94A3B8", fontSize: 12, fontWeight: "600" },
  metaStrong: { fontSize: 13, fontWeight: "800" },
  timelineWrap: {
    marginHorizontal: spacing.lg,
    height: 56,
    borderRadius: 8,
    overflow: "hidden"
  },
  ruleHint: {
    textAlign: "center",
    color: "#64748B",
    fontSize: 12,
    marginTop: spacing.sm
  },
  footer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.08)"
  },
  progressRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  progressText: { color: "#E2E8F0", fontWeight: "600" },
  primaryBtn: {
    height: 52,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center"
  },
  primaryText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  secondaryBtn: {
    height: 44,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)"
  },
  secondaryText: { color: "#fff", fontWeight: "700" }
});
