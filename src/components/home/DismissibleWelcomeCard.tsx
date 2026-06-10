import React, { useEffect, useRef, useState, useCallback } from "react";
import { Animated, Easing, View, type LayoutChangeEvent } from "react-native";
import { WelcomeCard } from "./WelcomeCard";
import {
  isWelcomeDismissedForSession,
  markWelcomeDismissedForSession
} from "../../session/welcomeSession";
import { useWelcomeCardVisible } from "../../hooks/useWelcomeCardVisible";

const DISMISS_DELAY_MS = 2500;
const ANIM_DURATION_MS = 420;
const COLLAPSE_DURATION_MS = 280;
const CARD_MARGIN_BOTTOM = 28;

type Props = {
  userName: string;
  avatarUri?: string | null;
};

export function DismissibleWelcomeCard({ userName, avatarUri }: Props) {
  const visible = useWelcomeCardVisible();

  if (!visible || isWelcomeDismissedForSession()) {
    return null;
  }

  return (
    <DismissibleWelcomeCardAnimated userName={userName} avatarUri={avatarUri} />
  );
}

function DismissibleWelcomeCardAnimated({ userName, avatarUri }: Props) {
  const [removed, setRemoved] = useState(false);
  const [collapsing, setCollapsing] = useState(false);
  const contentHeight = useRef(0);
  const heightAnim = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const dismissedRef = useRef(false);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const h = e.nativeEvent.layout.height;
    if (h > 0) contentHeight.current = h;
  }, []);

  useEffect(() => {
    if (dismissedRef.current || removed) return;

    dismissTimerRef.current = setTimeout(() => {
      if (dismissedRef.current || removed) return;
      dismissedRef.current = true;
      setCollapsing(true);
      heightAnim.setValue(contentHeight.current || 0);

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

    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, [heightAnim, opacity, translateX, removed]);

  if (removed) {
    return null;
  }

  return (
    <Animated.View
      style={{
        marginBottom: CARD_MARGIN_BOTTOM,
        overflow: "hidden",
        ...(collapsing ? { height: heightAnim } : undefined)
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
