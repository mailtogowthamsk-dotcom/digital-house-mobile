import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Linking, Pressable, TextInput } from "react-native";
import { Image } from "expo-image";
import * as WebBrowser from "expo-web-browser";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  getMatrimonyCandidate,
  openMatrimonyProfile,
  sendMatrimonyInterest,
  respondMatrimonyInterest,
  withdrawMatrimonyInterest,
  removeMatrimonyMatch,
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
import { getAuthErrorMessage, getImageUrl } from "../../api/client";
import { useTheme } from "../../theme/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { checkoutMatrimonyContactReveal } from "../../services/matrimonyCheckout";
import { spacing, radius } from "../../theme/spacing";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { MatrimonyProfileSection } from "../../components/matrimony/MatrimonyProfileSection";
import { MatrimonyChipRow } from "../../components/matrimony/MatrimonyChip";
import { buildDiscoverChips, interestStatusLabel, formatMatrimonyIncome, formatSiblingCounts } from "../../components/matrimony/matrimonyUi";
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

  const confirmWithdrawInterest = () => {
    const interestId = profile?.sentInterestId;
    if (!interestId) return;
    appAlert("Withdraw interest?", "They will no longer see this interest request.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Withdraw",
        style: "destructive",
        onPress: async () => {
          setActing(true);
          try {
            await withdrawMatrimonyInterest(interestId);
            appAlert("Withdrawn", "Your interest has been withdrawn.");
            await load();
          } catch (e) {
            appAlert("Withdraw", e instanceof Error ? e.message : "Failed");
          } finally {
            setActing(false);
          }
        }
      }
    ]);
  };

  const confirmRemoveMatch = () => {
    appAlert(
      "Remove match?",
      "Chat will be disabled for both of you. You can send interest again later.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove match",
          style: "destructive",
          onPress: async () => {
            setActing(true);
            try {
              await removeMatrimonyMatch(userId);
              appAlert("Match removed", "Chat is no longer available for this match.");
              await load();
            } catch (e) {
              appAlert("Remove match", e instanceof Error ? e.message : "Failed");
            } finally {
              setActing(false);
            }
          }
        }
      ]
    );
  };

  const openHoroscope = async () => {
    try {
      const { url } = await getMatrimonyHoroscope(userId);
      if (!url) {
        appAlert("Horoscope", "They have not uploaded a horoscope document yet.");
        return;
      }
      try {
        await WebBrowser.openBrowserAsync(url, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN
        });
      } catch {
        await Linking.openURL(url);
      }
    } catch (e) {
      appAlert(
        "Horoscope",
        e instanceof Error ? e.message : "Available after mutual match only."
      );
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
      appAlert("Shared", "Horoscope exchange is unlocked for this match. You can view theirs now.");
      await load();
    } catch (e) {
      appAlert("Horoscope", e instanceof Error ? e.message : "Failed");
    } finally {
      setActing(false);
    }
  };

  /** Horoscope card / CTA — unlock flow when not yet shared. */
  const onHoroscopePress = () => {
    if (!profile?.mutualMatch) {
      appAlert("Horoscope", "Horoscope opens after you are mutually matched.");
      return;
    }
    if (profile.horoscopeVisible) {
      void openHoroscope();
      return;
    }
    if (!profile.horoscopeAvailable) {
      appAlert("Horoscope", "This profile has no horoscope on file yet.");
      return;
    }
    appAlert(
      "Unlock horoscope",
      "Someone must share first. Share yours to unlock viewing, or request that they share.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Request", onPress: () => void onRequestHoroscope() },
        { text: "Share mine", onPress: () => void onShareHoroscope() }
      ]
    );
  };

  const showContact = async () => {
    if (!profile?.mutualMatch) {
      appAlert(
        "Contact locked",
        "Contact is available only after both of you accept interest (mutual match)."
      );
      return;
    }
    if (profile.contactPaymentStatus !== "PAID") {
      appAlert(
        `Reveal contact — ₹${contactPriceInr}`,
        "One-time payment per profile after mutual match. Gold or Platinum subscription is required.",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "View plans",
            onPress: () => navigation.navigate("MatrimonyPlans")
          },
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
                const msg = getAuthErrorMessage(e);
                if (/subscription|Gold|Platinum/i.test(msg)) {
                  appAlert("Subscription required", msg, [
                    { text: "Cancel", style: "cancel" },
                    { text: "View plans", onPress: () => navigation.navigate("MatrimonyPlans") }
                  ]);
                } else {
                  appAlert("Payment", msg);
                }
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
      appAlert("Contact", getAuthErrorMessage(e));
    }
  };

  const toggleSave = async () => {
    if (!profile) return;
    const nextSaved = !profile.saved;
    setActing(true);
    setProfile((prev) => (prev ? { ...prev, saved: nextSaved } : prev));
    try {
      if (nextSaved) {
        await saveMatrimonyProfile(userId);
      } else {
        await unsaveMatrimonyProfile(userId);
      }
    } catch (e: unknown) {
      setProfile((prev) => (prev ? { ...prev, saved: !nextSaved } : prev));
      const err = e as { response?: { data?: { message?: string } }; message?: string };
      appAlert("Error", err.response?.data?.message ?? err.message ?? "Failed to save profile");
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
            <Image cachePolicy="memory-disk" contentFit="cover" source={{ uri }} style={styles.heroPhoto} />
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
            <View
              style={[
                styles.statusPill,
                status.tone === "pending" && styles.statusPending,
                profile.mutualMatch && styles.statusMatched
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  status.tone === "pending" && { color: "#92400E" },
                  profile.mutualMatch && { color: "#14532D" }
                ]}
              >
                {status.label}
              </Text>
            </View>
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
              <Text style={styles.waitTitle}>Waiting for response</Text>
              <Text style={styles.waitBody}>
                Your interest was sent. You will be notified when they accept. Contact unlocks after mutual
                match.
              </Text>
              {profile.sentInterestId ? (
                <PrimaryButton
                  title="Withdraw interest"
                  variant="outline"
                  onPress={confirmWithdrawInterest}
                  disabled={acting}
                  style={{ marginTop: 10 }}
                />
              ) : null}
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

          {!profile.mutualMatch && profile.canSendInterest ? (
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
              <Text style={styles.matchTitle}>Matched</Text>
              <Text style={styles.matchBody}>
                Manage this match below. Chat and horoscope stay available until the match is removed.
              </Text>
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
              {(profile.horoscopeVisible || profile.horoscopeAvailable) && (
                <PrimaryButton
                  title={profile.horoscopeVisible ? "View horoscope" : "View / unlock horoscope"}
                  variant="outline"
                  onPress={onHoroscopePress}
                  disabled={acting}
                  style={{ marginTop: 8 }}
                />
              )}
              <PrimaryButton
                title="Remove match"
                variant="outline"
                onPress={confirmRemoveMatch}
                disabled={acting}
                style={{ marginTop: 8 }}
              />
              <View style={styles.matchSafetyRow}>
                <Pressable onPress={openReportReasons} disabled={acting} hitSlop={6}>
                  <Text style={styles.matchSafetyLink}>Report</Text>
                </Pressable>
                <Text style={styles.matchSafetyDot}>·</Text>
                <Pressable onPress={confirmBlock} disabled={acting} hitSlop={6}>
                  <Text style={[styles.matchSafetyLink, { color: "#B91C1C" }]}>Block</Text>
                </Pressable>
              </View>
            </View>
          )}

          <MatrimonyProfileSection
            title="Personal details"
            icon="👤"
            fields={[
              { label: "Gender", value: profile.gender },
              { label: "District", value: profile.district },
              { label: "Mother tongue", value: profile.motherTongue },
              { label: "Marital status", value: profile.maritalStatus },
              { label: "Height", value: profile.height },
              { label: "Complexion", value: profile.complexion },
              { label: "About me", value: profile.aboutMe }
            ]}
          />

          <MatrimonyProfileSection
            title="Community"
            icon="🕉"
            fields={[
              { label: "Kulam", value: profile.kulam ?? profile.kulamLabel },
              { label: "Gotra", value: profile.gotra },
              { label: "Rashi", value: profile.rashi },
              { label: "Nakshatram", value: profile.nakshatram },
              { label: "Dosham", value: profile.dosham }
            ]}
          />

          <MatrimonyProfileSection
            title="Education & career"
            icon="🎓"
            fields={[
              { label: "Education", value: profile.education },
              { label: "Occupation", value: profile.occupation },
              { label: "Employer", value: profile.employer },
              {
                label: "Annual income",
                value: formatMatrimonyIncome(profile.annualIncome)
              }
            ]}
          />

          <MatrimonyProfileSection
            title="Family"
            icon="👨‍👩‍👧"
            fields={[
              { label: "Father's name", value: profile.fatherName },
              { label: "Father's occupation", value: profile.fatherOccupation },
              { label: "Mother's name", value: profile.motherName },
              { label: "Family type", value: profile.familyType },
              { label: "Family status", value: profile.familyStatus },
              {
                label: "Siblings",
                value: formatSiblingCounts(profile.brothersCount, profile.sistersCount)
              }
            ]}
          />

          {profile.horoscopeAvailable && (
            <Pressable
              onPress={onHoroscopePress}
              disabled={acting}
              style={[styles.mediaCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
              accessibilityRole="button"
              accessibilityLabel="View horoscope"
            >
              <View style={styles.mediaCardRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.mediaTitle, { color: colors.text }]}>📄 Horoscope</Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4, lineHeight: 18 }}>
                    {!profile.mutualMatch
                      ? "Unlocks after mutual match"
                      : profile.horoscopeVisible
                        ? "Shared — tap to open document"
                        : "Tap to request or share and unlock"}
                  </Text>
                </View>
                <Text style={{ color: colors.primary, fontWeight: "800", fontSize: 13 }}>
                  {profile.horoscopeVisible ? "Open →" : profile.mutualMatch ? "Unlock →" : "Locked"}
                </Text>
              </View>
            </Pressable>
          )}

          <View style={[styles.contactBox, { borderColor: colors.border }]}>
            <View style={styles.contactHead}>
              <Text style={{ fontSize: 18 }}>📞</Text>
              <Text style={[styles.contactTitle, { color: colors.text }]}>Contact details</Text>
            </View>
            {profile.mutualMatch &&
            (profile.contactVisible || profile.contactPaymentStatus === "PAID") ? (
              <PrimaryButton title="Reveal contact" variant="outline" onPress={showContact} />
            ) : profile.mutualMatch ? (
              <PrimaryButton
                title={`Pay ₹${contactPriceInr} & reveal contact`}
                onPress={showContact}
              />
            ) : (
              <>
                <Text style={[styles.contactLocked, { color: colors.textSecondary }]}>
                  {profile.contactPaymentStatus === "PAID"
                    ? "You already paid for this contact. Rematch (both accept interest again) to reveal it."
                    : "Send interest and wait for acceptance. Contact is available after mutual match."}
                </Text>
                {profile.canSendInterest && (
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
  statusMatched: { backgroundColor: "#DCFCE7" },
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
  matchSafetyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 12
  },
  matchSafetyLink: { fontSize: 13, fontWeight: "700", color: "#475569" },
  matchSafetyDot: { fontSize: 13, color: "#94A3B8" },
  mediaCard: {
    borderRadius: radius.lg,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.sm
  },
  mediaCardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12
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
