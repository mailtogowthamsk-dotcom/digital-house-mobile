import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Pressable,
  RefreshControl,
  useWindowDimensions
} from "react-native";
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import {
  getMemberProfile,
  type MemberPostItem,
  type MemberProfile,
  blockMember,
  reportMember,
  MEMBER_REPORT_REASONS
} from "../../api/users.api";
import {
  acceptConnectionRequest,
  cancelConnectionRequest,
  disconnectConnection,
  rejectConnectionRequest,
  sendConnectionRequest,
  type RelationshipStatus
} from "../../api/connections.api";
import { getAuthErrorMessage, getImageUrl } from "../../api/client";
import { AvatarImage } from "../../components/ui/AvatarImage";
import { MemberProfileStatsRow } from "../../components/members/MemberProfileStatsRow";
import { BusinessProfileCard, ProfilePostGridCard } from "../../components/profile";
import { BusinessEnquiryModal } from "../../components/profile/BusinessEnquiryModal";
import { MemberBenefitsProfileSection } from "../../components/profile/MemberBenefitsProfileSection";
import { Shimmer } from "../../components/ui/Shimmer";
import { formatUsername } from "../../utils/username";
import { relationshipLabel } from "../../utils/relationshipStatus";
import { appAlert } from "../../utils/appAlert";
import { promptReportPost } from "../../utils/promptReportPost";
import { useMemberPosts } from "../../hooks/useMemberPosts";

type Params = { MemberProfile: { userId?: number; username?: string } };

const PAGE_SIZE = 18;
const GRID_COLS = 3;
const GRID_GAP = 3;
const GRID_PAD = spacing.sm;

function InfoRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

export function MemberProfileScreen() {
  const navigation = useNavigation<any>();
  const { colors, mode } = useTheme();
  const { width: windowWidth } = useWindowDimensions();
  const route = useRoute<RouteProp<Params, "MemberProfile">>();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const memberFocusOnceRef = useRef(false);
  const memberLastFetchRef = useRef(0);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const identifier = route.params.username ?? route.params.userId;
  const canLoadPosts = Boolean(profile && profile.canViewPosts !== false && !profile.isPrivatePreview);
  const cardWidth =
    (windowWidth - GRID_PAD * 2 - GRID_GAP * (GRID_COLS - 1)) / GRID_COLS;

  const {
    items: postItems,
    total: postsTotal,
    hasMore: postsHasMore,
    loading: postsLoading,
    loadingMore: postsLoadingMore,
    error: postsError,
    reload: reloadPosts,
    loadMore: loadMorePosts,
    connectionsOnlyHiddenCount
  } = useMemberPosts(identifier, canLoadPosts, PAGE_SIZE);

  const load = useCallback(async () => {
    if (!identifier) {
      setError("Member not found.");
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getMemberProfile(identifier);
      setProfile(data);
    } catch (e: unknown) {
      setProfile(null);
      setError(e instanceof Error ? e.message : "Could not load profile");
    } finally {
      setLoading(false);
    }
  }, [identifier]);

  useFocusEffect(
    useCallback(() => {
      const now = Date.now();
      const first = !memberFocusOnceRef.current;
      if (first) {
        memberFocusOnceRef.current = true;
        memberLastFetchRef.current = now;
        void load();
      } else if (now - memberLastFetchRef.current > 60_000) {
        memberLastFetchRef.current = now;
        void load();
      }
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    if (canLoadPosts) await reloadPosts();
    setRefreshing(false);
  }, [load, canLoadPosts, reloadPosts]);

  const runAction = async (fn: () => Promise<unknown>, successMessage?: string) => {
    setActing(true);
    try {
      await fn();
      if (successMessage) appAlert("Done", successMessage);
      await load();
    } catch (e: unknown) {
      appAlert("Error", getAuthErrorMessage(e));
    } finally {
      setActing(false);
    }
  };

  const openChat = () => {
    if (!profile) return;
    navigation.navigate("Chat", {
      otherUserId: profile.id,
      name: profile.fullName,
      profileImage: profile.profileImage
    });
  };

  const openMoreConnected = () => {
    if (!profile) return;
    appAlert("More options", undefined, [
      {
        text: "Disconnect",
        style: "destructive",
        onPress: () =>
          appAlert("Disconnect?", "You can send a new connection request anytime after disconnecting.", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Disconnect",
              style: "destructive",
              onPress: () => void runAction(() => disconnectConnection(profile.id))
            }
          ])
      },
      {
        text: "Block user",
        style: "destructive",
        onPress: confirmBlock
      },
      { text: "Report user", onPress: openReportReasons },
      { text: "Cancel", style: "cancel" }
    ]);
  };

  const renderConnectionActions = (status: RelationshipStatus) => {
    if (acting) {
      return <ActivityIndicator color={colors.primary} style={{ marginTop: spacing.md }} />;
    }

    switch (status) {
      case "none":
        if (profile!.acceptsConnectionRequests === false) {
          return (
            <Text style={[styles.connectSub, { color: colors.textSecondary }]}>
              This member is not accepting connection requests right now.
            </Text>
          );
        }
        return (
          <Pressable
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
            onPress={() =>
              void runAction(() => sendConnectionRequest(profile!.id), "Connection request sent.")
            }
          >
            <Ionicons name="person-add-outline" size={18} color={colors.white} />
            <Text style={[styles.primaryBtnText, { color: colors.white }]}>Connect</Text>
          </Pressable>
        );
      case "pending_sent":
        return (
          <Pressable
            style={({ pressed }) => [styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }, pressed && styles.pressed]}
            onPress={() =>
              appAlert("Cancel request?", "Withdraw your connection request?", [
                { text: "Keep", style: "cancel" },
                {
                  text: "Cancel request",
                  style: "destructive",
                  onPress: () => void runAction(() => cancelConnectionRequest(profile!.id))
                }
              ])
            }
          >
            <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Cancel request</Text>
          </Pressable>
        );
      case "pending_received":
        return (
          <View style={styles.actionRow}>
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
              onPress={() =>
                void runAction(
                  () => acceptConnectionRequest(profile!.id),
                  "You are now connected. Messaging is unlocked."
                )
              }
            >
              <Text style={[styles.primaryBtnText, { color: colors.white }]}>Accept</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.secondaryBtn, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }, pressed && styles.pressed]}
              onPress={() =>
                appAlert("Decline request?", "Decline this connection request?", [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Decline",
                    style: "destructive",
                    onPress: () => void runAction(() => rejectConnectionRequest(profile!.id))
                  }
                ])
              }
            >
              <Text style={[styles.secondaryBtnText, { color: colors.text }]}>Decline</Text>
            </Pressable>
          </View>
        );
      case "connected":
        return (
          <View style={styles.connectedRow}>
            <Pressable
              style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
              onPress={openChat}
              accessibilityRole="button"
            >
              <Ionicons name="chatbubble-outline" size={18} color={colors.white} />
              <Text style={[styles.primaryBtnText, { color: colors.white }]}>Message</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.moreBtn, { borderColor: colors.border, backgroundColor: colors.surfaceElevated }, pressed && styles.pressed]}
              onPress={openMoreConnected}
              accessibilityRole="button"
              accessibilityLabel="More options"
            >
              <Ionicons name="ellipsis-horizontal" size={20} color={colors.text} />
            </Pressable>
          </View>
        );
      case "rejected":
        return (
          <Text style={[styles.connectSub, { color: colors.textSecondary }]}>
            Your request was declined. You may try again after 30 days (max 2 attempts).
          </Text>
        );
      default:
        return null;
    }
  };

  const submitReport = async (reasonCode: string) => {
    if (!profile) return;
    setActing(true);
    try {
      await reportMember(profile.id, reasonCode);
      appAlert("Thank you", "Report submitted. Our team will review it.");
    } catch (e: unknown) {
      appAlert("Report", e instanceof Error ? e.message : "Failed");
    } finally {
      setActing(false);
    }
  };

  const openReportReasons = () => {
    appAlert("Report member", "Why are you reporting this member?", [
      ...MEMBER_REPORT_REASONS.map((r) => ({
        text: r.label,
        onPress: () => void submitReport(r.code)
      })),
      { text: "Cancel", style: "cancel" }
    ]);
  };

  const confirmBlock = () => {
    if (!profile) return;
    appAlert(
      "Block member?",
      "They will be hidden from search, messaging, and connections. Unblock anytime from Messages → Blocked.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Block",
          style: "destructive",
          onPress: () =>
            void runAction(async () => {
              await blockMember(profile.id);
              navigation.goBack();
            }, "Member blocked.")
        }
      ]
    );
  };

  const openSafetyMenu = () => {
    appAlert("Member options", undefined, [
      { text: "Report member", onPress: openReportReasons },
      { text: "Block member", style: "destructive", onPress: confirmBlock },
      { text: "Cancel", style: "cancel" }
    ]);
  };

  const listHeader = useMemo(() => {
    if (!profile) return null;
    const location = [profile.city, profile.district].filter(Boolean).join(", ");
    const statusLabel = relationshipLabel(profile.relationshipStatus);
    const stats = profile.stats;
    const showPrivateGate = profile.isPrivatePreview && !profile.needsUsernameSetup;

    return (
      <View style={styles.headerBlock}>
        <View style={[styles.card, styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <LinearGradient
            colors={[mode === "dark" ? "#173329" : "#E8F5EC", colors.surface]}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <View style={styles.identityRow}>
            <View style={[styles.avatarRing, { borderColor: colors.primary + "40", backgroundColor: colors.surface }]}>
              <AvatarImage
                uri={getImageUrl(profile.profileImage)}
                name={profile.fullName}
                size={58}
                placeholderColor={colors.surfaceElevated}
                textColor={colors.textMuted}
              />
            </View>
            <View style={styles.identity}>
              <Text style={[styles.name, { color: colors.text }]} accessibilityRole="header">{profile.fullName}</Text>
              {profile.username ? (
                <Text style={[styles.username, { color: colors.primary }]}>{formatUsername(profile.username)}</Text>
              ) : null}
              {location ? (
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={13} color={colors.textMuted} />
                  <Text style={[styles.location, { color: colors.textSecondary }]}>{location}</Text>
                </View>
              ) : null}
            </View>
            {!profile.isSelf ? (
              <Pressable
                style={({ pressed }) => [styles.menuBtn, { backgroundColor: colors.surface }, pressed && styles.pressed]}
                onPress={openSafetyMenu}
                accessibilityRole="button"
                accessibilityLabel="Member safety options"
              >
                <Ionicons name="ellipsis-horizontal" size={19} color={colors.textSecondary} />
              </Pressable>
            ) : null}
          </View>
          {statusLabel ? (
            <View style={[styles.statusBadge, { backgroundColor: colors.primary + "14" }]}>
              <Text style={[styles.statusText, { color: colors.primary }]}>{statusLabel}</Text>
            </View>
          ) : null}

          {stats ? (
            <MemberProfileStatsRow
              postsCount={stats.postsCount}
              connectionsCount={stats.connectionsCount}
              likesReceivedCount={stats.likesReceivedCount}
            />
          ) : null}

          {profile.needsUsernameSetup && !profile.isSelf ? (
            <View style={[styles.banner, { backgroundColor: colors.surfaceElevated }]}>
              <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
              <Text style={[styles.bannerText, { color: colors.textSecondary }]}>
                This member has not set a @username yet. Connection and messaging are unavailable
                until they complete profile setup.
              </Text>
            </View>
          ) : null}

          {!profile.isSelf && !profile.needsUsernameSetup ? (
            <View style={styles.heroActions}>
              {profile.relationshipStatus === "connected" && profile.connectedSince ? (
                <Text style={[styles.connectSub, { color: colors.textSecondary }]}>
                  Connected since{" "}
                  {new Date(profile.connectedSince).toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric"
                  })}
                </Text>
              ) : profile.relationshipStatus !== "rejected" &&
                profile.relationshipStatus !== "none" ? (
                <Text style={[styles.connectSub, { color: colors.textSecondary }]}>
                  Messaging opens after the connection is accepted.
                </Text>
              ) : null}
              {renderConnectionActions(profile.relationshipStatus)}
            </View>
          ) : null}
        </View>

        {!profile.isPrivatePreview ? (
          <View
            style={[
              styles.card,
              styles.communityCard,
              { backgroundColor: colors.surface, borderColor: colors.border }
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Community</Text>
            {profile.occupation ? (
              <InfoRow label="Occupation" value={profile.occupation} colors={colors} />
            ) : null}
            {profile.community ? (
              <InfoRow label="Community" value={profile.community} colors={colors} />
            ) : null}
            {profile.kulam ? <InfoRow label="Kulam" value={profile.kulam} colors={colors} /> : null}
            {profile.communityRole ? (
              <InfoRow label="Role" value={profile.communityRole} colors={colors} />
            ) : null}
            {!profile.occupation &&
            !profile.community &&
            !profile.kulam &&
            !profile.communityRole ? (
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>No community details yet.</Text>
            ) : null}
          </View>
        ) : null}

        {!profile.isPrivatePreview ? (
          <>
            {profile.profession || profile.company || profile.experience ? (
              <View
                style={[
                  styles.card,
                  styles.communityCard,
                  { backgroundColor: colors.surface, borderColor: colors.border, alignItems: "stretch" }
                ]}
              >
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Professional Identity</Text>
                {profile.profession ? <InfoRow label="Profession" value={profile.profession} colors={colors} /> : null}
                {profile.company ? <InfoRow label="Company" value={profile.company} colors={colors} /> : null}
                {profile.experience ? <InfoRow label="Experience" value={profile.experience} colors={colors} /> : null}
              </View>
            ) : null}

            {profile.expertiseTags && profile.expertiseTags.length > 0 ? (
              <View
                style={[
                  styles.card,
                  styles.communityCard,
                  { backgroundColor: colors.surface, borderColor: colors.border, alignItems: "stretch" }
                ]}
              >
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Areas I Can Help With</Text>
                <View style={styles.chipsWrap}>
                  {profile.expertiseTags.map((t) => (
                    <View key={t} style={[styles.chip, { backgroundColor: colors.surfaceElevated, borderColor: colors.border }]}>
                      <Text style={[styles.chipText, { color: colors.text }]} numberOfLines={1}>
                        {t}
                      </Text>
                    </View>
                  ))}
                </View>

                {typeof profile.availableForHelp === "boolean" ? (
                  <View
                    style={[
                      styles.availabilityPill,
                      {
                        backgroundColor: profile.availableForHelp
                          ? "rgba(34,197,94,0.12)"
                          : colors.surfaceElevated,
                        borderColor: profile.availableForHelp ? "rgba(34,197,94,0.35)" : colors.border
                      }
                    ]}
                  >
                    <Text
                      style={[
                        styles.availabilityPillText,
                        { color: profile.availableForHelp ? "#22C55E" : colors.textMuted }
                      ]}
                    >
                      {profile.availableForHelp ? "Available to help" : "Not available right now"}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}

            <BusinessProfileCard
              business={profile.business}
              onContactBusiness={
                !profile.isSelf && profile.business
                  ? () => setEnquiryOpen(true)
                  : undefined
              }
            />
            {!profile.isSelf && profile.business ? (
              <MemberBenefitsProfileSection businessOwnerId={profile.id} />
            ) : null}
          </>
        ) : null}

        {showPrivateGate ? (
          <View
            style={[
              styles.privateGate,
              { backgroundColor: colors.surface, borderColor: colors.border }
            ]}
          >
            <View
              style={[
                styles.privateIcon,
                { backgroundColor: mode === "dark" ? "#1E293B" : "#EEF2FF" }
              ]}
            >
              <Ionicons name="lock-closed" size={28} color={colors.primary} />
            </View>
            <Text style={[styles.privateTitle, { color: colors.text }]}>This account is private</Text>
            <Text style={[styles.privateBody, { color: colors.textSecondary }]}>
              Connect to view posts and full community details.
            </Text>
          </View>
        ) : null}

        {canLoadPosts ? (
          <View style={styles.postsHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>Posts</Text>
            {postsTotal > 0 ? (
              <Text style={{ color: colors.textMuted, fontSize: 12 }}>{postsTotal} total</Text>
            ) : null}
          </View>
        ) : null}

        {canLoadPosts && connectionsOnlyHiddenCount > 0 ? (
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
              marginBottom: spacing.md,
              paddingHorizontal: spacing.sm,
              paddingVertical: spacing.sm,
              borderRadius: 10,
              backgroundColor: mode === "dark" ? "#1E293B" : "#F1F5F9"
            }}
          >
            <Ionicons name="lock-closed" size={16} color={colors.textSecondary} />
            <Text style={{ flex: 1, fontSize: 12, color: colors.textSecondary, lineHeight: 17 }}>
              Some posts are visible to connections only.
            </Text>
          </View>
        ) : null}

        {canLoadPosts && postsLoading && postItems.length === 0 ? (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: GRID_GAP,
              marginBottom: spacing.sm
            }}
          >
            {Array.from({ length: 6 }).map((_, i) => (
              <Shimmer key={i} width={cardWidth} height={cardWidth} borderRadius={radius.sm} />
            ))}
          </View>
        ) : null}

        {canLoadPosts && postsError && postItems.length === 0 ? (
          <View style={styles.emptyPosts}>
            <Text style={{ color: colors.error, textAlign: "center" }}>{postsError}</Text>
            <Pressable onPress={() => void reloadPosts()} style={{ marginTop: spacing.sm }}>
              <Text style={{ color: colors.primary, fontWeight: "700" }}>Retry</Text>
            </Pressable>
          </View>
        ) : null}
      </View>
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    profile,
    colors,
    mode,
    canLoadPosts,
    postsLoading,
    postsError,
    postsTotal,
    postItems.length,
    cardWidth,
    acting
  ]);

  const listEmpty = useMemo(() => {
    if (!canLoadPosts || postsLoading || postsError) return null;
    return (
      <View style={styles.emptyPosts}>
        <View
          style={[
            styles.emptyIcon,
            { backgroundColor: mode === "dark" ? "#1E293B" : "#F1F5F9" }
          ]}
        >
          <Ionicons name="images-outline" size={32} color={colors.textMuted} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>No Posts Yet</Text>
        <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
          This member hasn&apos;t shared anything yet.
        </Text>
      </View>
    );
  }, [canLoadPosts, postsLoading, postsError, colors, mode]);

  const listFooter = useMemo(() => {
    if (!canLoadPosts || !postsLoadingMore) return null;
    return (
      <View style={{ paddingVertical: spacing.lg, alignItems: "center" }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }, [canLoadPosts, postsLoadingMore, colors.primary]);

  const openPost = useCallback(
    (postId: number) => {
      navigation.navigate("PostDetail", { postId });
    },
    [navigation]
  );

  const openPostMenu = useCallback((postId: number) => {
    appAlert("Post options", undefined, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Report post",
        style: "destructive",
        onPress: () => promptReportPost(postId)
      }
    ]);
  }, []);

  const renderGridItem = useCallback(
    ({ item }: { item: MemberPostItem }) => (
      <View style={{ width: cardWidth }}>
        <ProfilePostGridCard
          post={item}
          variant="compact"
          onPress={() => openPost(item.postId)}
          onMenuPress={profile?.isSelf ? undefined : () => openPostMenu(item.postId)}
        />
      </View>
    ),
    [cardWidth, openPost, openPostMenu, profile?.isSelf]
  );

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error || !profile) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <Ionicons name="person-outline" size={42} color={colors.textSecondary} />
        <Text style={[styles.errorTitle, { color: colors.text }]}>Profile unavailable</Text>
        <Text style={[styles.errorSub, { color: colors.textSecondary }]}>{error}</Text>
        <Pressable onPress={() => void load()} style={{ marginTop: spacing.lg }}>
          <Text style={{ color: colors.primary, fontWeight: "700" }}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <>
      <FlatList
        key={`member-posts-${GRID_COLS}`}
        style={{ flex: 1, backgroundColor: colors.background }}
        data={canLoadPosts ? postItems : []}
        keyExtractor={(item) => String(item.postId)}
        numColumns={GRID_COLS}
        columnWrapperStyle={
          canLoadPosts && postItems.length > 0
            ? {
                paddingHorizontal: GRID_PAD,
                gap: GRID_GAP,
                marginBottom: GRID_GAP
              }
            : undefined
        }
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={listFooter}
        renderItem={renderGridItem}
        onEndReached={() => {
          if (canLoadPosts && postsHasMore && !postsLoadingMore) void loadMorePosts();
        }}
        onEndReachedThreshold={0.4}
        removeClippedSubviews
        maxToRenderPerBatch={12}
        windowSize={9}
        initialNumToRender={9}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
      />

      {profile?.business && !profile.isSelf ? (
        <BusinessEnquiryModal
          visible={enquiryOpen}
          onClose={() => setEnquiryOpen(false)}
          businessOwnerId={profile.id}
          business={profile.business}
          ownerName={profile.fullName}
          onSent={({ otherUserId, ownerName }) => {
            navigation.navigate("Chat", {
              otherUserId,
              name: ownerName,
              profileImage: profile.profileImage
            });
          }}
        />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  headerBlock: { paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xs },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.md,
    marginBottom: spacing.sm,
    alignItems: "center"
  },
  heroCard: { alignItems: "stretch", overflow: "hidden" },
  identityRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  identity: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.74 },
  communityCard: { alignItems: "stretch" },
  avatarRing: {
    padding: 2,
    borderRadius: 34,
    borderWidth: 2
  },
  name: { fontSize: 17, fontWeight: "700", lineHeight: 22 },
  username: { marginTop: 2, fontSize: 13, fontWeight: "700" },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3
  },
  location: { flexShrink: 1, fontSize: 12 },
  statusBadge: {
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.full,
    alignSelf: "flex-start"
  },
  statusText: { fontSize: 11, fontWeight: "700" },
  heroActions: { width: "100%", marginTop: spacing.xs },
  banner: {
    marginTop: spacing.sm,
    flexDirection: "row",
    gap: 8,
    padding: spacing.sm,
    borderRadius: radius.md,
    width: "100%"
  },
  bannerText: { flex: 1, fontSize: 12, lineHeight: 17 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "800",
    marginBottom: spacing.sm,
    letterSpacing: 0.4,
    textTransform: "uppercase"
  },
  infoRow: {
    width: "100%",
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(148,163,184,0.25)"
  },
  infoLabel: { fontSize: 12, fontWeight: "600", paddingTop: 1, minWidth: 96 },
  infoValue: { fontSize: 13, fontWeight: "600", flex: 1, textAlign: "right" },
  connectSub: { marginTop: spacing.sm, fontSize: 12, lineHeight: 17, marginBottom: 2 },
  primaryBtn: {
    alignSelf: "flex-start",
    marginTop: spacing.xs,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: "#163E31"
  },
  primaryBtnText: { fontSize: 13, fontWeight: "700" },
  secondaryBtn: {
    alignSelf: "flex-start",
    marginTop: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    alignItems: "center"
  },
  secondaryBtnText: { fontSize: 13, fontWeight: "600" },
  actionRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  connectedRow: {
    flexDirection: "row",
    gap: spacing.xs,
    alignItems: "flex-end"
  },
  moreBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center"
  },
  privateGate: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.xl,
    marginBottom: spacing.lg,
    alignItems: "center",
    gap: spacing.sm
  },
  privateIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs
  },
  privateTitle: { fontSize: 16, fontWeight: "800" },
  privateBody: { fontSize: 13, textAlign: "center", lineHeight: 19 },
  postsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
    paddingHorizontal: 2
  },
  emptyPosts: {
    alignItems: "center",
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    gap: spacing.xs
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs
  },
  emptyTitle: { fontSize: 15, fontWeight: "800" },
  emptyBody: { fontSize: 12, textAlign: "center", lineHeight: 17 },
  errorTitle: { marginTop: spacing.md, fontSize: 16, fontWeight: "800" },
  errorSub: { marginTop: spacing.sm, textAlign: "center", lineHeight: 20 },
  menuBtn: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  chipsWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  chip: {
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    maxWidth: "100%"
  },
  chipText: { fontSize: 12, fontWeight: "700" },
  availabilityPill: {
    marginTop: spacing.md,
    alignSelf: "flex-start",
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingVertical: 8
  },
  availabilityPillText: { fontSize: 12, fontWeight: "800" }
});
