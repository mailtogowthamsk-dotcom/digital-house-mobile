import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  Image,
  StyleSheet,
  Pressable,
  ScrollView,
  useWindowDimensions,
  Platform
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useVideoPlayer, VideoView } from "expo-video";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import type { FeedAdvertisement } from "../../api/advertisement.api";
import { adBusinessCategoryLabel, isRasterPreviewUri } from "../../utils/advertisementUi";
import { formatIndianPhone } from "../../utils/advertisementCopy";
import {
  formatAdValidUntil,
  getAdvertisementActions,
  openAdvertisementAction,
  resolveAdvertisementContacts,
  type AdvertisementClickAction
} from "../../utils/advertisementActions";
import { pauseAllFeedVideos } from "../../media/feedVideoPlayback";
import { appAlert } from "../../utils/appAlert";

type Props = {
  visible: boolean;
  ad: FeedAdvertisement | null;
  destinationUrl?: string | null;
  onClose: () => void;
  onOpenWebsite?: (url: string) => void;
  onAction?: (action: AdvertisementClickAction) => void;
};

function SheetVideo({ uri, poster, fullBleed }: { uri: string; poster?: string | null; fullBleed?: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const player = useVideoPlayer(uri, (p) => {
    p.loop = true;
    p.muted = true;
  });

  useEffect(() => {
    pauseAllFeedVideos();
    try {
      player.muted = true;
      player.play();
      setPlaying(true);
    } catch {
      /* native attach */
    }
    return () => {
      try {
        player.pause();
      } catch {
        /* released */
      }
    };
  }, [player]);

  useEffect(() => {
    try {
      player.muted = muted;
    } catch {
      /* ignore */
    }
  }, [muted, player]);

  const toggle = () => {
    try {
      if (player.playing) {
        player.pause();
        setPlaying(false);
      } else {
        pauseAllFeedVideos();
        player.play();
        setPlaying(true);
      }
    } catch {
      /* ignore */
    }
  };

  return (
    <View style={[videoStyles.stage, fullBleed && videoStyles.stageBleed]}>
      <Pressable
        onPress={toggle}
        style={StyleSheet.absoluteFill}
        accessibilityLabel={playing ? "Pause video" : "Play video"}
      >
        {poster ? (
          <Image source={{ uri: poster }} style={videoStyles.poster} resizeMode="cover" />
        ) : null}
        <VideoView
          style={videoStyles.video}
          player={player}
          contentFit="contain"
          nativeControls={false}
          fullscreenOptions={{ enable: false }}
          surfaceType={Platform.OS === "android" ? "textureView" : undefined}
        />
        {!playing ? (
          <View style={videoStyles.playWrap} pointerEvents="none">
            <Ionicons name="play-circle" size={64} color="rgba(255,255,255,0.95)" />
          </View>
        ) : null}
      </Pressable>
      <Pressable
        onPress={() => setMuted((m) => !m)}
        style={videoStyles.mute}
        accessibilityLabel={muted ? "Unmute" : "Mute"}
      >
        <Ionicons name={muted ? "volume-mute" : "volume-high"} size={18} color="#fff" />
      </Pressable>
    </View>
  );
}

const videoStyles = StyleSheet.create({
  stage: {
    width: "100%",
    aspectRatio: 16 / 9,
    backgroundColor: "#0B1220",
    borderRadius: 14,
    overflow: "hidden"
  },
  video: { width: "100%", height: "100%" },
  poster: { ...StyleSheet.absoluteFill, opacity: 0.35 },
  playWrap: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center"
  },
  mute: {
    position: "absolute",
    right: 10,
    bottom: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(15,23,42,0.62)",
    alignItems: "center",
    justifyContent: "center"
  },
  stageBleed: {
    borderRadius: 0
  }
});

function displayWebsite(url: string): string {
  return url.replace(/^https?:\/\//i, "").replace(/\/$/, "");
}

type ContactRowProps = {
  icon: React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  value: string;
  onPress: () => void;
  last?: boolean;
  iconColor: string;
  borderColor: string;
  labelColor: string;
  valueColor: string;
  chevronColor: string;
  iconBg: string;
};

function ContactRow({
  icon,
  label,
  value,
  onPress,
  last,
  iconColor,
  borderColor,
  labelColor,
  valueColor,
  chevronColor,
  iconBg
}: ContactRowProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      style={({ pressed }) => [
        contactRowStyles.row,
        !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: borderColor },
        pressed && { opacity: 0.72 }
      ]}
    >
      <View style={[contactRowStyles.iconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View style={contactRowStyles.copy}>
        <Text style={[contactRowStyles.label, { color: labelColor }]}>{label}</Text>
        <Text style={[contactRowStyles.value, { color: valueColor }]} numberOfLines={2}>
          {value}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={chevronColor} />
    </Pressable>
  );
}

const contactRowStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 12
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center"
  },
  copy: { flex: 1, minWidth: 0, gap: 2 },
  label: { fontSize: 11, fontWeight: "700", letterSpacing: 0.3, textTransform: "uppercase" },
  value: { fontSize: 14, fontWeight: "600", lineHeight: 20 }
});

export function AdvertisementViewerSheet({
  visible,
  ad,
  destinationUrl,
  onClose,
  onOpenWebsite,
  onAction
}: Props) {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const sheetMaxHeight = Math.round(windowHeight * 0.9);

  const contacts = ad ? resolveAdvertisementContacts(ad, destinationUrl) : null;
  const actions = ad ? getAdvertisementActions(ad, destinationUrl) : [];
  const phone = contacts?.phone || null;
  const whatsapp = contacts?.whatsapp || null;
  const email = contacts?.email || null;
  const website = contacts?.website || null;
  const loc = contacts?.locationText || null;
  const validUntil = formatAdValidUntil(ad?.validUntil);
  const businessName = ad?.business?.name || ad?.businessName || "";
  const categoryLabel = adBusinessCategoryLabel(ad?.business?.category || ad?.businessCategory);
  const heading = ad?.title || businessName || "Advertisement";
  const showBusinessSubtitle = Boolean(businessName && heading !== businessName);
  const isVideo = ad?.mediaKind === "video" || ad?.typeCode === "VIDEO";
  const poster = ad?.thumbnailUrl || null;
  const videoUri = isVideo ? ad?.mediaUrl : null;
  const imageUri =
    !isVideo && isRasterPreviewUri(ad?.thumbnailUrl || ad?.mediaUrl, ad?.mediaKind)
      ? ad?.thumbnailUrl || ad?.mediaUrl
      : null;
  const hasMedia = Boolean(videoUri || imageUri);

  const primaryActions = actions.filter((item) => item.id === "call" || item.id === "whatsapp");
  const secondaryActions =
    primaryActions.length > 0
      ? actions.filter((item) => item.id !== "call" && item.id !== "whatsapp")
      : actions.slice(1);
  const dockPrimaries = primaryActions.length > 0 ? primaryActions : actions.slice(0, 1);
  const hasFooter = actions.length > 0;
  const hasContactCard = Boolean(phone || whatsapp || website || email || loc);
  const websiteHint =
    dockPrimaries.length === 1 && dockPrimaries[0]?.id === "website" && website
      ? displayWebsite(website)
      : null;
  const iconBg = mode === "dark" ? "rgba(37,99,235,0.18)" : "rgba(37,99,235,0.08)";
  const whatsappIconBg = mode === "dark" ? "rgba(34,197,94,0.18)" : "rgba(34,197,94,0.12)";
  const fadeTop = mode === "dark" ? "rgba(20,28,43,0)" : "rgba(255,255,255,0)";

  const s = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          backgroundColor: "rgba(15, 23, 42, 0.55)",
          justifyContent: "flex-end"
        },
        sheet: {
          maxHeight: sheetMaxHeight,
          height: hasMedia ? undefined : sheetMaxHeight,
          width: "100%",
          backgroundColor: colors.surface,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          overflow: "hidden",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -8 },
          shadowOpacity: mode === "dark" ? 0.4 : 0.16,
          shadowRadius: 20,
          elevation: 28
        },
        handleWrap: { alignItems: "center", paddingTop: 10, paddingBottom: 6 },
        handle: {
          width: 40,
          height: 4,
          borderRadius: 2,
          backgroundColor: mode === "dark" ? "#334155" : "#CBD5E1"
        },
        header: {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.md,
          gap: 10
        },
        badge: {
          backgroundColor: mode === "dark" ? "rgba(234,88,12,0.22)" : "rgba(234,88,12,0.12)",
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: radius.full
        },
        badgeText: { fontSize: 10, fontWeight: "800", color: colors.accent, letterSpacing: 0.5 },
        headerSpacer: { flex: 1 },
        closeBtn: {
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: mode === "dark" ? "#1E293B" : "#F1F5F9"
        },
        closeBtnHero: {
          width: 36,
          height: 36,
          borderRadius: 18,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(15,23,42,0.55)"
        },
        scrollWrap: hasMedia ? { flexGrow: 0 } : { flex: 1 },
        scroll: hasMedia ? { maxHeight: Math.round(windowHeight * 0.38) } : { flex: 1 },
        body: {
          paddingHorizontal: spacing.lg,
          paddingTop: hasMedia ? spacing.md : 0,
          paddingBottom: spacing.xxl,
          gap: spacing.md
        },
        mediaHero: {
          width: "100%",
          backgroundColor: "#0B1220"
        },
        heroImage: {
          width: "100%",
          aspectRatio: 16 / 9,
          backgroundColor: "#0B1220"
        },
        heroScrim: {
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 88
        },
        heroChrome: {
          ...StyleSheet.absoluteFill,
          paddingTop: 8,
          paddingHorizontal: spacing.md
        },
        heroTopRow: {
          flexDirection: "row",
          alignItems: "center"
        },
        titleBlock: { gap: 8 },
        title: { ...typography.h2, fontWeight: "800", color: colors.text, letterSpacing: -0.3 },
        subtitle: { fontSize: 14, fontWeight: "600", color: colors.textSecondary },
        categoryChip: {
          alignSelf: "flex-start",
          backgroundColor: mode === "dark" ? "#1E293B" : "#F1F5F9",
          paddingHorizontal: 10,
          paddingVertical: 5,
          borderRadius: radius.full
        },
        categoryText: { fontSize: 12, fontWeight: "700", color: colors.textSecondary },
        desc: { ...typography.body, color: colors.text, lineHeight: 24 },
        metaRow: {
          flexDirection: "row",
          alignItems: "center",
          alignSelf: "flex-start",
          gap: 6,
          backgroundColor: mode === "dark" ? "#1E293B" : "#F1F5F9",
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: radius.full
        },
        metaText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
        contactCard: {
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          backgroundColor: mode === "dark" ? colors.surfaceElevated : "#F8FAFC",
          borderRadius: radius.lg,
          overflow: "hidden"
        },
        scrollFade: {
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 28
        },
        footer: {
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
          paddingBottom: Math.max(insets.bottom, 16) + 8,
          gap: spacing.sm
        },
        footerHint: {
          fontSize: 12,
          fontWeight: "600",
          color: colors.textMuted,
          textAlign: "center",
          marginBottom: 2
        },
        primaryRow: { flexDirection: "row", gap: 10 },
        primaryBtn: {
          flex: 1,
          minHeight: 52,
          borderRadius: 14,
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 8
        },
        primaryLabel: { fontSize: 16, fontWeight: "800", color: colors.white },
        secondaryRow: { flexDirection: "row", gap: 8 },
        secondaryBtn: {
          flex: 1,
          minHeight: 52,
          borderRadius: 14,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          backgroundColor: mode === "dark" ? "#1E293B" : "#F8FAFC",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
          paddingVertical: 8,
          paddingHorizontal: 4
        },
        secondaryLabel: { fontSize: 11, fontWeight: "700", color: colors.text }
      }),
    [colors, mode, insets.bottom, sheetMaxHeight, hasMedia, windowHeight]
  );

  if (!ad) return null;

  const run = async (action: AdvertisementClickAction) => {
    onAction?.(action);
    const result = await openAdvertisementAction(action, {
      phone,
      whatsapp,
      email,
      website,
      latitude: contacts?.latitude,
      longitude: contacts?.longitude,
      address: loc
    });
    if (action === "website" && website) onOpenWebsite?.(website);
    if (!result.ok && result.message) await appAlert("Advertisement", result.message);
  };

  const contactRowTheme = {
    borderColor: colors.border,
    labelColor: colors.textMuted,
    valueColor: colors.text,
    chevronColor: colors.textMuted
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
      presentationStyle="overFullScreen"
      {...(Platform.OS === "android" ? { navigationBarTranslucent: true } : null)}
    >
      <View style={s.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Dismiss advertisement" />
        <View style={s.sheet}>
          {hasMedia ? (
            <View style={s.mediaHero}>
              {visible && videoUri ? (
                <SheetVideo uri={videoUri} poster={poster} fullBleed />
              ) : imageUri ? (
                <Image source={{ uri: imageUri }} style={s.heroImage} resizeMode="cover" />
              ) : null}
              <LinearGradient
                colors={["rgba(15,23,42,0.55)", "rgba(15,23,42,0.12)", "transparent"]}
                locations={[0, 0.55, 1]}
                style={s.heroScrim}
                pointerEvents="none"
              />
              <View style={s.heroChrome} pointerEvents="box-none">
                <View style={s.handleWrap}>
                  <View style={[s.handle, { backgroundColor: "rgba(255,255,255,0.7)" }]} />
                </View>
                <View style={s.heroTopRow}>
                  <View style={s.badge}>
                    <Text style={s.badgeText}>ADVERTISEMENT</Text>
                  </View>
                  <View style={s.headerSpacer} />
                  <Pressable onPress={onClose} style={s.closeBtnHero} accessibilityLabel="Close">
                    <Ionicons name="close" size={18} color="#FFFFFF" />
                  </Pressable>
                </View>
              </View>
            </View>
          ) : (
            <>
              <View style={s.handleWrap}>
                <View style={s.handle} />
              </View>
              <View style={s.header}>
                <View style={s.badge}>
                  <Text style={s.badgeText}>ADVERTISEMENT</Text>
                </View>
                <View style={s.headerSpacer} />
                <Pressable onPress={onClose} style={s.closeBtn} accessibilityLabel="Close">
                  <Ionicons name="close" size={18} color={colors.text} />
                </Pressable>
              </View>
            </>
          )}
          <View style={s.scrollWrap}>
            <ScrollView
              style={s.scroll}
              contentContainerStyle={s.body}
              showsVerticalScrollIndicator
              bounces
            >
              <View style={s.titleBlock}>
                <Text style={s.title}>{heading}</Text>
                {showBusinessSubtitle ? <Text style={s.subtitle}>{businessName}</Text> : null}
                {categoryLabel ? (
                  <View style={s.categoryChip}>
                    <Text style={s.categoryText}>{categoryLabel}</Text>
                  </View>
                ) : null}
              </View>

              {ad.shortDescription ? <Text style={s.desc}>{ad.shortDescription}</Text> : null}
              {ad.description && ad.description !== ad.shortDescription ? (
                <Text style={s.desc}>{ad.description}</Text>
              ) : null}

              {validUntil ? (
                <View style={s.metaRow}>
                  <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                  <Text style={s.metaText}>Valid till {validUntil}</Text>
                </View>
              ) : null}

              {hasContactCard ? (
                <View style={s.contactCard}>
                  {phone ? (
                    <ContactRow
                      icon="call-outline"
                      label="Phone"
                      value={formatIndianPhone(phone)}
                      onPress={() => void run("call")}
                      last={!whatsapp && !website && !email && !loc}
                      iconColor={colors.primary}
                      iconBg={iconBg}
                      {...contactRowTheme}
                    />
                  ) : null}
                  {whatsapp ? (
                    <ContactRow
                      icon="logo-whatsapp"
                      label="WhatsApp"
                      value={formatIndianPhone(whatsapp)}
                      onPress={() => void run("whatsapp")}
                      last={!website && !email && !loc}
                      iconColor={colors.success}
                      iconBg={whatsappIconBg}
                      {...contactRowTheme}
                    />
                  ) : null}
                  {website ? (
                    <ContactRow
                      icon="globe-outline"
                      label="Website"
                      value={displayWebsite(website)}
                      onPress={() => void run("website")}
                      last={!email && !loc}
                      iconColor={colors.primary}
                      iconBg={iconBg}
                      {...contactRowTheme}
                    />
                  ) : null}
                  {email ? (
                    <ContactRow
                      icon="mail-outline"
                      label="Email"
                      value={email}
                      onPress={() => void run("email")}
                      last={!loc}
                      iconColor={colors.primary}
                      iconBg={iconBg}
                      {...contactRowTheme}
                    />
                  ) : null}
                  {loc ? (
                    <ContactRow
                      icon="location-outline"
                      label="Location"
                      value={loc}
                      onPress={() => void run("directions")}
                      last
                      iconColor={colors.primary}
                      iconBg={iconBg}
                      {...contactRowTheme}
                    />
                  ) : null}
                </View>
              ) : null}
            </ScrollView>
            <LinearGradient colors={[fadeTop, colors.surface]} style={s.scrollFade} pointerEvents="none" />
          </View>

          {hasFooter ? (
            <View style={s.footer}>
              {websiteHint ? <Text style={s.footerHint}>{websiteHint}</Text> : null}
              {dockPrimaries.length > 0 ? (
                <View style={s.primaryRow}>
                  {dockPrimaries.map((item) => {
                    const isWhatsApp = item.id === "whatsapp";
                    return (
                      <Pressable
                        key={item.id}
                        onPress={() => void run(item.id)}
                        style={({ pressed }) => [
                          s.primaryBtn,
                          {
                            backgroundColor: isWhatsApp ? colors.success : colors.primary,
                            opacity: pressed ? 0.88 : 1
                          }
                        ]}
                        accessibilityRole="button"
                        accessibilityLabel={
                          item.id === "call" && phone ? `Call ${formatIndianPhone(phone)}` : item.label
                        }
                      >
                        <Ionicons name={item.icon} size={18} color={colors.white} />
                        <Text style={s.primaryLabel}>{item.label}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              ) : null}
              {secondaryActions.length > 0 ? (
                <View style={s.secondaryRow}>
                  {secondaryActions.map((item) => (
                    <Pressable
                      key={item.id}
                      onPress={() => void run(item.id)}
                      style={({ pressed }) => [s.secondaryBtn, pressed && { opacity: 0.78 }]}
                      accessibilityRole="button"
                      accessibilityLabel={item.label}
                    >
                      <Ionicons
                        name={item.icon}
                        size={18}
                        color={item.id === "whatsapp" ? colors.success : colors.primary}
                      />
                      <Text style={s.secondaryLabel} numberOfLines={1}>
                        {item.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
            </View>
          ) : (
            <View style={{ height: Math.max(insets.bottom, spacing.md) + 8 }} />
          )}
        </View>
      </View>
    </Modal>
  );
}
