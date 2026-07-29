import React, { memo, useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  PanResponder,
  type LayoutChangeEvent,
  type GestureResponderEvent
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
 *
 * Decorative children use pointerEvents="none" so touches hit the track and
 * locationX is track-relative. pageX - locationX refreshes the track origin
 * on each gesture for robustness across layout shifts.
 */
function TrimHandlesInner({
  durationSec,
  range,
  playheadSec,
  onChange,
  onSeek,
  accentColor
}: Props) {
  const [trackWidth, setTrackWidth] = useState(1);
  const trackPageXRef = useRef(0);
  const rangeRef = useRef(range);
  rangeRef.current = range;
  const durationRef = useRef(durationSec);
  durationRef.current = durationSec;
  const widthRef = useRef(trackWidth);
  widthRef.current = trackWidth;
  const active = useRef<Handle>(null);
  const grabOffset = useRef(0);

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const onSeekRef = useRef(onSeek);
  onSeekRef.current = onSeek;

  const toX = useCallback((sec: number, width = widthRef.current) => {
    const w = Math.max(1, width);
    const dur = Math.max(0.001, durationRef.current);
    return (sec / dur) * w;
  }, []);

  const toSec = useCallback((x: number) => {
    const w = Math.max(1, widthRef.current);
    const dur = durationRef.current;
    return Math.max(0, Math.min(dur, (x / w) * dur));
  }, []);

  const clampRange = useCallback((start: number, end: number): TrimRange => {
    const dur = durationRef.current;
    let s = Math.max(0, Math.min(start, dur));
    let e = Math.max(0, Math.min(end, dur));
    if (e - s < VIDEO_MIN_DURATION_SEC) {
      if (active.current === "start") s = Math.max(0, e - VIDEO_MIN_DURATION_SEC);
      else e = Math.min(dur, s + VIDEO_MIN_DURATION_SEC);
    }
    if (e - s > VIDEO_MAX_DURATION_SEC) {
      if (active.current === "start") s = e - VIDEO_MAX_DURATION_SEC;
      else if (active.current === "end") e = s + VIDEO_MAX_DURATION_SEC;
      else {
        const mid = (s + e) / 2;
        s = mid - VIDEO_MAX_DURATION_SEC / 2;
        e = mid + VIDEO_MAX_DURATION_SEC / 2;
        if (s < 0) {
          s = 0;
          e = VIDEO_MAX_DURATION_SEC;
        }
        if (e > dur) {
          e = dur;
          s = Math.max(0, e - VIDEO_MAX_DURATION_SEC);
        }
      }
    }
    return { startSec: s, endSec: e };
  }, []);

  const syncTrackOrigin = useCallback((evt: GestureResponderEvent) => {
    // Children have pointerEvents="none", so locationX is relative to the track.
    trackPageXRef.current = evt.nativeEvent.pageX - evt.nativeEvent.locationX;
  }, []);

  const trackXFromEvent = useCallback((evt: GestureResponderEvent) => {
    return evt.nativeEvent.pageX - trackPageXRef.current;
  }, []);

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          syncTrackOrigin(evt);
          const x = trackXFromEvent(evt);
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
            const clamped = Math.max(
              rangeRef.current.startSec,
              Math.min(rangeRef.current.endSec, toSec(x))
            );
            onSeekRef.current?.(clamped);
          }
        },
        onPanResponderMove: (evt) => {
          const x = trackXFromEvent(evt);
          const cur = rangeRef.current;
          if (active.current === "start") {
            onChangeRef.current(clampRange(toSec(x), cur.endSec));
          } else if (active.current === "end") {
            onChangeRef.current(clampRange(cur.startSec, toSec(x)));
          } else if (active.current === "window") {
            const span = cur.endSec - cur.startSec;
            const newStart = toSec(x - grabOffset.current);
            onChangeRef.current(clampRange(newStart, newStart + span));
          }
        },
        onPanResponderRelease: () => {
          active.current = null;
        },
        onPanResponderTerminate: () => {
          active.current = null;
        }
      }),
    [clampRange, syncTrackOrigin, toSec, toX, trackXFromEvent]
  );

  const onLayout = (e: LayoutChangeEvent) => {
    const w = Math.max(1, e.nativeEvent.layout.width);
    widthRef.current = w;
    setTrackWidth(w);
  };

  const left = toX(range.startSec, trackWidth);
  const right = toX(range.endSec, trackWidth);
  const playX = toX(playheadSec, trackWidth);

  return (
    <View style={styles.track} onLayout={onLayout} {...pan.panHandlers}>
      <View pointerEvents="none" style={[styles.dim, { width: left }]} />
      <View
        pointerEvents="none"
        style={[
          styles.selection,
          {
            left,
            width: Math.max(2, right - left),
            borderColor: accentColor
          }
        ]}
      />
      <View pointerEvents="none" style={[styles.dim, { left: right, right: 0 }]} />

      <View
        pointerEvents="none"
        style={[styles.handle, { left: left - 10, backgroundColor: accentColor }]}
      />
      <View
        pointerEvents="none"
        style={[styles.handle, { left: right - 10, backgroundColor: accentColor }]}
      />

      <View pointerEvents="none" style={[styles.playhead, { left: playX - 1 }]} />
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
