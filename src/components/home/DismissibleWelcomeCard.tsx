import React, { useEffect, useRef, useState, useCallback } from "react";
import { Animated, Easing, View, type LayoutChangeEvent } from "react-native";
import { WelcomeCard } from "./WelcomeCard";
import {
  isWelcomeDismissedForSession,
  markWelcomeDismissedForSession,
  shouldShowWelcomeCard
} from "../../session/welcomeSession";

const DISMISS_DELAY_MS = 2500;
const FADE_IN_MS = 380;
const ANIM_DURATION_MS = 420;
const COLLAPSE_DURATION_MS = 280;
const CARD_MARGIN_BOTTOM = 28;

type Props = {
  userName: string;
  avatarUri?: string | null;
};

export function DismissibleWelcomeCard({ userName, avatarUri }: Props) {
  if (!shouldShowWelcomeCard()) {
    return null;
  }

  return (
    <DismissibleWelcomeCardAnimated userName={userName} avatarUri={avatarUri} />
  );
}

function DismissibleWelcomeCardAnimated({ userName, avatarUri }: Props) {
  const [removed, setRemoved] = useState(false);
  const [measured, setMeasured] = useState(false);
  const heightAnim = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const dismissedRef = useRef(false);

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: 1,
      duration: FADE_IN_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }, [opacity]);

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
    if (isWelcomeDismissedForSession()) {
      setRemoved(true);
      return;
    }

    const timer = setTimeout(() => {
      if (dismissedRef.current) return;
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
            toValue: -48,
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
        if (finished) {
          markWelcomeDismissedForSession();
          setRemoved(true);
        }
      });
    }, DISMISS_DELAY_MS);

    return () => clearTimeout(timer);
  }, [heightAnim, opacity, translateX, removed, measured]);

  if (removed || isWelcomeDismissedForSession()) {
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
      <Animated.View style={{ opacity, transform: [{ translateX }] }}>
        <View onLayout={onLayout}>
          <WelcomeCard userName={userName} avatarUri={avatarUri} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}
