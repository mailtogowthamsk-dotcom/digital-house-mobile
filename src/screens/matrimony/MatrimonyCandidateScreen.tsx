import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, Image, StyleSheet, ActivityIndicator, Linking, Pressable, TextInput } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  getMatrimonyCandidate,
  openMatrimonyProfile,
  sendMatrimonyInterest,
  respondMatrimonyInterest,
  getMatrimonyHoroscope,
  requestMatrimonyHoroscope,
  shareMatrimonyHoroscope,
  revealMatrimonyContact,
  saveMatrimonyProfile,
  unsaveMatrimonyProfile,
  blockMatrimonyProfile,
  reportMatrimonyProfile,
  MATRIMONY_REPORT_REASONS,
  getMatrimonyPaymentsConfig,
  type CandidateDetail,
  type ProfileLockedTeaser
} from "../../api/matrimony.api";
import { getImageUrl } from "../../api/client";
import { useTheme } from "../../theme/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { checkoutMatrimonyContactReveal } from "../../services/matrimonyCheckout";
import { spacing, radius } from "../../theme/spacing";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { MatrimonyProfileSection } from "../../components/matrimony/MatrimonyProfileSection";
import { MatrimonyChipRow } from "../../components/matrimony/MatrimonyChip";
import { buildDiscoverChips, interestStatusLabel } from "../../components/matrimony/matrimonyUi";
import { useMatrimonyBrowseGuard } from "../../hooks/useMatrimonyBrowseGuard";
import { appAlert } from "../../utils/appAlert";

export function MatrimonyCandidateScreen() {
  useMatrimonyBrowseGuard();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const userId = route.params?.userId as number;
  const routeInterestId = route.params?.interestId as number | undefined;
  const fromWhoViewedMe = route.params?.fromWhoViewedMe === true;
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { user } = useAuth();
  const [profile, setProfile] = useState<CandidateDetail | null>(null);
  const [teaser, setTeaser] = useState<ProfileLockedTeaser | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [interestIntro, setInterestIntro] = useState("");
  const [acceptIntro, setAcceptIntro] = useState("");
  const [contactPriceInr, setContactPriceInr] = useState(500);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getMatrimonyCandidate(userId);
      if (result.locked) {
        setTeaser(result.teaser);
        setProfile(null);
      } else {
        setProfile(result.profile);
        setTeaser(null);
      }
    } catch (e: unknown) {
      const err = e as { response?: { status?: number; data?: { message?: string } }; message?: string };
      const status = err.response?.status;
      const msg =
        err.response?.data?.message ??
        (e instanceof Error ? e.message : "Failed to load profile");
      const title =
        status === 404
          ? "Profile unavailable"
          : fromWhoViewedMe
            ? "Cannot open profile"
            : "Error";
      appAlert(title, msg);
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [userId, navigation, fromWhoViewedMe]);

  const onOpenProfile = async () => {
    if (!teaser?.canOpen && teaser?.openRequiresPlan) {
      navigation.navigate("MatrimonyPlans");
      return;
    }
    setActing(true);
    try {
      const opened = await openMatrimonyProfile(userId);
      setProfile(opened);
      setTeaser(null);
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string; openRequiresPlan?: string } } };
      const msg = err.response?.data?.message ?? (e instanceof Error ? e.message : "Could not open");
      appAlert("Open profile", msg, [
        { text: "View plans", onPress: () => navigation.navigate("MatrimonyPlans") },
        { text: "OK" }
      ]);
    } finally {
      setActing(false);
    }
  };

  React.useEffect(() => {
    void load();
  }, [load]);

  React.useEffect(() => {
    void getMatrimonyPaymentsConfig()
      .then((cfg) => setContactPriceInr(Math.round(cfg.contactAmountPaise / 100)))
      .catch(() => {});
  }, []);

  const onSendInterest = async () => {
    setActing(true);
    try {
      const res = await sendMatrimonyInterest(userId, interestIntro.trim() || undefined);
      appAlert(
        res.mutualMatch ? "Mutual match!" : "Interest sent",
        res.mutualMatch
          ? "You are now matched. Chat and horoscope exchange are unlocked."
          : "They can accept or decline your interest."
      );
      await load();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      const msg =
        err.response?.data?.message ??
        (e instanceof Error ? e.message : "Could not send interest. Try again.");
      appAlert("Send interest", msg);
    } finally {
      setActing(false);
    }
  };

  const onRespond = async (action: "ACCEPT" | "DECLINE") => {
    const interestId = routeInterestId ?? profile?.pendingInterestId;
    if (!interestId) return;
    setActing(true);
    try {
      const res = await respondMatrimonyInterest(
        interestId,
        action,
        action === "ACCEPT" ? acceptIntro.trim() || undefined : undefined
      );
      appAlert(
        action === "ACCEPT" ? (res.mutualMatch ? "Mutual match!" : "Accepted") : "Declined",
        res.mutualMatch ? "Both interests accepted — chat unlocked." : undefined
      );
      await load();
    } catch (e) {
      appAlert("Error", e instanceof Error ? e.message : "Failed");
    } finally {
      setActing(false);
    }
  };

  const openHoroscope = async () => {
    try {
      const { url } = await getMatrimonyHoroscope(userId);
      if (url) await Linking.openURL(url);
      else appAlert("Horoscope", "Document not available.");
    } catch (e) {
      appAlert("Horoscope", e instanceof Error ? e.message : "Available after mutual match only.");
    }
  };

  const onRequestHoroscope = async () => {
    setActing(true);
    try {
      await requestMatrimonyHoroscope(userId);
      appAlert("Request sent", "They will be notified to share their horoscope.");
    } catch (e) {
      appAlert("Horoscope", e instanceof Error ? e.message : "Failed");
    } finally {
      setActing(false);
    }
  };

  const onShareHoroscope = async () => {
    setActing(true);
    try {
      await shareMatrimonyHoroscope(userId);
      appAlert("Shared", "Your horoscope is now visible to your match.");
      await load();
    } catch (e) {
      appAlert("Horoscope", e instanceof Error ? e.message : "Failed");
    } finally {
      setActing(false);
    }
  };

  const showContact = async () => {
    if (profile?.contactPaymentStatus !== "PAID") {
      appAlert(
        `Reveal contact — ₹${contactPriceInr}`,
        "One-time payment per profile after mutual match.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: `Pay ₹${contactPriceInr}`,
            onPress: async () => {
              setActing(true);
              try {
                const res = await checkoutMatrimonyContactReveal(userId, {
                  name: user?.fullName ?? undefined,
                  email: user?.email ?? undefined
                });
                appAlert("Contact", res.mobile ? `Mobile: ${res.mobile}` : "No mobile on file.");
                await load();
              } catch (e) {
                appAlert("Payment", e instanceof Error ? e.message : "Failed");
              } finally {
                setActing(false);
              }
            }
          }
        ]
      );
      return;
    }
    try {
      const { mobile } = await revealMatrimonyContact(userId);
      appAlert("Contact", mobile ? `Mobile: ${mobile}` : "No mobile on file.");
    } catch (e) {
      appAlert("Contact", e instanceof Error ? e.message : "Available after mutual match.");
    }
  };

  const toggleSave = async () => {
    if (!profile) return;
    setActing(true);
    try {
      if (profile.saved) {
        await unsaveMatrimonyProfile(userId);
      } else {
        await saveMatrimonyProfile(userId);
      }
      await load();
    } catch (e) {
      appAlert("Error", e instanceof Error ? e.message : "Failed");
    } finally {
      setActing(false);
    }
  };

  const confirmBlock = () => {
    appAlert("Block profile?", "You will not see each other in browse or messages.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Block",
        style: "destructive",
        onPress: async () => {
          setActing(true);
          try {
            await blockMatrimonyProfile(userId);
            navigation.goBack();
          } catch (e) {
            appAlert("Error", e instanceof Error ? e.message : "Failed");
          } finally {
            setActing(false);
          }
        }
      }
    ]);
  };

  const submitReport = async (reasonCode: string) => {
    setActing(true);
    try {
      await reportMatrimonyProfile(userId, reasonCode);
      appAlert("Thank you", "Report submitted. Our team will review it.");
    } catch (e) {
      appAlert("Report", e instanceof Error ? e.message : "Failed");
    } finally {
      setActing(false);
    }
  };

  const openReportReasons = () => {
    appAlert("Report profile", "Why are you reporting this profile?", [
      ...MATRIMONY_REPORT_REASONS.map((r) => ({
        text: r.label,
        onPress: () => void submitReport(r.code)
      })),
      { text: "Cancel", style: "cancel" }
    ]);
  };

  const openSafetyMenu = () => {
    if (!profile) return;
    appAlert("Profile options", undefined, [
      {
        text: profile.saved ? "Remove bookmark" : "Save profile",
        onPress: () => void toggleSave()
      },
      { text: "Report profile", onPress: openReportReasons },
      { text: "Block profile", style: "destructive", onPress: confirmBlock },
      { text: "Cancel", style: "cancel" }
    ]);
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.background,
          paddingTop: insets.top
        }}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (teaser && !profile) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[styles.topBar, { paddingTop: insets.top, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => navigation.goBack()} style={styles.topBarBtn} hitSlop={8}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={[styles.topBarTitle, { color: colors.text }]}>Profile</Text>
          <View style={styles.topBarSpacer} />
        </View>
        <ScrollView contentContainerStyle={{ padding: spacing.lg }}>
          <View style={[styles.lockedCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={{ fontSize: 40, textAlign: "center" }}>🔒</Text>
            <Text style={[styles.lockedTitle, { color: colors.text }]}>
              {teaser.name}
              {teaser.age != null ? ` · ${teaser.age}` : ""}
            </Text>
            <Text style={{ textAlign: "center", color: colors.textSecondary }}>{teaser.district}</Text>
            <View style={{ alignItems: "center", marginVertical: 10 }}>
              <Text style={styles.starBadgeLocked}>{teaser.starLabel}</Text>
            </View>
            <MatrimonyChipRow labels={teaser.matchTags} />
            <Text style={{ color: colors.textSecondary, fontSize: 13, lineHeight: 20, marginTop: 12 }}>
              {teaser.canOpen
                ? "Open this profile to see photo, horoscope, full details, and send interest."
                : teaser.openRequiresPlan === "PLATINUM"
                  ? "★★ strong-match profiles need Platinum."
                  : "Subscribe to Gold or Platinum to open profiles."}
            </Text>
            <PrimaryButton
              title={
                teaser.canOpen
                  ? "Open profile"
                  : teaser.openRequiresPlan === "PLATINUM"
                    ? "Upgrade to Platinum"
                    : "View plans"
              }
              onPress={() => void onOpenProfile()}
              loading={acting}
              style={{ marginTop: spacing.md }}
            />
          </View>
        </ScrollView>
      </View>
    );
  }

  if (!profile) {
    return null;
  }

  const uri = profile.photoUrl ? getImageUrl(profile.photoUrl) ?? profile.photoUrl : null;
  const chips = buildDiscoverChips(profile);
  const status = interestStatusLabel(profile.interestStatus);
  const subline = [profile.district, profile.height, profile.occupation].filter(Boolean).join(" · ");

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: spacing.xxxl }}
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient colors={["#1e3a5f", "#3B5BDB"]} style={[styles.hero, { paddingTop: insets.top }]}>
          <View style={styles.heroBar}>
            <Pressable onPress={() => navigation.goBack()} style={styles.heroIconBtn} hitSlop={8}>
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </Pressable>
            <Text style={styles.heroBarTitle}>Profile</Text>
            <View style={styles.heroBarActions}>
              <Pressable
                onPress={() => void toggleSave()}
                style={styles.heroIconBtn}
                hitSlop={8}
                disabled={acting}
              >
                <Ionicons
                  name={profile.saved ? "bookmark" : "bookmark-outline"}
                  size={20}
                  color="#fff"
                />
              </Pressable>
              <Pressable
                onPress={openSafetyMenu}
                style={styles.heroIconBtn}
                hitSlop={8}
                disabled={acting}
              >
                <Ionicons name="ellipsis-horizontal" size={20} color="#fff" />
              </Pressable>
            </View>
          </View>
          {uri ? (
            <Image source={{ uri }} style={styles.heroPhoto} />
          ) : (
            <View style={[styles.heroPhoto, styles.heroPhotoPh]}>
              <Text style={{ fontSize: 36, color: "#fff" }}>👤</Text>
            </View>
          )}
          <Text style={styles.heroName}>
            {profile.name}
            {profile.age != null ? ` · ${profile.age} yrs` : ""}
          </Text>
          {subline ? <Text style={styles.heroSub}>{subline}</Text> : null}
          <View style={styles.heroBadges}>
            {profile.verified ? (
              <View style={styles.verifiedPill}>
                <Text style={styles.verifiedText}>● Verified</Text>
              </View>
            ) : null}
            {!profile.mutualMatch ? (
              <View style={[styles.statusPill, status.tone === "pending" && styles.statusPending]}>
                <Text
                  style={[
                    styles.statusText,
                    status.tone === "pending" && { color: "#92400E" }
                  ]}
                >
                  {status.label}
                </Text>
              </View>
            ) : null}
          </View>
        </LinearGradient>

        <View style={styles.body}>
          {chips.length > 0 && (
            <View style={styles.sectionPad}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>PROFILE HIGHLIGHTS</Text>
              <MatrimonyChipRow labels={chips} />
            </View>
          )}

          {profile.interestStatus === "SENT_PENDING" && (
            <View style={styles.waitBanner}>
              <Text style={styles.waitTitle}>⏳ Waiting for response</Text>
              <Text style={styles.waitBody}>
                Your interest was sent. You will be notified when they accept. Contact unlocks after mutual
                match.
              </Text>
            </View>
          )}

          {profile.canRespondInterest && (routeInterestId ?? profile.pendingInterestId) ? (
            <View style={styles.actionCard}>
              <TextInput
                value={acceptIntro}
                onChangeText={setAcceptIntro}
                placeholder="Optional message when accepting (max 500 chars)"
                placeholderTextColor={colors.textMuted}
                maxLength={500}
                multiline
                style={[styles.introInput, { borderColor: colors.border, color: colors.text }]}
              />
              <PrimaryButton title="Accept interest" onPress={() => onRespond("ACCEPT")} loading={acting} />
              <PrimaryButton
                title="Decline"
                variant="outline"
                onPress={() => onRespond("DECLINE")}
                disabled={acting}
                style={{ marginTop: 8 }}
              />
            </View>
          ) : null}

          {profile.canSendInterest ? (
            <View style={styles.actionCard}>
              <TextInput
                value={interestIntro}
                onChangeText={setInterestIntro}
                placeholder="Optional intro message (max 500 chars)"
                placeholderTextColor={colors.textMuted}
                maxLength={500}
                multiline
                style={[styles.introInput, { borderColor: colors.border, color: colors.text }]}
              />
              <PrimaryButton
                title="Express interest"
                onPress={() => void onSendInterest()}
                loading={acting}
              />
            </View>
          ) : null}

          {profile.mutualMatch && (
            <View style={styles.matchBanner}>
              <Text style={styles.matchTitle}>🎉 Mutual interest</Text>
              <Text style={styles.matchBody}>Chat, horoscope, and contact options are unlocked.</Text>
              {profile.chatEnabled && (
                <PrimaryButton
                  title="Open chat"
                  style={{ marginTop: 10 }}
                  onPress={() =>
                    navigation.navigate("Chat", {
                      otherUserId: userId,
                      name: profile.name,
                      profileImage: profile.photoUrl
                    })
                  }
                />
              )}
              {profile.horoscopeAvailable && !profile.horoscopeVisible && (
                <>
                  <PrimaryButton
                    title="Request horoscope"
                    variant="outline"
                    onPress={onRequestHoroscope}
                    loading={acting}
                    style={{ marginTop: 8 }}
                  />
                  <PrimaryButton
                    title="Share my horoscope"
                    variant="outline"
                    onPress={onShareHoroscope}
                    disabled={acting}
                    style={{ marginTop: 8 }}
                  />
                </>
              )}
              {profile.horoscopeVisible && (
                <PrimaryButton
                  title="View horoscope"
                  variant="outline"
                  onPress={openHoroscope}
                  style={{ marginTop: 8 }}
                />
              )}
            </View>
          )}

          <MatrimonyProfileSection
            title="Personal details"
            icon="👤"
            fields={[
              { label: "Marital status", value: profile.maritalStatus },
              { label: "Height · Complexion", value: [profile.height, profile.complexion].filter(Boolean).join(" · ") },
              { label: "About me", value: profile.aboutMe }
            ]}
          />

          <MatrimonyProfileSection
            title="Community"
            icon="🕉"
            fields={[
              { label: "Kulam", value: profile.kulam ?? profile.kulamLabel },
              { label: "Rashi · Nakshatram", value: [profile.rashi, profile.nakshatram].filter(Boolean).join(" · ") },
              { label: "Dosham", value: profile.dosham }
            ]}
          />

          <MatrimonyProfileSection
            title="Education & career"
            icon="🎓"
            fields={[
              { label: "Education", value: profile.education },
              { label: "Occupation", value: profile.occupation }
            ]}
          />

          {profile.horoscopeAvailable && (
            <View style={[styles.mediaCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.mediaTitle, { color: colors.text }]}>📄 Horoscope</Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 10 }}>
                {profile.horoscopeVisible
                  ? "Available — tap View horoscope above"
                  : "Shared after mutual match"}
              </Text>
            </View>
          )}

          <View style={[styles.contactBox, { borderColor: colors.border }]}>
            <View style={styles.contactHead}>
              <Text style={{ fontSize: 18 }}>📞</Text>
              <Text style={[styles.contactTitle, { color: colors.text }]}>Contact details</Text>
            </View>
            {profile.contactVisible || profile.contactPaymentStatus === "PAID" ? (
              <PrimaryButton title="Reveal contact" variant="outline" onPress={showContact} />
            ) : profile.mutualMatch ? (
              <PrimaryButton
                title={`Pay ₹${contactPriceInr} & reveal contact`}
                onPress={showContact}
              />
            ) : (
              <>
                <Text style={[styles.contactLocked, { color: colors.textSecondary }]}>
                  {profile.mutualMatch
                    ? "Mutual match confirmed. Use Reveal contact when ready."
                    : "Send interest and wait for acceptance. Contact is available after mutual match."}
                </Text>
                {!profile.mutualMatch && profile.canSendInterest && (
                  <PrimaryButton
                    title="Send interest first"
                    onPress={() => void onSendInterest()}
                    style={{ marginTop: 10 }}
                  />
                )}
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  topBarBtn: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center"
  },
  topBarTitle: { flex: 1, textAlign: "center", fontSize: 17, fontWeight: "700" },
  topBarSpacer: { width: 40 },
  hero: { alignItems: "center", paddingBottom: spacing.md },
  heroBar: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    minHeight: 44,
    marginBottom: spacing.sm
  },
  heroBarTitle: {
    flex: 1,
    textAlign: "center",
    color: "rgba(255,255,255,0.92)",
    fontSize: 16,
    fontWeight: "700"
  },
  heroBarActions: { flexDirection: "row", alignItems: "center", gap: 4 },
  heroIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.14)"
  },
  heroPhoto: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.35)",
    marginBottom: spacing.sm
  },
  heroPhotoPh: { alignItems: "center", justifyContent: "center", backgroundColor: "rgba(255,255,255,0.15)" },
  heroName: { color: "#fff", fontSize: 20, fontWeight: "800" },
  heroSub: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 4 },
  heroBadges: { flexDirection: "row", gap: 8, marginTop: 10, flexWrap: "wrap", justifyContent: "center" },
  verifiedPill: { backgroundColor: "#DCFCE7", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  verifiedText: { color: "#16A34A", fontSize: 11, fontWeight: "700" },
  statusPill: { backgroundColor: "rgba(255,255,255,0.2)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  statusPending: { backgroundColor: "#FEF3C7" },
  statusText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  body: { padding: spacing.lg, paddingTop: spacing.md },
  sectionPad: { marginBottom: spacing.md },
  sectionLabel: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5, marginBottom: 6 },
  waitBanner: {
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FCD34D",
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md
  },
  waitTitle: { fontSize: 14, fontWeight: "800", color: "#92400E", marginBottom: 6 },
  waitBody: { fontSize: 12, color: "#92400E", lineHeight: 18 },
  actionCard: { marginBottom: spacing.md },
  introInput: {
    borderWidth: 1,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
    minHeight: 56,
    fontSize: 14,
    textAlignVertical: "top"
  },
  matchBanner: {
    backgroundColor: "#DCFCE7",
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: "#86EFAC"
  },
  matchTitle: { fontSize: 15, fontWeight: "800", color: "#14532D" },
  matchBody: { fontSize: 13, color: "#166534", marginTop: 4, lineHeight: 18 },
  mediaCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm
  },
  mediaTitle: { fontSize: 14, fontWeight: "800" },
  contactBox: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: "dashed",
    padding: spacing.md,
    marginTop: spacing.sm
  },
  contactHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  contactTitle: { fontSize: 15, fontWeight: "800" },
  contactLocked: { fontSize: 13, lineHeight: 20 },
  lockedCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.lg
  },
  lockedTitle: { fontSize: 20, fontWeight: "800", textAlign: "center", marginTop: 8 },
  starBadgeLocked: {
    fontSize: 14,
    fontWeight: "800",
    color: "#B45309",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    overflow: "hidden"
  }
});
