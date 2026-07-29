import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  useWindowDimensions
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { AvatarImage } from "../../components/ui/AvatarImage";
import { spacing, radius } from "../../theme/spacing";
import type { HeaderActionId } from "../../components/home/Header";
import { openMessagesInbox } from "../../navigation/openMessages";
import { usePlatform } from "../../context/PlatformContext";
import { MENU_FEATURE_MAP } from "../../api/platform.api";

type MenuRouteParams = { messageCount?: number };

type MenuItem = {
  id: HeaderActionId;
  label: string;
  subtitle?: string;
  icon: keyof typeof Ionicons.glyphMap;
  tint: string;
  tintBg: string;
};

const EXPLORE: MenuItem[] = [
  {
    id: "posts",
    label: "Posts",
    subtitle: "Community feed",
    icon: "megaphone-outline",
    tint: "#2563EB",
    tintBg: "#EFF6FF"
  },
  {
    id: "jobs",
    label: "Jobs",
    subtitle: "Open roles",
    icon: "briefcase-outline",
    tint: "#0D9488",
    tintBg: "#F0FDFA"
  },
  {
    id: "marketplace",
    label: "Marketplace",
    subtitle: "Buy & sell",
    icon: "cart-outline",
    tint: "#EA580C",
    tintBg: "#FFF7ED"
  },
  {
    id: "matrimony",
    label: "Matrimony",
    subtitle: "Find matches",
    icon: "heart-outline",
    tint: "#E11D48",
    tintBg: "#FFF1F2"
  },
  {
    id: "helping-hand",
    label: "Helping Hand",
    subtitle: "Community help",
    icon: "hand-left-outline",
    tint: "#7C3AED",
    tintBg: "#F5F3FF"
  },
  {
    id: "prominent-people",
    label: "Prominent People",
    subtitle: "Hall of Fame",
    icon: "ribbon-outline",
    tint: "#1D4ED8",
    tintBg: "#DBEAFE"
  },
  {
    id: "community",
    label: "Updates",
    subtitle: "Announcements",
    icon: "newspaper-outline",
    tint: "#0369A1",
    tintBg: "#F0F9FF"
  }
];

const CONNECT: MenuItem[] = [
  {
    id: "search-members",
    label: "Find Members",
    icon: "search-outline",
    tint: "#2563EB",
    tintBg: "#EFF6FF"
  },
  {
    id: "connections",
    label: "Connections",
    icon: "people-outline",
    tint: "#0D9488",
    tintBg: "#F0FDFA"
  },
  {
    id: "messages",
    label: "Messages",
    icon: "chatbubble-outline",
    tint: "#EA580C",
    tintBg: "#FFF7ED"
  },
  {
    id: "help-support",
    label: "Help & Support",
    subtitle: "FAQs, tickets, contact",
    icon: "help-buoy-outline",
    tint: "#0369A1",
    tintBg: "#F0F9FF"
  }
];

export function MenuScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ Menu: MenuRouteParams }, "Menu">>();
  const { colors, mode } = useTheme();
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const { isFeatureEnabled, isMenuVisible } = usePlatform();
  const messageCount = route.params?.messageCount ?? 0;

  const filterItem = (item: MenuItem) => {
    const flag = MENU_FEATURE_MAP[item.id];
    if (flag && !isFeatureEnabled(flag)) return false;

    const featureOnlyIds = new Set([
      "posts",
      "community",
      "create",
      "messages",
      "settings",
      "connections",
      "help-support"
    ]);
    if (featureOnlyIds.has(item.id)) return true;

    const menuCode =
      item.id === "helping-hand"
        ? "helping_hands"
        : item.id === "prominent-people"
          ? "prominent_people"
          : item.id === "search-members"
            ? "members"
            : item.id;

    return isMenuVisible(menuCode);
  };

  const exploreItems = useMemo(() => EXPLORE.filter(filterItem), [isFeatureEnabled, isMenuVisible]);
  const connectItems = useMemo(() => CONNECT.filter(filterItem), [isFeatureEnabled, isMenuVisible]);

  const gridGap = spacing.md;
  const gridPad = spacing.lg;
  const tileWidth = (width - gridPad * 2 - gridGap) / 2;
  const wideTileWidth = width - gridPad * 2;

  const s = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: colors.background },
        header: {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.sm,
          paddingTop: spacing.sm,
          backgroundColor: colors.surface,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
          gap: 8
        },
        iconBtn: {
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.surfaceElevated
        },
        iconBtnPressed: { opacity: 0.7 },
        headerTitle: { flex: 1, fontSize: 18, fontWeight: "700", color: colors.text },
        scroll: { flex: 1 },
        content: {
          paddingHorizontal: gridPad,
          paddingTop: spacing.lg,
          paddingBottom: spacing.xxxl + insets.bottom
        },
        greeting: {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          padding: spacing.lg,
          marginBottom: spacing.xl,
          borderWidth: 1,
          borderColor: colors.border
        },
        greetingTop: {
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md
        },
        greetingTopPressed: { opacity: 0.7 },
        greetingHi: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
        greetingName: {
          marginTop: 1,
          fontSize: 20,
          fontWeight: "800",
          color: colors.text
        },
        greetingHandle: { marginTop: 1, fontSize: 12, color: colors.textMuted },
        greetingSub: {
          marginTop: spacing.md,
          fontSize: 13,
          lineHeight: 18,
          color: colors.textSecondary
        },
        createBtn: {
          marginTop: spacing.md,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          backgroundColor: colors.primary,
          borderRadius: radius.md,
          paddingVertical: 14,
          paddingHorizontal: spacing.lg
        },
        createBtnPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
        createText: { fontSize: 15, fontWeight: "700", color: colors.white },
        sectionLabel: {
          fontSize: 12,
          fontWeight: "700",
          color: colors.textMuted,
          letterSpacing: 0.8,
          textTransform: "uppercase",
          marginBottom: spacing.md
        },
        grid: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: gridGap,
          marginBottom: spacing.xl
        },
        tile: {
          width: tileWidth,
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          padding: spacing.md,
          borderWidth: 1,
          borderColor: colors.border,
          minHeight: 112
        },
        tileWide: {
          width: wideTileWidth,
          minHeight: 0,
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.md,
          paddingVertical: spacing.lg
        },
        tilePressed: {
          backgroundColor: mode === "dark" ? colors.surfaceElevated : "#F8FAFC",
          borderColor: colors.primary + "55",
          transform: [{ scale: 0.98 }]
        },
        tileIcon: {
          width: 40,
          height: 40,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: spacing.sm
        },
        tileIconWide: { marginBottom: 0 },
        tileLabel: { fontSize: 15, fontWeight: "700", color: colors.text },
        tileSub: {
          marginTop: 2,
          fontSize: 12,
          lineHeight: 16,
          color: colors.textSecondary
        },
        listCard: {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: "hidden",
          marginBottom: spacing.xl
        },
        row: {
          flexDirection: "row",
          alignItems: "center",
          minHeight: 60,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.md,
          gap: spacing.md,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border
        },
        rowLast: { borderBottomWidth: 0 },
        rowPressed: { backgroundColor: colors.surfaceElevated },
        rowIcon: {
          width: 40,
          height: 40,
          borderRadius: 12,
          alignItems: "center",
          justifyContent: "center"
        },
        rowBody: { flex: 1 },
        rowLabel: { fontSize: 15, fontWeight: "600", color: colors.text },
        rowSub: { marginTop: 2, fontSize: 12, lineHeight: 16, color: colors.textSecondary },
        rowRight: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
        badge: {
          minWidth: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: colors.error,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: 6
        },
        badgeText: { fontSize: 11, fontWeight: "700", color: colors.white },
        empty: {
          alignItems: "center",
          gap: spacing.sm,
          paddingVertical: spacing.xxxl,
          paddingHorizontal: spacing.lg
        },
        emptyTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
        emptyText: {
          fontSize: 13,
          lineHeight: 18,
          color: colors.textSecondary,
          textAlign: "center"
        }
      }),
    [colors, mode, tileWidth, wideTileWidth, insets.bottom, gridPad, gridGap]
  );

  const onActionPress = (actionId: HeaderActionId) => {
    if (actionId === "create") navigation.navigate("CreatePost");
    else if (actionId === "posts" || actionId === "community") navigation.navigate("Home");
    else if (actionId === "search-members") navigation.navigate("SearchMembers");
    else if (actionId === "connections") navigation.navigate("Connections");
    else if (actionId === "messages") openMessagesInbox(navigation);
    else if (actionId === "settings") navigation.navigate("Settings");
    else if (actionId === "jobs") navigation.navigate("JobsHome");
    else if (actionId === "marketplace") navigation.navigate("MarketplaceHome");
    else if (actionId === "helping-hand") navigation.navigate("HelpingHandsHome");
    else if (actionId === "prominent-people") navigation.navigate("ProminentPeopleHome");
    else if (actionId === "matrimony") navigation.navigate("MatrimonyHome");
    else if (actionId === "help-support") navigation.navigate("HelpSupport");
  };

  const fullName = (user?.fullName || "Member").trim();
  const firstName = fullName.split(/\s+/)[0];
  const chipBg = (item: MenuItem) => (mode === "dark" ? `${item.tint}26` : item.tintBg);

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: insets.top + spacing.xs }]}>
        <Pressable
          style={({ pressed }) => [s.iconBtn, pressed && s.iconBtnPressed]}
          onPress={() => navigation.goBack()}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={s.headerTitle}>Menu</Text>
        <Pressable
          style={({ pressed }) => [s.iconBtn, pressed && s.iconBtnPressed]}
          onPress={() => navigation.navigate("Settings")}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Settings"
        >
          <Ionicons name="settings-outline" size={20} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={s.greeting}>
          <Pressable
            style={({ pressed }) => [s.greetingTop, pressed && s.greetingTopPressed]}
            onPress={() => navigation.navigate("Profile")}
            accessibilityRole="button"
            accessibilityLabel="Open your profile"
          >
            <AvatarImage uri={user?.profilePhoto} name={fullName} size={48} />
            <View style={{ flex: 1 }}>
              <Text style={s.greetingHi}>Welcome back</Text>
              <Text style={s.greetingName} numberOfLines={1}>
                {firstName}
              </Text>
              {user?.username ? (
                <Text style={s.greetingHandle} numberOfLines={1}>
                  @{user.username}
                </Text>
              ) : null}
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
          </Pressable>
          <Text style={s.greetingSub}>Jump into community modules or create something new.</Text>
          <Pressable
            style={({ pressed }) => [s.createBtn, pressed && s.createBtnPressed]}
            onPress={() => onActionPress("create")}
            accessibilityRole="button"
            accessibilityLabel="Create post"
          >
            <Ionicons name="add-circle" size={20} color={colors.white} />
            <Text style={s.createText}>Create Post</Text>
          </Pressable>
        </View>

        {exploreItems.length > 0 ? (
          <>
            <Text style={s.sectionLabel}>Explore</Text>
            <View style={s.grid}>
              {exploreItems.map((item, idx) => {
                // An odd item count would leave a half-width tile alone on the last row.
                const isWide =
                  exploreItems.length % 2 === 1 && idx === exploreItems.length - 1;
                return (
                  <Pressable
                    key={item.id}
                    style={({ pressed }) => [
                      s.tile,
                      isWide && s.tileWide,
                      pressed && s.tilePressed
                    ]}
                    onPress={() => onActionPress(item.id)}
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                  >
                    <View
                      style={[
                        s.tileIcon,
                        isWide && s.tileIconWide,
                        { backgroundColor: chipBg(item) }
                      ]}
                    >
                      <Ionicons name={item.icon as any} size={22} color={item.tint} />
                    </View>
                    <View style={isWide ? { flex: 1 } : undefined}>
                      <Text style={s.tileLabel}>{item.label}</Text>
                      {item.subtitle ? <Text style={s.tileSub}>{item.subtitle}</Text> : null}
                    </View>
                    {isWide ? (
                      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                    ) : null}
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}

        {connectItems.length > 0 ? (
          <>
            <Text style={s.sectionLabel}>Connect</Text>
            <View style={s.listCard}>
              {connectItems.map((item, idx) => {
                const isLast = idx === connectItems.length - 1;
                const badge =
                  item.id === "messages" && messageCount > 0 ? messageCount : null;
                return (
                  <Pressable
                    key={item.id}
                    style={({ pressed }) => [
                      s.row,
                      isLast && s.rowLast,
                      pressed && s.rowPressed
                    ]}
                    onPress={() => onActionPress(item.id)}
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                  >
                    <View style={[s.rowIcon, { backgroundColor: chipBg(item) }]}>
                      <Ionicons name={item.icon as any} size={20} color={item.tint} />
                    </View>
                    <View style={s.rowBody}>
                      <Text style={s.rowLabel}>{item.label}</Text>
                      {item.subtitle ? <Text style={s.rowSub}>{item.subtitle}</Text> : null}
                    </View>
                    <View style={s.rowRight}>
                      {badge != null && badge > 0 ? (
                        <View style={s.badge}>
                          <Text style={s.badgeText}>{badge > 99 ? "99+" : badge}</Text>
                        </View>
                      ) : null}
                      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </>
        ) : null}

        {exploreItems.length === 0 && connectItems.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="apps-outline" size={32} color={colors.textMuted} />
            <Text style={s.emptyTitle}>No modules available</Text>
            <Text style={s.emptyText}>
              Community modules are currently switched off. Check back later or contact support.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
