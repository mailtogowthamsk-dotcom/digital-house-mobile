import React, { useMemo, useRef, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView, Animated } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import type { NotificationCategory } from "../../api/notifications.api";
import { FILTER_TABS } from "../../features/notifications/notificationPresentation";

type Props = {
  active: NotificationCategory;
  countFor: (id: NotificationCategory) => number;
  onChange: (id: NotificationCategory) => void;
};

function Chip({
  label,
  active,
  count,
  onPress
}: {
  label: string;
  active: boolean;
  count: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const scale = useRef(new Animated.Value(active ? 1 : 0.96)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: active ? 1 : 0.96,
      friction: 7,
      tension: 120,
      useNativeDriver: true
    }).start();
  }, [active, scale]);

  return (
    <Pressable onPress={onPress}>
      <Animated.View
        style={{
          transform: [{ scale }],
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingHorizontal: 14,
          paddingVertical: 9,
          borderRadius: radius.full,
          marginRight: spacing.sm,
          backgroundColor: active ? colors.primary : colors.surface,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: active ? colors.primary : colors.border
        }}
      >
        <Text
          style={{
            fontSize: 13,
            fontWeight: "700",
            color: active ? colors.white : colors.textSecondary
          }}
        >
          {label}
        </Text>
        {count > 0 ? (
          <View
            style={{
              minWidth: 20,
              height: 20,
              borderRadius: 10,
              paddingHorizontal: 5,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: active ? "rgba(255,255,255,0.25)" : colors.primary
            }}
          >
            <Text
              style={{
                fontSize: 10,
                fontWeight: "800",
                color: active ? colors.white : "#fff"
              }}
            >
              {count > 99 ? "99+" : count}
            </Text>
          </View>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

export function NotificationFilterChips({ active, countFor, onChange }: Props) {
  const s = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          paddingVertical: spacing.sm,
          paddingLeft: spacing.lg
        }
      }),
    []
  );

  return (
    <View style={s.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {FILTER_TABS.map((t) => (
          <Chip
            key={t.id}
            label={t.label}
            active={active === t.id}
            count={countFor(t.id)}
            onPress={() => onChange(t.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}
