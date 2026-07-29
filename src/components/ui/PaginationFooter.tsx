import React, { memo, useEffect, useMemo, useRef } from "react";
import { Animated, Easing, StyleSheet, Text, View, type ViewStyle } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { spacing } from "../../theme/spacing";

const DOT_COUNT = 3;
const DOT_SIZE = 7;
const STAGGER_MS = 150;
const PULSE_MS = 380;

type Props = {
  loading?: boolean;
  /** Terminal state: every page has been loaded. */
  endReached?: boolean;
  endLabel?: string;
  style?: ViewStyle;
};

/**
 * Footer for paginated lists.
 *
 * Kept deliberately short — a footer tall enough to resemble a real row makes
 * the list lurch every time a page lands, and flashes a large placeholder when
 * the request returns quickly.
 */
function PaginationFooterInner({
  loading = false,
  endReached = false,
  endLabel = "You're all caught up",
  style
}: Props) {
  const { colors } = useTheme();
  const dotsRef = useRef<Animated.Value[] | null>(null);
  if (dotsRef.current === null) {
    dotsRef.current = Array.from({ length: DOT_COUNT }, () => new Animated.Value(0));
  }
  const dots = dotsRef.current;

  useEffect(() => {
    if (!loading) return;
    // Each dot runs a full-length cycle offset by its own lead-in delay, so the
    // wave stays in phase instead of drifting apart over time.
    const animations = dots.map((value, index) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(index * STAGGER_MS),
          Animated.timing(value, {
            toValue: 1,
            duration: PULSE_MS,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: PULSE_MS,
            easing: Easing.in(Easing.quad),
            useNativeDriver: true
          }),
          Animated.delay((DOT_COUNT - 1 - index) * STAGGER_MS)
        ])
      )
    );
    animations.forEach((a) => a.start());
    return () => {
      animations.forEach((a) => a.stop());
      dots.forEach((value) => value.setValue(0));
    };
  }, [loading, dots]);

  const s = useMemo(
    () =>
      StyleSheet.create({
        loadingWrap: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: spacing.sm,
          paddingVertical: spacing.xl
        },
        dot: {
          width: DOT_SIZE,
          height: DOT_SIZE,
          borderRadius: DOT_SIZE / 2,
          backgroundColor: colors.primary
        },
        endWrap: {
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md,
          paddingVertical: spacing.xxl,
          paddingHorizontal: spacing.xxxl
        },
        rule: {
          flex: 1,
          height: StyleSheet.hairlineWidth,
          backgroundColor: colors.border
        },
        endLabel: {
          fontSize: 12,
          fontWeight: "600",
          letterSpacing: 0.3,
          color: colors.textMuted
        }
      }),
    [colors]
  );

  if (loading) {
    return (
      <View
        style={[s.loadingWrap, style]}
        accessibilityRole="progressbar"
        accessibilityLabel="Loading more"
      >
        {dots.map((value, index) => (
          <Animated.View
            key={index}
            style={[
              s.dot,
              {
                opacity: value.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.22, 1]
                }),
                transform: [
                  {
                    scale: value.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.72, 1]
                    })
                  }
                ]
              }
            ]}
          />
        ))}
      </View>
    );
  }

  if (endReached) {
    return (
      <View style={[s.endWrap, style]}>
        <View style={s.rule} />
        <Text style={s.endLabel}>{endLabel}</Text>
        <View style={s.rule} />
      </View>
    );
  }

  return null;
}

export const PaginationFooter = memo(PaginationFooterInner);
