import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Linking,
  Modal,
  ScrollView,
  Platform,
  Image
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePlatform } from "../../context/PlatformContext";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { trackPlatformAdEvent } from "../../api/platform.api";

const FALLBACK_STORE =
  Platform.OS === "ios"
    ? "https://apps.apple.com"
    : "https://play.google.com/store";

function openStoreUrl(url?: string | null) {
  const target = (url || "").trim() || FALLBACK_STORE;
  void Linking.openURL(target);
}

export function PlatformGateOverlay() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const {
    bootstrap,
    loading,
    softUpdateDismissed,
    dismissSoftUpdate,
    activePopup,
    acknowledgePopup
  } = usePlatform();

  if (loading && !bootstrap) return null;

  const maintenance = bootstrap?.maintenance;
  const version = bootstrap?.version;

  if (maintenance?.enabled) {
    return (
      <View style={[styles.full, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Text style={[styles.title, { color: colors.text }]}>
          {maintenance.title || "Under Maintenance"}
        </Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          {maintenance.description || "We will be back shortly."}
        </Text>
        {maintenance.expectedEndAt ? (
          <Text style={[styles.meta, { color: colors.textSecondary }]}>
            Expected back: {new Date(maintenance.expectedEndAt).toLocaleString()}
          </Text>
        ) : null}
        {maintenance.contactInfo ? (
          <Text style={[styles.meta, { color: colors.textSecondary }]}>
            Contact: {maintenance.contactInfo}
          </Text>
        ) : null}
      </View>
    );
  }

  if (version?.forceUpdate) {
    return (
      <View style={[styles.full, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Text style={[styles.title, { color: colors.text }]}>Update required</Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>
          A new version is available. Please update to continue using Digital House.
        </Text>
        {version.releaseNotes ? (
          <ScrollView style={styles.notes}>
            <Text style={{ color: colors.textSecondary }}>{version.releaseNotes}</Text>
          </ScrollView>
        ) : null}
        <Pressable
          style={[styles.btn, { backgroundColor: colors.primary }]}
          onPress={() => openStoreUrl(version.storeUrl)}
        >
          <Text style={styles.btnText}>Update Now</Text>
        </Pressable>
      </View>
    );
  }

  // Prefer soft update, then popup — never stack two modals (freezes interaction)
  const showSoftUpdate = Boolean(version?.softUpdate && !softUpdateDismissed);
  const showPopup = Boolean(activePopup) && !showSoftUpdate;

  return (
    <>
      {showSoftUpdate ? (
        <Modal transparent animationType="fade" visible>
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.title, { color: colors.text, fontSize: 20 }]}>
                A new version is available.
              </Text>
              {version?.releaseNotes ? (
                <Text style={[styles.body, { color: colors.textSecondary }]}>
                  {version.releaseNotes}
                </Text>
              ) : null}
              <View style={styles.row}>
                <Pressable
                  style={[styles.btnGhost, { borderColor: colors.border }]}
                  onPress={dismissSoftUpdate}
                >
                  <Text style={{ color: colors.text }}>Later</Text>
                </Pressable>
                <Pressable
                  style={[styles.btn, { backgroundColor: colors.primary, flex: 1 }]}
                  onPress={() => openStoreUrl(version?.storeUrl)}
                >
                  <Text style={styles.btnText}>Update Now</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      ) : null}

      {showPopup && activePopup ? (
        <Modal transparent animationType="fade" visible>
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
              <Text style={[styles.title, { color: colors.text, fontSize: 20 }]}>
                {activePopup.title}
              </Text>
              <Text style={[styles.body, { color: colors.textSecondary }]}>{activePopup.body}</Text>
              <Pressable
                style={[styles.btn, { backgroundColor: colors.primary }]}
                onPress={() => void acknowledgePopup(activePopup.id)}
              >
                <Text style={styles.btnText}>
                  {activePopup.acknowledgementRequired ? "I understand" : "OK"}
                </Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      ) : null}
    </>
  );
}

export function PlatformBannerStrip() {
  const { bootstrap } = usePlatform();
  const banner = bootstrap?.banners?.[0];
  if (!banner) return null;

  const onPress = () => {
    const action = (banner.clickAction || "").trim();
    if (action.startsWith("http")) void Linking.openURL(action);
  };

  return (
    <Pressable
      onPress={banner.clickAction ? onPress : undefined}
      style={[styles.banner, { backgroundColor: banner.backgroundColor || "#0f172a" }]}
    >
      <Text style={styles.bannerText} numberOfLines={2}>
        {banner.icon ? `${banner.icon} ` : ""}
        {banner.message}
      </Text>
    </Pressable>
  );
}

/** Top announcement from Platform Management Announcement Center */
export function PlatformAnnouncementCard() {
  const { colors } = useTheme();
  const { bootstrap } = usePlatform();
  const item = bootstrap?.announcements?.[0];
  if (!item) return null;

  return (
    <View style={[styles.announcement, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {item.bannerImage ? (
        <Image source={{ uri: item.bannerImage }} style={styles.announcementImage} />
      ) : null}
      <Text style={[styles.announcementTitle, { color: colors.text }]}>{item.title}</Text>
      <Text style={[styles.announcementBody, { color: colors.textSecondary }]} numberOfLines={3}>
        {item.description}
      </Text>
    </View>
  );
}

/** Internal promo / banner ad for Home (tracks view + click) */
export function PlatformHomeAd() {
  const { colors } = useTheme();
  const { bootstrap } = usePlatform();
  const viewed = useRef<Set<number>>(new Set());

  const ad =
    bootstrap?.ads?.find(
      (a) =>
        !a.targetScreen ||
        a.targetScreen.toLowerCase() === "home" ||
        a.targetScreen.toLowerCase() === "feed"
    ) ?? bootstrap?.ads?.[0];

  useEffect(() => {
    if (!ad || viewed.current.has(ad.id)) return;
    viewed.current.add(ad.id);
    void trackPlatformAdEvent(ad.id, "view");
  }, [ad]);

  if (!ad) return null;

  const onPress = () => {
    void trackPlatformAdEvent(ad.id, "click");
    const action = (ad.clickAction || "").trim();
    if (action.startsWith("http")) void Linking.openURL(action);
  };

  return (
    <Pressable
      onPress={onPress}
      style={[styles.adCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      {ad.imageUrl ? <Image source={{ uri: ad.imageUrl }} style={styles.adImage} /> : null}
      <Text style={[styles.adTitle, { color: colors.text }]}>{ad.title}</Text>
      <Text style={[styles.adHint, { color: colors.textSecondary }]}>Sponsored</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  full: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    padding: spacing.xl,
    justifyContent: "center"
  },
  title: { fontSize: 24, fontWeight: "700", marginBottom: spacing.md },
  body: { fontSize: 15, lineHeight: 22, marginBottom: spacing.md },
  meta: { fontSize: 13, marginTop: spacing.sm },
  notes: { maxHeight: 160, marginBottom: spacing.lg },
  btn: {
    marginTop: spacing.md,
    borderRadius: radius.md,
    paddingVertical: 14,
    alignItems: "center"
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  btnGhost: {
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: "center"
  },
  row: { flexDirection: "row", gap: 12, marginTop: spacing.md },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    padding: spacing.lg
  },
  modalCard: {
    borderRadius: radius.lg,
    padding: spacing.xl
  },
  banner: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  bannerText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  announcement: {
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.md
  },
  announcementImage: {
    width: "100%",
    height: 120,
    borderRadius: radius.sm,
    marginBottom: spacing.sm
  },
  announcementTitle: { fontSize: 16, fontWeight: "700", marginBottom: 4 },
  announcementBody: { fontSize: 13, lineHeight: 18 },
  adCard: {
    marginHorizontal: spacing.md,
    marginVertical: spacing.sm,
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: "hidden",
    padding: spacing.md
  },
  adImage: { width: "100%", height: 140, borderRadius: radius.sm, marginBottom: spacing.sm },
  adTitle: { fontSize: 15, fontWeight: "600" },
  adHint: { fontSize: 11, marginTop: 4, textTransform: "uppercase", letterSpacing: 0.5 }
});
