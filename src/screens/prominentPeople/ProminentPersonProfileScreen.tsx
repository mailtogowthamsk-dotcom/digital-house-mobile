import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Image,
  useWindowDimensions,
  RefreshControl
} from "react-native";
import { useFocusEffect, useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  getProminentPerson,
  type ProminentPersonDetail
} from "../../api/prominentPeople.api";
import { getErrorStatus, getImageUrl } from "../../api/client";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { AvatarImage } from "../../components/ui/AvatarImage";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import type { RootStackParamList } from "../../navigation/types";

const ACCENT = "#1D4ED8";
const ACCENT_SOFT = "#DBEAFE";

function hexWithAlpha(hex: string | null | undefined, alphaHex: string, fallback: string): string {
  if (!hex || !/^#([0-9A-Fa-f]{6})$/.test(hex)) return fallback;
  return `${hex}${alphaHex}`;
}

function SectionBlock({
  title,
  body,
  colors
}: {
  title: string;
  body: string | null | undefined;
  colors: { text: string; textSecondary: string; surface: string; border: string };
}) {
  if (!body?.trim()) return null;
  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radius.lg,
        borderWidth: 1,
        borderColor: colors.border,
        padding: spacing.lg,
        marginBottom: spacing.md
      }}
    >
      <Text style={{ fontSize: 14, fontWeight: "800", color: colors.text, marginBottom: 8 }}>
        {title}
      </Text>
      <Text style={{ fontSize: 14, lineHeight: 22, color: colors.textSecondary }}>{body}</Text>
    </View>
  );
}

export function ProminentPersonProfileScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, "ProminentPersonProfile">>();
  const personId = route.params.id;
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors, mode: themeMode } = useTheme();

  const [person, setPerson] = useState<ProminentPersonDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const galleryGap = spacing.sm;
  const galleryCols = 3;
  const gallerySize =
    (width - spacing.lg * 2 - galleryGap * (galleryCols - 1)) / galleryCols;

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await getProminentPerson(personId);
      setPerson(data);
    } catch (e) {
      const status = getErrorStatus(e);
      if (status === 401) navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      else if (status === 403)
        navigation.reset({ index: 0, routes: [{ name: "PendingApproval" }] });
      else setError(e instanceof Error ? e.message : "Failed to load profile");
    }
  }, [navigation, personId]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load().finally(() => setLoading(false));
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const s = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: colors.background },
        backFloat: {
          position: "absolute",
          top: insets.top + spacing.sm,
          left: spacing.md,
          zIndex: 20,
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(15,23,42,0.45)"
        },
        hero: {
          width: "100%",
          height: 220,
          backgroundColor: colors.surfaceElevated
        },
        heroOverlay: {
          ...StyleSheet.absoluteFill,
          backgroundColor: "rgba(15,23,42,0.25)"
        },
        identity: {
          marginTop: -48,
          alignItems: "center",
          paddingHorizontal: spacing.lg,
          marginBottom: spacing.lg
        },
        avatarRing: {
          borderWidth: 4,
          borderColor: colors.background,
          borderRadius: 56,
          shadowColor: "#0F172A",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.15,
          shadowRadius: 8,
          elevation: 4
        },
        verifiedRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          marginTop: spacing.md
        },
        name: {
          fontSize: 24,
          fontWeight: "800",
          color: colors.text,
          textAlign: "center"
        },
        verifiedIcon: {
          width: 22,
          height: 22,
          borderRadius: 11,
          backgroundColor: ACCENT,
          alignItems: "center",
          justifyContent: "center"
        },
        designation: {
          marginTop: 6,
          fontSize: 15,
          fontWeight: "700",
          color: ACCENT,
          textAlign: "center"
        },
        occupation: {
          marginTop: 4,
          fontSize: 13,
          fontWeight: "600",
          color: colors.textSecondary,
          textAlign: "center"
        },
        catTag: {
          marginTop: spacing.sm,
          paddingHorizontal: 12,
          paddingVertical: 5,
          borderRadius: radius.full
        },
        catTagText: { fontSize: 12, fontWeight: "700" },
        content: {
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.xxxl + insets.bottom
        },
        sectionTitle: {
          fontSize: 14,
          fontWeight: "800",
          color: colors.text,
          marginBottom: spacing.md
        },
        timelineCard: {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          padding: spacing.lg,
          marginBottom: spacing.md
        },
        timelineRow: {
          flexDirection: "row",
          gap: spacing.md
        },
        timelineRail: { alignItems: "center", width: 28 },
        yearBubble: {
          minWidth: 28,
          paddingHorizontal: 4,
          paddingVertical: 4,
          borderRadius: radius.sm,
          backgroundColor: themeMode === "dark" ? "#1E3A8A" : ACCENT_SOFT,
          alignItems: "center"
        },
        yearText: { fontSize: 10, fontWeight: "800", color: ACCENT },
        railLine: {
          flex: 1,
          width: 2,
          backgroundColor: colors.border,
          marginTop: 4,
          minHeight: 24
        },
        timelineBody: { flex: 1, paddingBottom: spacing.md },
        timelineTitle: { fontSize: 14, fontWeight: "700", color: colors.text },
        timelineDesc: {
          marginTop: 4,
          fontSize: 13,
          lineHeight: 19,
          color: colors.textSecondary
        },
        galleryGrid: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: galleryGap
        },
        galleryItem: {
          width: gallerySize,
          height: gallerySize,
          borderRadius: radius.md,
          overflow: "hidden",
          backgroundColor: colors.surfaceElevated
        },
        galleryImage: { width: "100%", height: "100%" },
        center: {
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          padding: spacing.xl
        },
        errorText: { color: colors.error, textAlign: "center", marginBottom: spacing.md }
      }),
    [colors, galleryGap, gallerySize, insets.bottom, insets.top, themeMode]
  );

  if (loading && !person) {
    return (
      <View style={[s.root, s.center]}>
        <ActivityIndicator size="large" color={ACCENT} />
      </View>
    );
  }

  if (error && !person) {
    return (
      <View style={[s.root, s.center]}>
        <Pressable style={s.backFloat} onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>
        <Text style={s.errorText}>{error}</Text>
        <PrimaryButton
          title="Retry"
          onPress={() => {
            setLoading(true);
            void load().finally(() => setLoading(false));
          }}
        />
      </View>
    );
  }

  if (!person) return null;

  const heroUri = getImageUrl(person.heroImageUrl || person.profileImageUrl);
  const catColor = person.category?.color || ACCENT;

  return (
    <View style={s.root}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void onRefresh()}
            colors={[ACCENT]}
            tintColor={ACCENT}
          />
        }
      >
        <View>
          {heroUri ? (
            <Image source={{ uri: heroUri }} style={s.hero} resizeMode="cover" />
          ) : (
            <View style={[s.hero, { backgroundColor: themeMode === "dark" ? "#1E3A8A" : ACCENT_SOFT }]} />
          )}
          <View style={s.heroOverlay} pointerEvents="none" />
          <Pressable
            style={s.backFloat}
            onPress={() => navigation.goBack()}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
        </View>

        <View style={s.identity}>
          <View style={s.avatarRing}>
            <AvatarImage
              uri={person.profileImageUrl}
              name={person.fullName}
              size={104}
              placeholderColor={hexWithAlpha(catColor, "22", ACCENT_SOFT)}
              textColor={catColor}
            />
          </View>
          <View style={s.verifiedRow}>
            <Text style={s.name}>{person.fullName}</Text>
            {person.verified ? (
              <View style={s.verifiedIcon}>
                <Ionicons name="checkmark" size={14} color="#fff" />
              </View>
            ) : null}
          </View>
          {person.currentDesignation ? (
            <Text style={s.designation}>{person.currentDesignation}</Text>
          ) : null}
          {person.occupation ? <Text style={s.occupation}>{person.occupation}</Text> : null}
          {person.category ? (
            <View
              style={[
                s.catTag,
                { backgroundColor: hexWithAlpha(person.category.color, "22", ACCENT_SOFT) }
              ]}
            >
              <Text style={[s.catTagText, { color: person.category.color || ACCENT }]}>
                {person.category.label}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={s.content}>
          <SectionBlock title="Biography" body={person.biography} colors={colors} />
          <SectionBlock title="Achievements" body={person.achievements} colors={colors} />
          <SectionBlock title="Education" body={person.education} colors={colors} />
          <SectionBlock title="Awards" body={person.awards} colors={colors} />
          <SectionBlock
            title="Community Contributions"
            body={person.communityContribution}
            colors={colors}
          />

          {person.timeline?.length ? (
            <View style={s.timelineCard}>
              <Text style={s.sectionTitle}>Timeline</Text>
              {person.timeline.map((entry, idx) => {
                const isLast = idx === person.timeline.length - 1;
                return (
                  <View key={entry.id} style={s.timelineRow}>
                    <View style={s.timelineRail}>
                      <View style={s.yearBubble}>
                        <Text style={s.yearText}>{entry.year}</Text>
                      </View>
                      {!isLast ? <View style={s.railLine} /> : null}
                    </View>
                    <View style={[s.timelineBody, isLast && { paddingBottom: 0 }]}>
                      <Text style={s.timelineTitle}>{entry.title}</Text>
                      {entry.description ? (
                        <Text style={s.timelineDesc}>{entry.description}</Text>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          ) : null}

          {person.gallery?.length ? (
            <View style={{ marginBottom: spacing.md }}>
              <Text style={s.sectionTitle}>Photo Gallery</Text>
              <View style={s.galleryGrid}>
                {person.gallery.map((g) => {
                  const uri = getImageUrl(g.imageUrl);
                  return (
                    <View key={g.id} style={s.galleryItem}>
                      {uri ? (
                        <Image source={{ uri }} style={s.galleryImage} resizeMode="cover" />
                      ) : null}
                    </View>
                  );
                })}
              </View>
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}
