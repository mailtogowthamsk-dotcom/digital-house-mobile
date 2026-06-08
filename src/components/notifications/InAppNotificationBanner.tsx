import React, { useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { navigationRef } from "../../navigation/rootNavigation";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import type { NotificationItem } from "../../api/notifications.api";
import { navigateFromNotification } from "../../navigation/notificationNavigation";
import { markNotificationRead, type UnreadCounts } from "../../api/notifications.api";

type Props = {
  item: NotificationItem;
  onDismiss: () => void;
  onCountsUpdate?: (counts: UnreadCounts) => void;
};

export function InAppNotificationBanner({ item, onDismiss, onCountsUpdate }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  const isHighPriority = item.priority > 0 || item.category === "MATRIMONY";

  const s = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          position: "absolute",
          top: insets.top + 8,
          left: spacing.md,
          right: spacing.md,
          zIndex: 9999,
          elevation: 12
        },
        card: {
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 10,
          padding: spacing.md,
          borderRadius: radius.md,
          borderWidth: 1,
          backgroundColor: colors.surface,
          borderColor: isHighPriority ? colors.primary : colors.border,
          shadowColor: "#000",
          shadowOpacity: 0.12,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 4 }
        },
        icon: {
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: isHighPriority ? colors.primary : colors.surfaceElevated
        },
        title: { fontSize: 14, fontWeight: "800", color: colors.text },
        body: { marginTop: 2, fontSize: 13, color: colors.textSecondary, lineHeight: 18 },
        close: { padding: 4 }
      }),
    [colors, insets.top, isHighPriority]
  );

  const onPress = () => {
    onDismiss();
    if (!item.isRead) {
      void markNotificationRead(item.id).then((c) => onCountsUpdate?.(c));
    }
    if (navigationRef.isReady()) {
      navigateFromNotification(navigationRef as never, item);
    }
  };

  return (
    <View style={s.wrap} pointerEvents="box-none">
      <Pressable style={s.card} onPress={onPress}>
        <View style={s.icon}>
          <Ionicons
            name={isHighPriority ? "heart" : "notifications"}
            size={18}
            color={isHighPriority ? colors.white : colors.primary}
          />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.title} numberOfLines={1}>
            {item.title}
          </Text>
          {item.body ? (
            <Text style={s.body} numberOfLines={2}>
              {item.body}
            </Text>
          ) : null}
        </View>
        <Pressable style={s.close} onPress={onDismiss} hitSlop={8}>
          <Ionicons name="close" size={20} color={colors.textMuted} />
        </Pressable>
      </Pressable>
    </View>
  );
}
