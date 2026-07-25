import React, { memo, useCallback, useMemo, useRef } from "react";
import {
  View,
  StyleSheet,
  PanResponder,
  type LayoutChangeEvent
} from "react-native";
import {
  VIDEO_MAX_DURATION_SEC,
  VIDEO_MIN_DURATION_SEC
} from "../../../config/media.config";
import type { TrimRange } from "../../../services/videoProcessing.service";

type Props = {
  durationSec: number;
  range: TrimRange;
  playheadSec: number;
  onChange: (next: TrimRange) => void;
  onSeek?: (sec: number) => void;
  accentColor: string;
};

type Handle = "start" | "end" | "window" | null;

/**
 * Interactive left/right trim handles over a timeline track.
 */
function TrimHandlesInner({
  durationSec,
  range,
  playheadSec,
  onChange,
  onSeek,
  accentColor
}: Props) {
  const widthRef = useRef(1);
  const rangeRef = useRef(range);
  rangeRef.current = range;
  const active = useRef<Handle>(null);
  const grabOffset = useRef(0);

  const toX = useCallback((sec: number) => {
    const w = widthRef.current || 1;
    return (sec / Math.max(0.001, durationSec)) * w;
  }, [durationSec]);

  const toSec = useCallback(
    (x: number) => {
      const w = widthRef.current || 1;
      return Math.max(0, Math.min(durationSec, (x / w) * durationSec));
    },
    [durationSec]
  );

  const clampRange = useCallback(
    (start: number, end: number): TrimRange => {
      let s = Math.max(0, Math.min(start, durationSec));
      let e = Math.max(0, Math.min(end, durationSec));
      if (e - s < VIDEO_MIN_DURATION_SEC) {
        if (active.current === "start") s = Math.max(0, e - VIDEO_MIN_DURATION_SEC);
        else e = Math.min(durationSec, s + VIDEO_MIN_DURATION_SEC);
      }
      if (e - s > VIDEO_MAX_DURATION_SEC) {
        if (active.current === "start") s = e - VIDEO_MAX_DURATION_SEC;
        else if (active.current === "end") e = s + VIDEO_MAX_DURATION_SEC;
        else {
          // sliding window — keep duration, shift
          const mid = (s + e) / 2;
          s = mid - VIDEO_MAX_DURATION_SEC / 2;
          e = mid + VIDEO_MAX_DURATION_SEC / 2;
          if (s < 0) {
            s = 0;
            e = VIDEO_MAX_DURATION_SEC;
          }
          if (e > durationSec) {
            e = durationSec;
            s = Math.max(0, e - VIDEO_MAX_DURATION_SEC);
          }
        }
      }
      return { startSec: s, endSec: e };
    },
    [durationSec]
  );

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          const x = evt.nativeEvent.locationX;
          const startX = toX(rangeRef.current.startSec);
          const endX = toX(rangeRef.current.endSec);
          const handleHit = 28;
          if (Math.abs(x - startX) <= handleHit) {
            active.current = "start";
          } else if (Math.abs(x - endX) <= handleHit) {
            active.current = "end";
          } else if (x > startX && x < endX) {
            active.current = "window";
            grabOffset.current = x - startX;
          } else {
            active.current = null;
            onSeek?.(toSec(x));
          }
        },
        onPanResponderMove: (evt) => {
          const x = evt.nativeEvent.locationX;
          const cur = rangeRef.current;
          if (active.current === "start") {
            onChange(clampRange(toSec(x), cur.endSec));
          } else if (active.current === "end") {
            onChange(clampRange(cur.startSec, toSec(x)));
          } else if (active.current === "window") {
            const span = cur.endSec - cur.startSec;
            const newStart = toSec(x - grabOffset.current);
            onChange(clampRange(newStart, newStart + span));
          }
        },
        onPanResponderRelease: () => {
          active.current = null;
        },
        onPanResponderTerminate: () => {
          active.current = null;
        }
      }),
    [clampRange, onChange, onSeek, toSec, toX]
  );

  const onLayout = (e: LayoutChangeEvent) => {
    widthRef.current = Math.max(1, e.nativeEvent.layout.width);
  };

  const left = toX(range.startSec);
  const right = toX(range.endSec);
  const playX = toX(playheadSec);

  return (
    <View style={styles.track} onLayout={onLayout} {...pan.panHandlers}>
      <View style={[styles.dim, { width: left }]} />
      <View
        style={[
          styles.selection,
          {
            left,
            width: Math.max(2, right - left),
            borderColor: accentColor
          }
        ]}
      />
      <View style={[styles.dim, { left: right, right: 0 }]} />

      <View style={[styles.handle, { left: left - 10, backgroundColor: accentColor }]} />
      <View style={[styles.handle, { left: right - 10, backgroundColor: accentColor }]} />

      <View style={[styles.playhead, { left: playX - 1 }]} />
    </View>
  );
}

export const TrimHandles = memo(TrimHandlesInner);

const styles = StyleSheet.create({
  track: {
    height: 56,
    borderRadius: 8,
    overflow: "hidden",
    justifyContent: "center"
  },
  dim: {
    position: "absolute",
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.55)"
  },
  selection: {
    position: "absolute",
    top: 0,
    bottom: 0,
    borderWidth: 2,
    borderRadius: 6,
    backgroundColor: "transparent"
  },
  handle: {
    position: "absolute",
    top: 4,
    bottom: 4,
    width: 20,
    borderRadius: 6,
    zIndex: 3
  },
  playhead: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: "#fff",
    zIndex: 4
  }
});
