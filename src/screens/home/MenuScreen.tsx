import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import type { HeaderActionId } from "../../components/home/Header";

type MenuRouteParams = { messageCount?: number };

const SECTIONS: { title: string; items: { id: HeaderActionId; label: string; icon: keyof typeof Ionicons.glyphMap }[] }[] = [
  {
    title: "Create",
    items: [{ id: "create", label: "Create Post", icon: "add-circle-outline" }]
  },
  {
    title: "Explore",
    items: [
      { id: "posts", label: "Posts", icon: "megaphone-outline" },
      { id: "jobs", label: "Jobs", icon: "briefcase-outline" },
      { id: "marketplace", label: "Marketplace", icon: "cart-outline" },
      { id: "matrimony", label: "Matrimony", icon: "heart-outline" },
      { id: "helping-hand", label: "Helping Hand", icon: "hand-left-outline" },
      { id: "community", label: "Community Updates", icon: "newspaper-outline" }
    ]
  },
  {
    title: "Connect",
    items: [{ id: "messages", label: "Messages", icon: "chatbubble-outline" }]
  },
  {
    title: "Settings",
    items: [{ id: "settings", label: "Settings", icon: "settings-outline" }]
  }
];

export function MenuScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ Menu: MenuRouteParams }, "Menu">>();
  const { colors, mode } = useTheme();
  const messageCount = route.params?.messageCount ?? 0;

  const s = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        scroll: { flex: 1 },
        scrollContent: { padding: spacing.lg, paddingBottom: spacing.xxxl },
        section: { marginBottom: spacing.xxl },
        sectionTitle: {
          fontSize: 13,
          fontWeight: "600",
          color: colors.textSecondary,
          textTransform: "uppercase",
          letterSpacing: 1,
          marginBottom: spacing.md,
          paddingHorizontal: spacing.xs
        },
        sectionList: {
          backgroundColor: colors.surface,
          borderRadius: radius.md,
          overflow: "hidden",
          ...Platform.select({ web: {} as any, default: { elevation: 1 } }),
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.04,
          shadowRadius: 4
        },
        row: {
          flexDirection: "row",
          alignItems: "center",
          minHeight: 56,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.lg,
          gap: spacing.lg,
          borderBottomWidth: 1,
          borderBottomColor: colors.border
        },
        rowPressed: { backgroundColor: colors.surfaceElevated },
        rowPrimary: {
          backgroundColor: mode === "dark" ? colors.surfaceElevated + "80" : "#EFF6FF",
          borderBottomColor: mode === "dark" ? colors.border : "rgba(37,99,235,0.15)",
          borderBottomWidth: 0
        },
        rowLast: { borderBottomWidth: 0 },
        rowPrimaryPressed: {
          backgroundColor: mode === "dark" ? colors.surfaceElevated : "#DBEAFE"
        },
        iconBox: {
          width: 40,
          height: 40,
          borderRadius: radius.sm,
          backgroundColor: colors.surfaceElevated,
          alignItems: "center",
          justifyContent: "center"
        },
        iconBoxPrimary: { backgroundColor: colors.primary },
        rowLabel: {
          flex: 1,
          fontSize: 16,
          fontWeight: "500",
          color: colors.text
        },
        rowLabelPrimary: { fontWeight: "600", color: colors.primary },
        badge: {
          minWidth: 24,
          height: 24,
          borderRadius: 12,
          backgroundColor: colors.error,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 6
        },
        badgeText: {
          fontSize: 12,
          fontWeight: "700",
          color: colors.white
        }
      }),
    [colors, mode]
  );

  const onActionPress = (actionId: HeaderActionId) => {
    if (actionId === "create") navigation.navigate("CreatePost");
    if (actionId === "messages") navigation.navigate("Messages");
    if (actionId === "settings") navigation.navigate("Settings");
  };

  return (
    <View style={[s.container, { paddingBottom: insets.bottom + spacing.lg }]}>
      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {SECTIONS.map((section) => (
          <View key={section.title} style={s.section}>
            <Text style={s.sectionTitle}>{section.title}</Text>
            <View style={s.sectionList}>
              {section.items.map((item, idx) => {
                const isCreate = item.id === "create";
                const isLast = idx === section.items.length - 1;
                const badge = item.id === "messages" && messageCount > 0 ? messageCount : null;
                return (
                  <Pressable
                    key={item.id}
                    style={({ pressed }) => [
                      s.row,
                      isCreate && s.rowPrimary,
                      isLast && s.rowLast,
                      pressed && (isCreate ? s.rowPrimaryPressed : s.rowPressed)
                    ]}
                    onPress={() => onActionPress(item.id)}
                  >
                    <View style={[s.iconBox, isCreate && s.iconBoxPrimary]}>
                      <Ionicons
                        name={item.icon as any}
                        size={22}
                        color={isCreate ? colors.white : colors.text}
                      />
                    </View>
                    <Text style={[s.rowLabel, isCreate && s.rowLabelPrimary]}>
                      {item.label}
                    </Text>
                    {badge != null && badge > 0 && (
                      <View style={s.badge}>
                        <Text style={s.badgeText}>{badge > 99 ? "99+" : badge}</Text>
                      </View>
                    )}
                    {!badge && (
                      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
