import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  LayoutChangeEvent,
  Animated,
  PanResponder
} from "react-native";
import {
  CROP_RATIO_OPTIONS,
  type CropRatioId,
  type ImageCropRect
} from "../../../media/cropTypes";
import { centeredCropForRatio } from "../../../utils/imageCrop";
import { spacing, radius } from "../../../theme/spacing";

type Props = {
  uri: string;
  imageWidth: number;
  imageHeight: number;
  /** Called whenever framing changes so parent can export on Continue. */
  onCropChange: (rect: ImageCropRect, ratioId: CropRatioId) => void;
  accentColor: string;
  textColor: string;
  mutedColor: string;
  surfaceColor: string;
};

type LayoutSize = { width: number; height: number };

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

/**
 * Pinch-to-zoom + pan photo editor with aspect-ratio crop window.
 * Exports crop rect in source-image coordinates.
 */
function PhotoCropEditorInner({
  uri,
  imageWidth,
  imageHeight,
  onCropChange,
  accentColor,
  textColor,
  mutedColor,
  surfaceColor
}: Props) {
  const [ratioId, setRatioId] = useState<CropRatioId>("original");
  const [viewport, setViewport] = useState<LayoutSize>({ width: 0, height: 0 });

  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  const scaleNum = useRef(1);
  const txNum = useRef(0);
  const tyNum = useRef(0);
  const pinchStart = useRef(1);
  const panStart = useRef({ x: 0, y: 0 });
  const lastDist = useRef<number | null>(null);

  const ratioValue = useMemo(
    () => CROP_RATIO_OPTIONS.find((o) => o.id === ratioId)?.value ?? null,
    [ratioId]
  );

  const frame = useMemo(() => {
    if (viewport.width <= 0 || viewport.height <= 0) {
      return { width: 0, height: 0, left: 0, top: 0 };
    }
    const pad = 16;
    const maxW = viewport.width - pad * 2;
    const maxH = viewport.height - pad * 2;
    const targetRatio =
      ratioValue ?? (imageWidth > 0 && imageHeight > 0 ? imageWidth / imageHeight : 1);
    let width = maxW;
    let height = width / targetRatio;
    if (height > maxH) {
      height = maxH;
      width = height * targetRatio;
    }
    return {
      width,
      height,
      left: (viewport.width - width) / 2,
      top: (viewport.height - height) / 2
    };
  }, [viewport, ratioValue, imageWidth, imageHeight]);

  const baseCoverScale = useMemo(() => {
    if (frame.width <= 0 || imageWidth <= 0 || imageHeight <= 0) return 1;
    return Math.max(frame.width / imageWidth, frame.height / imageHeight);
  }, [frame, imageWidth, imageHeight]);

  const emitCrop = useCallback(() => {
    if (imageWidth <= 0 || imageHeight <= 0 || frame.width <= 0) {
      onCropChange(centeredCropForRatio(imageWidth, imageHeight, ratioValue), ratioId);
      return;
    }

    const displayScale = baseCoverScale * scaleNum.current;
    const dispW = imageWidth * displayScale;
    const dispH = imageHeight * displayScale;
    const imageLeft = frame.left + (frame.width - dispW) / 2 + txNum.current;
    const imageTop = frame.top + (frame.height - dispH) / 2 + tyNum.current;

    const originX = (frame.left - imageLeft) / displayScale;
    const originY = (frame.top - imageTop) / displayScale;
    const width = frame.width / displayScale;
    const height = frame.height / displayScale;

    onCropChange(
      {
        originX: clamp(originX, 0, Math.max(0, imageWidth - 1)),
        originY: clamp(originY, 0, Math.max(0, imageHeight - 1)),
        width: clamp(width, 1, imageWidth),
        height: clamp(height, 1, imageHeight)
      },
      ratioId
    );
  }, [
    baseCoverScale,
    frame,
    imageHeight,
    imageWidth,
    onCropChange,
    ratioId,
    ratioValue
  ]);

  const constrainTranslation = useCallback(
    (nextScale: number, x: number, y: number) => {
      const displayScale = baseCoverScale * nextScale;
      const dispW = imageWidth * displayScale;
      const dispH = imageHeight * displayScale;
      const maxX = Math.max(0, (dispW - frame.width) / 2);
      const maxY = Math.max(0, (dispH - frame.height) / 2);
      return {
        x: clamp(x, -maxX, maxX),
        y: clamp(y, -maxY, maxY)
      };
    },
    [baseCoverScale, frame.height, frame.width, imageHeight, imageWidth]
  );

  useEffect(() => {
    scaleNum.current = 1;
    txNum.current = 0;
    tyNum.current = 0;
    scale.setValue(1);
    translateX.setValue(0);
    translateY.setValue(0);
    emitCrop();
  }, [ratioId, uri, emitCrop, scale, translateX, translateY]);

  useEffect(() => {
    emitCrop();
  }, [viewport.width, viewport.height, emitCrop]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          panStart.current = { x: txNum.current, y: tyNum.current };
          pinchStart.current = scaleNum.current;
          lastDist.current = null;
          if (evt.nativeEvent.touches.length >= 2) {
            const [a, b] = evt.nativeEvent.touches;
            lastDist.current = Math.hypot(b.pageX - a.pageX, b.pageY - a.pageY);
          }
        },
        onPanResponderMove: (evt, gesture) => {
          const touches = evt.nativeEvent.touches;
          if (touches.length >= 2) {
            const [a, b] = touches;
            const dist = Math.hypot(b.pageX - a.pageX, b.pageY - a.pageY);
            if (lastDist.current != null && lastDist.current > 0) {
              const next = clamp(pinchStart.current * (dist / lastDist.current), 1, 4);
              scaleNum.current = next;
              scale.setValue(next);
              const c = constrainTranslation(next, txNum.current, tyNum.current);
              txNum.current = c.x;
              tyNum.current = c.y;
              translateX.setValue(c.x);
              translateY.setValue(c.y);
            } else {
              lastDist.current = dist;
              pinchStart.current = scaleNum.current;
            }
            return;
          }
          lastDist.current = null;
          const c = constrainTranslation(
            scaleNum.current,
            panStart.current.x + gesture.dx,
            panStart.current.y + gesture.dy
          );
          txNum.current = c.x;
          tyNum.current = c.y;
          translateX.setValue(c.x);
          translateY.setValue(c.y);
        },
        onPanResponderRelease: () => {
          lastDist.current = null;
          emitCrop();
        },
        onPanResponderTerminate: () => {
          lastDist.current = null;
          emitCrop();
        }
      }),
    [constrainTranslation, emitCrop, scale, translateX, translateY]
  );

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setViewport({ width, height });
  };

  const displayW = imageWidth * baseCoverScale;
  const displayH = imageHeight * baseCoverScale;

  return (
    <View style={styles.root}>
      <View style={styles.stage} onLayout={onLayout} {...panResponder.panHandlers}>
        {frame.width > 0 ? (
          <>
            <Animated.View
              style={{
                position: "absolute",
                left: frame.left + (frame.width - displayW) / 2,
                top: frame.top + (frame.height - displayH) / 2,
                width: displayW,
                height: displayH,
                transform: [{ translateX }, { translateY }, { scale }]
              }}
            >
              <Image
                source={{ uri }}
                style={{ width: displayW, height: displayH }}
                resizeMode="stretch"
              />
            </Animated.View>

            {/* Dim outside crop frame */}
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
              <View style={{ height: frame.top, backgroundColor: "rgba(0,0,0,0.55)" }} />
              <View style={{ flexDirection: "row", height: frame.height }}>
                <View style={{ width: frame.left, backgroundColor: "rgba(0,0,0,0.55)" }} />
                <View
                  style={{
                    width: frame.width,
                    height: frame.height,
                    borderWidth: 1.5,
                    borderColor: "rgba(255,255,255,0.92)"
                  }}
                />
                <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)" }} />
              </View>
              <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.55)" }} />
            </View>
          </>
        ) : null}
      </View>

      <View style={styles.ratioRow}>
        {CROP_RATIO_OPTIONS.map((opt) => {
          const active = opt.id === ratioId;
          return (
            <Pressable
              key={opt.id}
              onPress={() => setRatioId(opt.id)}
              style={[
                styles.ratioChip,
                {
                  backgroundColor: active ? accentColor : surfaceColor,
                  borderColor: active ? accentColor : "rgba(255,255,255,0.18)"
                }
              ]}
            >
              <Text style={{ color: active ? "#fff" : textColor, fontWeight: "700", fontSize: 13 }}>
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={[styles.hint, { color: mutedColor }]}>Pinch to zoom · drag to reposition</Text>
    </View>
  );
}

export const PhotoCropEditor = memo(PhotoCropEditorInner);

const styles = StyleSheet.create({
  root: { flex: 1 },
  stage: {
    flex: 1,
    backgroundColor: "#000",
    overflow: "hidden"
  },
  ratioRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md
  },
  ratioChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1
  },
  hint: {
    textAlign: "center",
    fontSize: 12,
    marginTop: spacing.sm,
    marginBottom: spacing.xs
  }
});
