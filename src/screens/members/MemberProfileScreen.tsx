import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Pressable,
  RefreshControl
} from "react-native";
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { pauseAllFeedVideos } from "../../media/feedVideoPlayback";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import {
  getMemberProfile,
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
import { getImageUrl } from "../../api/client";
import { AvatarImage } from "../../components/ui/AvatarImage";
import { PostCard, type PostCardData } from "../../components/home/PostCard";
import { CommentSheet } from "../../components/feed/CommentSheet";
import { LikesBottomSheet } from "../../components/likes/LikesBottomSheet";
import {
  PostActionsBottomSheet,
  type PostSharePayload
} from "../../components/share/PostActionsBottomSheet";
import { MemberProfileStatsRow } from "../../components/members/MemberProfileStatsRow";
import { Shimmer } from "../../components/ui/Shimmer";
import { formatUsername } from "../../utils/username";
import { relationshipLabel } from "../../utils/relationshipStatus";
import { memberPostToCardData } from "../../utils/postMappers";
import { trackFeedAction } from "../../utils/feedAnalytics";
import { appAlert } from "../../utils/appAlert";
import { useMemberPosts } from "../../hooks/useMemberPosts";
import { useFeedInteractions } from "../../hooks/useFeedInteractions";
import type { PostLiker } from "../../api/posts.api";

type Params = { MemberProfile: { userId?: number; username?: string } };

const PREVIEW_LIMIT = 6;

function InfoRow({ label, value, colors }: { label: string; value: string; colors: any }) {
  return (
    <View style={styles.infoRow}>
      <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>{label}</Text>
      <Text style={[styles.infoValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

export function MemberProfileScreen() {
  const navigation = useNavigation<any>();
  const { colors, mode } = useTheme();
  const route = useRoute<RouteProp<Params, "MemberProfile">>();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commentPost, setCommentPost] = useState<PostCardData | null>(null);
  const [likesPost, setLikesPost] = useState<PostCardData | null>(null);
  const [sharePost, setSharePost] = useState<PostSharePayload | null>(null);
  const [activeMediaId, setActiveMediaId] = useState<string | null>(null);

  const identifier = route.params.username ?? route.params.userId;
  const canLoadPosts = Boolean(profile && profile.canViewPosts !== false && !profile.isPrivatePreview);

  const {
    items: postItems,
    total: postsTotal,
    loading: postsLoading,
    error: postsError,
    reload: reloadPosts,
    updatePost,
    connectionsOnlyHiddenCount
  } = useMemberPosts(identifier, canLoadPosts, PREVIEW_LIMIT);

  const { toggleLike, addLike, toggleSave } = useFeedInteractions(updatePost);

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 60 }).current;
  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: Array<{ item: PostCardData; isViewable: boolean }> }) => {
      const first = viewableItems.find(
        (v) =>
          v.isViewable &&
          (v.item.mediaType === "video" ||
            (v.item.imageUri && /\.(mp4|mov)(\?|$)/i.test(v.item.imageUri)))
      );
      setActiveMediaId(first?.item?.id ?? null);
    }
  ).current;

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
      void load();
      return () => {
        setActiveMediaId(null);
        pauseAllFeedVideos();
      };
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
      appAlert("Error", e instanceof Error ? e.message : "Action failed");
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
          appAlert("Disconnect?", "You will need to wait 7 days before reconnecting.", [
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
            style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
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
            style={[styles.secondaryBtn, { borderColor: colors.border }]}
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
              style={[styles.primaryBtn, { backgroundColor: colors.primary, flex: 1 }]}
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
              style={[styles.secondaryBtn, { borderColor: colors.border, flex: 1 }]}
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
              style={[styles.primaryBtn, { backgroundColor: colors.primary, flex: 1, marginTop: 0 }]}
              onPress={openChat}
            >
              <Ionicons name="chatbubble-outline" size={18} color={colors.white} />
              <Text style={[styles.primaryBtnText, { color: colors.white }]}>Message</Text>
            </Pressable>
            <Pressable
              style={[styles.moreBtn, { borderColor: colors.border }]}
              onPress={openMoreConnected}
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
      "They will be hidden from search, messaging, and connections. You can unblock them later in Settings.",
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

  const cardPosts: PostCardData[] = useMemo(() => {
    if (!profile) return [];
    return postItems.map((p) =>
      memberPostToCardData(p, profile.fullName, getImageUrl(profile.profileImage))
    );
  }, [postItems, profile]);

  const listHeader = useMemo(() => {
    if (!profile) return null;
    const location = [profile.city, profile.district].filter(Boolean).join(", ");
    const statusLabel = relationshipLabel(profile.relationshipStatus);
    const stats = profile.stats;
    const showPrivateGate = profile.isPrivatePreview && !profile.needsUsernameSetup;

    return (
      <View style={styles.headerBlock}>
        {!profile.isSelf ? (
          <Pressable
            style={[styles.menuBtn, { alignSelf: "flex-end" }]}
            onPress={openSafetyMenu}
            hitSlop={8}
          >
            <Ionicons name="ellipsis-horizontal" size={22} color={colors.textSecondary} />
          </Pressable>
        ) : null}

        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <AvatarImage
            uri={getImageUrl(profile.profileImage)}
            name={profile.fullName}
            size={92}
            placeholderColor={colors.surfaceElevated}
            textColor={colors.textMuted}
          />
          <Text style={[styles.name, { color: colors.text }]}>{profile.fullName}</Text>
          {profile.username ? (
            <Text style={[styles.username, { color: colors.primary }]}>
              {formatUsername(profile.username)}
            </Text>
          ) : null}
          {location ? (
            <Text style={[styles.location, { color: colors.textSecondary }]}>{location}</Text>
          ) : null}
          {statusLabel ? (
            <View style={[styles.statusBadge, { backgroundColor: colors.surfaceElevated }]}>
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
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>No community details yet.</Text>
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
                      {profile.availableForHelp ? "🟢 Available" : "⚪ Not Available"}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </>
        ) : null}

        {!profile.isSelf && !profile.needsUsernameSetup ? (
          <View
            style={[
              styles.card,
              styles.communityCard,
              { backgroundColor: colors.surface, borderColor: colors.border }
            ]}
          >
            <Ionicons name="people-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.connectTitle, { color: colors.text }]}>Connection</Text>
            {profile.relationshipStatus === "connected" && profile.connectedSince ? (
              <Text style={[styles.connectSub, { color: colors.textSecondary }]}>
                Connected since{" "}
                {new Date(profile.connectedSince).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric"
                })}
              </Text>
            ) : (
              <Text style={[styles.connectSub, { color: colors.textSecondary }]}>
                Messaging opens only after connection is accepted.
              </Text>
            )}
            {renderConnectionActions(profile.relationshipStatus)}
          </View>
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
            <Text style={[styles.sectionTitle, { color: colors.text, marginBottom: 0 }]}>
              Recent Posts
            </Text>
            {postsTotal > 0 ? (
              <Text style={{ color: colors.textMuted, fontSize: 13 }}>{postsTotal} total</Text>
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
            <Text style={{ flex: 1, fontSize: 13, color: colors.textSecondary, lineHeight: 18 }}>
              Some posts are visible to connections only.
            </Text>
          </View>
        ) : null}

        {canLoadPosts && postsLoading && cardPosts.length === 0 ? (
          <View style={{ gap: spacing.md, marginBottom: spacing.lg }}>
            <Shimmer height={180} borderRadius={0} />
            <Shimmer height={180} borderRadius={0} />
          </View>
        ) : null}

        {canLoadPosts && postsError && cardPosts.length === 0 ? (
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
    cardPosts.length,
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
    if (!canLoadPosts || cardPosts.length === 0) return null;
    if (postsTotal <= PREVIEW_LIMIT && cardPosts.length >= postsTotal) return null;
    return (
      <Pressable
        style={[styles.viewAll, { borderColor: colors.border, backgroundColor: colors.surface }]}
        onPress={() =>
          navigation.navigate("MemberPosts", {
            userId: profile!.id,
            username: profile!.username || undefined,
            name: profile!.fullName,
            profileImage: profile!.profileImage
          })
        }
      >
        <Text style={[styles.viewAllText, { color: colors.primary }]}>View All Posts</Text>
        <Ionicons name="chevron-forward" size={18} color={colors.primary} />
      </Pressable>
    );
  }, [canLoadPosts, cardPosts.length, postsTotal, colors, navigation, profile]);

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
        style={{ flex: 1, backgroundColor: colors.background }}
        data={canLoadPosts ? cardPosts : []}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={listHeader}
        ListEmptyComponent={listEmpty}
        ListFooterComponent={listFooter}
        renderItem={({ item }) => (
          <PostCard
            post={{ ...item, isMediaActive: item.id === activeMediaId }}
            onPress={() => {
              trackFeedAction("post_open", Number(item.id), { source: "member_profile" });
              navigation.navigate("PostDetail", { postId: Number(item.id) });
            }}
            onViewDetails={() => navigation.navigate("PostDetail", { postId: Number(item.id) })}
            onDoubleTap={() => addLike(item.id, item)}
            onLikePress={() => toggleLike(item.id, item)}
            onLikeCountPress={() => {
              trackFeedAction("likes_sheet_open", Number(item.id));
              setLikesPost(item);
            }}
            onCommentPress={() => {
              trackFeedAction("comment_sheet_open", Number(item.id));
              setCommentPost(item);
            }}
            onSavePress={() => toggleSave(item.id, item)}
            onSharePress={() => {
              trackFeedAction("share", Number(item.id));
              setSharePost({
                postId: Number(item.id),
                title: item.title,
                authorName: item.userName,
                mediaUrl: item.imageUri,
                mediaType: item.mediaType,
                thumbnailUrl: item.thumbnailUrl
              });
            }}
          />
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        removeClippedSubviews
        maxToRenderPerBatch={6}
        windowSize={7}
        initialNumToRender={4}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
        contentContainerStyle={{ paddingBottom: spacing.xxxl }}
        showsVerticalScrollIndicator={false}
      />

      {commentPost ? (
        <CommentSheet
          visible
          postId={Number(commentPost.id)}
          postTitle={commentPost.title}
          onClose={() => setCommentPost(null)}
          onCommentCountChange={(count) => updatePost(commentPost.id, { commentCount: count })}
        />
      ) : null}

      <LikesBottomSheet
        visible={likesPost != null}
        target={likesPost ? { type: "post", id: Number(likesPost.id) } : null}
        title="Likes"
        onClose={() => setLikesPost(null)}
        onUserPress={(liker: PostLiker) => {
          setLikesPost(null);
          if (liker.isCurrentUser) {
            navigation.navigate("Profile");
            return;
          }
          navigation.navigate("MemberProfile", { userId: liker.userId });
        }}
      />

      <PostActionsBottomSheet
        visible={sharePost != null}
        post={sharePost}
        onClose={() => setSharePost(null)}
        onNavigateFindMembers={() => navigation.navigate("SearchMembers")}
      />
    </>
  );
}

const styles = StyleSheet.create({
  headerBlock: { padding: spacing.lg, paddingBottom: spacing.sm },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    alignItems: "center"
  },
  communityCard: { alignItems: "stretch" },
  name: { marginTop: spacing.md, fontSize: 22, fontWeight: "800", textAlign: "center" },
  username: { marginTop: 4, fontSize: 16, fontWeight: "700" },
  location: { marginTop: 6, fontSize: 14 },
  statusBadge: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.full,
    alignSelf: "center"
  },
  statusText: { fontSize: 12, fontWeight: "700" },
  banner: {
    marginTop: spacing.md,
    flexDirection: "row",
    gap: 8,
    padding: spacing.md,
    borderRadius: radius.md,
    width: "100%"
  },
  bannerText: { flex: 1, fontSize: 13, lineHeight: 18 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    marginBottom: spacing.md,
    letterSpacing: -0.2
  },
  infoRow: { width: "100%", marginBottom: spacing.md },
  infoLabel: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.6 },
  infoValue: { fontSize: 15, marginTop: 4, fontWeight: "600" },
  connectTitle: { marginTop: spacing.sm, fontSize: 16, fontWeight: "800", textAlign: "center" },
  connectSub: { marginTop: spacing.sm, fontSize: 13, lineHeight: 19, textAlign: "center" },
  primaryBtn: {
    marginTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    width: "100%"
  },
  primaryBtnText: { fontSize: 15, fontWeight: "800" },
  secondaryBtn: {
    marginTop: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    alignItems: "center"
  },
  secondaryBtnText: { fontSize: 15, fontWeight: "700" },
  actionRow: { flexDirection: "row", gap: spacing.sm, width: "100%", marginTop: spacing.sm },
  connectedRow: {
    flexDirection: "row",
    gap: spacing.sm,
    width: "100%",
    marginTop: spacing.md,
    alignItems: "center"
  },
  moreBtn: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    borderWidth: 1,
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
  privateTitle: { fontSize: 17, fontWeight: "800" },
  privateBody: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  postsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
    marginTop: spacing.xs
  },
  emptyPosts: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm
  },
  emptyTitle: { fontSize: 17, fontWeight: "800" },
  emptyBody: { fontSize: 14, textAlign: "center", lineHeight: 20 },
  viewAll: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6
  },
  viewAllText: { fontSize: 15, fontWeight: "800" },
  errorTitle: { marginTop: spacing.md, fontSize: 17, fontWeight: "800" },
  errorSub: { marginTop: spacing.sm, textAlign: "center", lineHeight: 20 },
  menuBtn: { padding: spacing.sm, marginBottom: spacing.xs },
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
  chipText: { fontSize: 13, fontWeight: "700" },
  availabilityPill: {
    marginTop: spacing.md,
    alignSelf: "flex-start",
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.lg,
    paddingVertical: 8
  },
  availabilityPillText: { fontSize: 13, fontWeight: "800" }
});
