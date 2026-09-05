import React, { useEffect, useMemo, useRef, useState, memo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Image } from "expo-image";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { feedCardShadow } from "../../theme/feedStyles";
import { getImageUrl } from "../../api/client";
import type { FeedAdvertisement } from "../../api/advertisement.api";
import { trackAdvertisementClick, trackAdvertisementImpression } from "../../api/advertisement.api";
import { isRasterPreviewUri, normalizeAdvertisementUrl } from "../../utils/advertisementUi";
import { advertisementFeedSubtitle, formatIndianPhone } from "../../utils/advertisementCopy";
import {
  formatAdValidUntil,
  getAdvertisementActions,
  openAdvertisementAction,
  resolveAdvertisementContacts,
  type AdvertisementClickAction
} from "../../utils/advertisementActions";
import { pauseAllFeedVideos } from "../../media/feedVideoPlayback";
import { AdvertisementViewerSheet } from "./AdvertisementViewerSheet";
import { appAlert } from "../../utils/appAlert";
import { promptReportAdvertisement } from "../../utils/promptReportAdvertisement";

type Props = {
  ad: FeedAdvertisement;
  placement: "home" | "explore" | "browse";
  preview?: boolean;
  /** Home slot visibility. Impression is recorded only after a short dwell. */
  slotVisible?: boolean;
};

function advertisementMediaUri(raw: string | null | undefined): string | null {
  const value = String(raw || "").trim();
  if (!value) return null;
  if (/^(file:|content:|data:|ph:|asset:)/i.test(value)) return value;
  return getImageUrl(value) || value;
}

function AdvertisementImpressionTracker({
  adId,
  placement,
  preview,
  slotVisible
}: {
  adId: number;
  placement: Props["placement"];
  preview?: boolean;
  slotVisible: boolean;
}) {
  const recorded = useRef(false);

  useEffect(() => {
    recorded.current = false;
  }, [adId]);

  useEffect(() => {
    if (preview || recorded.current || !slotVisible) return;
    const timer = setTimeout(() => {
      if (recorded.current) return;
      recorded.current = true;
      void trackAdvertisementImpression(adId, placement).catch(() => {});
    }, 700);
    return () => clearTimeout(timer);
  }, [adId, placement, preview, slotVisible]);

  return null;
}

const AdvertisementFeedMedia = memo(
  function AdvertisementFeedMedia({
    adId,
    mediaUri,
    showRaster,
    isVideo,
    mediaStyle,
    fallbackStyle,
    title,
    onOpen
  }: {
    adId: number;
    mediaUri: string;
    showRaster: boolean;
    isVideo: boolean;
    mediaStyle: object;
    fallbackStyle: object;
    title: string;
    onOpen: () => void;
  }) {
    const onOpenRef = useRef(onOpen);
    onOpenRef.current = onOpen;

    return (
      <Pressable
        onPress={() => onOpenRef.current()}
        accessibilityRole="button"
        accessibilityLabel={`Open ${title}`}
      >
        {showRaster ? (
          <Image
            source={{ uri: mediaUri }}
            style={mediaStyle}
            contentFit="cover"
            cachePolicy="memory-disk"
            recyclingKey={`ad-${adId}`}
            transition={0}
          />
        ) : (
          <View style={[mediaStyle, fallbackStyle]}>
            <Ionicons
              name={isVideo ? "play-circle-outline" : "image-outline"}
              size={40}
              color="rgba(255,255,255,0.85)"
            />
          </View>
        )}
        {isVideo ? (
          <View
            style={{
              ...StyleSheet.absoluteFill,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(0,0,0,0.22)"
            }}
            pointerEvents="none"
          >
            <Ionicons name="play-circle" size={52} color="rgba(255,255,255,0.96)" />
          </View>
        ) : null}
      </Pressable>
    );
  },
  (prev, next) =>
    prev.adId === next.adId &&
    prev.mediaUri === next.mediaUri &&
    prev.showRaster === next.showRaster &&
    prev.isVideo === next.isVideo &&
    prev.mediaStyle === next.mediaStyle &&
    prev.fallbackStyle === next.fallbackStyle &&
    prev.title === next.title
);

/**
 * Premium advertisement unit — not a PostCard.
 * Full-bleed 16:9 media, compact badge, actions only when a real target exists.
 */
function AdvertisementCardInner({ ad, placement, preview }: Omit<Props, "slotVisible">) {
  const { colors, mode } = useTheme();
  const opening = useRef(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [resolvedUrl, setResolvedUrl] = useState(ad.destinationUrl ?? ad.contact?.website ?? null);

  useEffect(() => {
    setResolvedUrl(ad.destinationUrl ?? ad.contact?.website ?? null);
  }, [ad.id, ad.destinationUrl, ad.contact?.website]);

  const isVideo = ad.mediaKind === "video" || ad.typeCode === "VIDEO";
  const mediaUri = advertisementMediaUri(ad.thumbnailUrl || ad.mediaUrl);
  const showRaster = Boolean(mediaUri) && isRasterPreviewUri(mediaUri, ad.mediaKind);
  const business = (ad.business?.name || ad.businessName || "").trim();
  const title = (ad.title || business).trim();
  const description = (
    ad.shortDescription ||
    ad.content?.shortDescription ||
    advertisementFeedSubtitle(ad.description)
  ).trim();
  const contacts = useMemo(
    () => resolveAdvertisementContacts(ad, resolvedUrl),
    [ad, resolvedUrl]
  );
  const actions = useMemo(() => getAdvertisementActions(ad, resolvedUrl), [ad, resolvedUrl]);
  const validUntil = formatAdValidUntil(ad.validUntil);
  const city = contacts.cityText;
  const showBusiness = Boolean(business) && business !== title;

  const s = useMemo(
    () =>
      StyleSheet.create({
        card: {
          marginHorizontal: placement === "home" ? 6 : spacing.sm,
          marginBottom: spacing.lg,
          borderRadius: placement === "home" ? 18 : radius.lg,
          backgroundColor: colors.surface,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: mode === "dark" ? "rgba(234,88,12,0.32)" : "rgba(234,88,12,0.18)",
          overflow: "hidden",
          ...feedCardShadow(mode)
        },
        header: {
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm
        },
        badge: {
          backgroundColor: mode === "dark" ? "rgba(234,88,12,0.22)" : "rgba(234,88,12,0.12)",
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: radius.full
        },
        badgeText: {
          fontSize: 9,
          fontWeight: "800",
          letterSpacing: 0.7,
          color: colors.accent
        },
        headerMeta: { flex: 1, fontSize: 12, fontWeight: "600", color: colors.textSecondary },
        videoHint: { fontSize: 11, fontWeight: "600", color: colors.textMuted },
        media: {
          width: "100%",
          aspectRatio: 16 / 9,
          backgroundColor: colors.black
        },
        playOverlay: {
          ...StyleSheet.absoluteFill,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(0,0,0,0.22)"
        },
        mediaFallback: { alignItems: "center", justifyContent: "center" },
        body: {
          paddingHorizontal: spacing.md,
          paddingTop: spacing.sm,
          paddingBottom: spacing.sm,
          gap: 8
        },
        title: {
          fontSize: 17,
          fontWeight: "800",
          color: colors.text,
          lineHeight: 22
        },
        desc: {
          fontSize: 13,
          lineHeight: 18,
          color: colors.textSecondary
        },
        meta: {
          flexDirection: "row",
          alignItems: "center",
          flexWrap: "wrap",
          gap: spacing.md,
          marginTop: 2
        },
        metaItem: { flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 1, maxWidth: "100%" },
        metaText: { fontSize: 12, color: colors.textSecondary, flexShrink: 1 },
        actions: {
          flexDirection: "row",
          flexWrap: "wrap",
          gap: spacing.sm,
          marginTop: 2
        },
        pill: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
          minHeight: 40,
          paddingHorizontal: 14,
          borderRadius: radius.full,
          backgroundColor: mode === "dark" ? colors.surfaceElevated : colors.background,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border
        },
        pillSolo: { flexGrow: 1 },
        pillText: { fontSize: 13, fontWeight: "700", color: colors.text }
      }),
    [colors, mode, placement]
  );

  const track = async (action: AdvertisementClickAction) => {
    if (preview) return;
    try {
      const res = await trackAdvertisementClick(ad.id, placement, undefined, action);
      const next = normalizeAdvertisementUrl(res.destinationUrl) || resolvedUrl;
      if (next) setResolvedUrl(next);
    } catch {
      /* actions still run */
    }
  };

  const runAction = async (action: AdvertisementClickAction) => {
    await track(action);
    const result = await openAdvertisementAction(action, {
      phone: contacts.phone,
      whatsapp: contacts.whatsapp,
      email: contacts.email,
      website: contacts.website,
      latitude: contacts.latitude,
      longitude: contacts.longitude,
      address: contacts.locationText
    });
    if (!result.ok && result.message) await appAlert("Advertisement", result.message);
  };

  const onOpen = async () => {
    if (opening.current) return;
    opening.current = true;
    pauseAllFeedVideos();
    try {
      await track("open");
      setSheetOpen(true);
    } finally {
      opening.current = false;
    }
  };

  const actionA11y = (id: AdvertisementClickAction, label: string) => {
    if (id === "call" && contacts.phone) return `Call ${formatIndianPhone(contacts.phone)}`;
    return label;
  };

  return (
    <>
      <View style={s.card} accessibilityRole="summary" accessibilityLabel={`Advertisement: ${title}`}>
        <View style={s.header}>
          <View style={s.badge}>
            <Text style={s.badgeText}>ADVERTISEMENT</Text>
          </View>
          {showBusiness ? (
            <Text style={s.headerMeta} numberOfLines={1}>
              {business}
            </Text>
          ) : (
            <View style={{ flex: 1 }} />
          )}
          {isVideo ? <Text style={s.videoHint}>Video</Text> : null}
          {preview ? null : (
            <Pressable
              onPress={() => promptReportAdvertisement(ad.id)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel="Report advertisement"
            >
              <Ionicons name="ellipsis-horizontal" size={18} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        {mediaUri ? (
          <AdvertisementFeedMedia
            adId={ad.id}
            mediaUri={mediaUri}
            showRaster={showRaster}
            isVideo={isVideo}
            mediaStyle={s.media}
            fallbackStyle={s.mediaFallback}
            title={title}
            onOpen={() => void onOpen()}
          />
        ) : null}

        <View style={s.body}>
          {title ? (
            <Pressable onPress={() => void onOpen()} accessibilityRole="button" accessibilityLabel={`Open ${title}`}>
              <Text style={s.title} numberOfLines={2}>
                {title}
              </Text>
            </Pressable>
          ) : null}
          {description ? (
            <Pressable onPress={() => void onOpen()}>
              <Text style={s.desc} numberOfLines={2}>
                {description}
              </Text>
            </Pressable>
          ) : null}

          {city || validUntil ? (
            <View style={s.meta}>
              {city ? (
                <View style={s.metaItem}>
                  <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
                  <Text style={s.metaText} numberOfLines={1}>
                    {city}
                  </Text>
                </View>
              ) : null}
              {validUntil ? (
                <View style={s.metaItem}>
                  <Ionicons name="calendar-outline" size={14} color={colors.textSecondary} />
                  <Text style={s.metaText} numberOfLines={1}>
                    Valid till {validUntil}
                  </Text>
                </View>
              ) : null}
            </View>
          ) : null}

          {actions.length > 0 ? (
            <View style={s.actions}>
              {actions.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => void runAction(item.id)}
                  style={[s.pill, actions.length === 1 && s.pillSolo]}
                  accessibilityRole="button"
                  accessibilityLabel={actionA11y(item.id, item.label)}
                >
                  <Ionicons
                    name={item.icon}
                    size={15}
                    color={item.id === "whatsapp" ? colors.success : colors.primary}
                  />
                  <Text style={s.pillText}>{item.label}</Text>
                </Pressable>
              ))}
            </View>
          ) : null}
        </View>
      </View>
      <AdvertisementViewerSheet
        visible={sheetOpen}
        ad={ad}
        destinationUrl={resolvedUrl}
        onClose={() => setSheetOpen(false)}
        onAction={(action) => void track(action)}
      />
    </>
  );
}

const AdvertisementCardVisual = memo(AdvertisementCardInner, (prev, next) => {
  return (
    prev.ad === next.ad &&
    prev.placement === next.placement &&
    prev.preview === next.preview
  );
});

export function AdvertisementCard({ ad, placement, preview, slotVisible = true }: Props) {
  return (
    <>
      <AdvertisementImpressionTracker
        adId={ad.id}
        placement={placement}
        preview={preview}
        slotVisible={slotVisible}
      />
      <AdvertisementCardVisual ad={ad} placement={placement} preview={preview} />
    </>
  );
}
