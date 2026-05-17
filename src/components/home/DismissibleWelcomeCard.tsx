import React, { useEffect, useRef, useState, useCallback } from "react";
import { Animated, Easing, View, type LayoutChangeEvent } from "react-native";
import { WelcomeCard } from "./WelcomeCard";

const DISMISS_DELAY_MS = 2500;
const ANIM_DURATION_MS = 420;
const COLLAPSE_DURATION_MS = 280;
const CARD_MARGIN_BOTTOM = 28;

type Props = {
  userName: string;
  avatarUri?: string | null;
};

/**
 * Welcome card that auto-dismisses after login with slide + fade (no layout jump).
 * Outer view: height collapse (JS driver). Inner view: opacity + translateX (native driver).
 */
export function DismissibleWelcomeCard({ userName, avatarUri }: Props) {
  const [removed, setRemoved] = useState(false);
  const [measured, setMeasured] = useState(false);
  const heightAnim = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const dismissedRef = useRef(false);

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height;
      if (h > 0 && !measured) {
        heightAnim.setValue(h);
        setMeasured(true);
      }
    },
    [heightAnim, measured]
  );

  useEffect(() => {
    if (dismissedRef.current || removed || !measured) return;

    const timer = setTimeout(() => {
      dismissedRef.current = true;

      Animated.sequence([
        Animated.parallel([
          Animated.timing(opacity, {
            toValue: 0,
            duration: ANIM_DURATION_MS,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true
          }),
          Animated.timing(translateX, {
            toValue: -56,
            duration: ANIM_DURATION_MS,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true
          })
        ]),
        Animated.timing(heightAnim, {
          toValue: 0,
          duration: COLLAPSE_DURATION_MS,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: false
        })
      ]).start(({ finished }) => {
        if (finished) setRemoved(true);
      });
    }, DISMISS_DELAY_MS);

    return () => clearTimeout(timer);
  }, [heightAnim, opacity, translateX, removed, measured]);

  if (removed) {
    return null;
  }

  return (
    <Animated.View
      style={{
        marginBottom: CARD_MARGIN_BOTTOM,
        overflow: "hidden",
        ...(measured ? { height: heightAnim } : undefined)
      }}
    >
      <Animated.View
        style={{
          opacity,
          transform: [{ translateX }]
        }}
      >
        <View onLayout={onLayout}>
          <WelcomeCard userName={userName} avatarUri={avatarUri} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}
