import React, { memo, useEffect, useRef } from "react";
import { View, StyleSheet, Animated, Easing } from "react-native";
import { Image } from "expo-image";
import Ionicons from "@expo/vector-icons/Ionicons";

type Props = {
  visible: boolean;
  avatarUri?: string | null;
  bubbleColor: string;
  placeholderColor: string;
  mutedColor: string;
};

function bounce(value: Animated.Value, delay: number) {
  return Animated.loop(
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(value, {
        toValue: 1,
        duration: 240,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true
      }),
      Animated.timing(value, {
        toValue: 0,
        duration: 240,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true
      })
    ])
  );
}

function ChatTypingIndicatorInner({
  visible,
  avatarUri,
  bubbleColor,
  placeholderColor,
  mutedColor
}: Props) {
  const appear = useRef(new Animated.Value(0)).current;
  const d0 = useRef(new Animated.Value(0)).current;
  const d1 = useRef(new Animated.Value(0)).current;
  const d2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      appear.setValue(0);
      return;
    }
    const fade = Animated.timing(appear, {
      toValue: 1,
      duration: 180,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    });
    const a = bounce(d0, 0);
    const b = bounce(d1, 120);
    const c = bounce(d2, 240);
    fade.start();
    a.start();
    b.start();
    c.start();
    return () => {
      fade.stop();
      a.stop();
      b.stop();
      c.stop();
      d0.setValue(0);
      d1.setValue(0);
      d2.setValue(0);
    };
  }, [appear, d0, d1, d2, visible]);

  if (!visible) return null;

  const dots = [d0, d1, d2];

  return (
    <Animated.View
      style={[
        styles.row,
        {
          opacity: appear,
          transform: [
            {
              translateY: appear.interpolate({
                inputRange: [0, 1],
                outputRange: [8, 0]
              })
            }
          ]
        }
      ]}
    >
      <View style={styles.avatarCol}>
        {avatarUri ? (
          <Image
            source={{ uri: avatarUri }}
            style={styles.avatar}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        ) : (
          <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: placeholderColor }]}>
            <Ionicons name="person" size={13} color={mutedColor} />
          </View>
        )}
      </View>
      <View style={[styles.bubble, { backgroundColor: bubbleColor }]}>
        {dots.map((dot, i) => (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              {
                backgroundColor: mutedColor,
                opacity: dot.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
                transform: [
                  {
                    translateY: dot.interpolate({ inputRange: [0, 1], outputRange: [0, -3] })
                  }
                ]
              }
            ]}
          />
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    width: "100%",
    marginTop: 2,
    marginBottom: 6,
    paddingTop: 2
  },
  avatarCol: {
    width: 26,
    marginRight: 6,
    flexShrink: 0
  },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: 13
  },
  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center"
  },
  bubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
    borderBottomLeftRadius: 5
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3
  }
});

export const ChatTypingIndicator = memo(ChatTypingIndicatorInner);
