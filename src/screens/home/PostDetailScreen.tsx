import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Linking
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { getPost, likePost, savePost, unsavePost, reportPost, updatePost, expressJobInterest, listJobInterests } from "../../api/posts.api";
import type { PostDetailResponse } from "../../api/posts.api";
import { getErrorStatus } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { PostMedia } from "../../components/home/PostMedia";
import { MarketplaceGallery } from "../../components/marketplace/MarketplaceGallery";
import { AvatarImage } from "../../components/ui/AvatarImage";
import { CommentSheet } from "../../components/feed/CommentSheet";
import { sharePost } from "../../utils/sharePost";
import { timeAgo } from "../../utils/timeAgo";
import { formatPostType } from "../../utils/postMappers";
import { emitPostUpdated } from "../../utils/postSync";
import { hapticLike, hapticSave } from "../../utils/feedHaptics";
import { useTheme } from "../../theme/ThemeContext";
import { typography } from "../../theme/typography";
import { spacing, radius } from "../../theme/spacing";
import { messages } from "../../theme/messages";
import { appAlert } from "../../utils/appAlert";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { formatEmploymentType, formatJobSalary } from "../../constants/jobs";
import {
  formatMarketplaceCategory,
  formatMarketplaceCondition,
  formatMarketplacePrice,
  formatMarketplaceStatus,
  formatMarketplaceExpiry
} from "../../constants/marketplace";
import {
  formatHelpCategory,
  formatHelpStatus,
  formatHelpUrgency,
  urgencyBadgeColor
} from "../../constants/helpingHands";
import {
  offerHelp,
  listHelpHelpers,
  completeHelpRequest
} from "../../api/helpingHands.api";

const HEART_COLOR = "#E91E63";

type PostDetailParams = { postId: number };

export function PostDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<{ PostDetail: PostDetailParams }, "PostDetail">>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const postId = route.params?.postId;

  const [post, setPost] = useState<PostDetailResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [liking, setLiking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingJob, setUpdatingJob] = useState(false);
  const [interestBusy, setInterestBusy] = useState(false);
  const [helpBusy, setHelpBusy] = useState(false);
  const [helpHelpers, setHelpHelpers] = useState<
    {
      id: number;
      from_user_id: number;
      message: string | null;
      created_at: string;
      author: { id: number; name: string; profile_image: string | null };
    }[]
  >([]);
  const [interestItems, setInterestItems] = useState<
    {
      id: number;
      from_user_id: number;
      message: string | null;
      created_at: string;
      author: { id: number; name: string; profile_image: string | null };
    }[]
  >([]);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPost = useCallback(async () => {
    if (postId == null) return;
    try {
      const data = await getPost(postId);
      setPost(data);
      setError(null);
      if (data.post_type === "JOB" && user?.id != null && data.user_id === user.id) {
        try {
          const interests = await listJobInterests(postId);
          setInterestItems(interests.items);
        } catch {
          setInterestItems([]);
        }
      }
      if (data.post_type === "HELP_REQUEST") {
        try {
          const helpers = await listHelpHelpers(postId);
          setHelpHelpers(helpers.items);
        } catch {
          setHelpHelpers([]);
        }
      } else {
        setHelpHelpers([]);
      }
      if (!(data.post_type === "JOB" && user?.id != null && data.user_id === user.id)) {
        setInterestItems([]);
      }
    } catch (e) {
      const status = getErrorStatus(e);
      if (status === 401) navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      else if (status === 403) navigation.reset({ index: 0, routes: [{ name: "PendingApproval" }] });
      else setError((e as any)?.response?.data?.message ?? messages.error.generic);
    }
  }, [postId, navigation, user?.id]);

  const refresh = useCallback(async () => {
    if (postId == null) return;
    setRefreshing(true);
    await loadPost();
    setRefreshing(false);
  }, [postId, loadPost]);

  useEffect(() => {
    if (postId != null) {
      setLoading(true);
      loadPost().finally(() => setLoading(false));
    }
  }, [postId, loadPost]);

  const syncToFeed = useCallback(
    (patch: { likeCount?: number; commentCount?: number; likedByMe?: boolean; savedByMe?: boolean }) => {
      if (postId != null) emitPostUpdated(postId, patch);
    },
    [postId]
  );

  const handleLike = useCallback(async () => {
    if (postId == null || !post || liking) return;
    setLiking(true);

    const prevLiked = post.liked_by_me;
    const prevCount = post.like_count;
    const nextLiked = !prevLiked;

    setPost((p) =>
      p
        ? {
            ...p,
            liked_by_me: nextLiked,
            like_count: Math.max(0, prevCount + (nextLiked ? 1 : -1))
          }
        : null
    );
    void hapticLike();

    try {
      const res = await likePost(postId);
      setPost((p) => (p ? { ...p, like_count: res.like_count, liked_by_me: res.liked } : null));
      syncToFeed({ likeCount: res.like_count, likedByMe: res.liked });
    } catch {
      setPost((p) => (p ? { ...p, liked_by_me: prevLiked, like_count: prevCount } : null));
    } finally {
      setLiking(false);
    }
  }, [postId, post, liking, syncToFeed]);

  const handleSave = useCallback(async () => {
    if (postId == null || !post || saving) return;
    setSaving(true);

    const wasSaved = post.saved_by_me ?? false;
    setPost((p) => (p ? { ...p, saved_by_me: !wasSaved } : null));
    void hapticSave();

    try {
      if (wasSaved) await unsavePost(postId);
      else await savePost(postId);
      syncToFeed({ savedByMe: !wasSaved });
    } catch {
      setPost((p) => (p ? { ...p, saved_by_me: wasSaved } : null));
    } finally {
      setSaving(false);
    }
  }, [postId, post, saving, syncToFeed]);

  const handleShare = useCallback(async () => {
    if (!post || postId == null) return;
    await sharePost({
      postId,
      title: post.title,
      authorName: post.author?.name,
      description: post.description ?? undefined
    });
  }, [post, postId]);

  const handleCommentCountChange = useCallback(
    (count: number) => {
      setPost((p) => (p ? { ...p, comment_count: count } : null));
      syncToFeed({ commentCount: count });
    },
    [syncToFeed]
  );

  const handleReport = useCallback(() => {
    if (postId == null || !post) return;
    if (post.post_type === "MARKETPLACE") {
      const submit = async (reason: string) => {
        try {
          await reportPost(postId, reason);
          appAlert("Report submitted", "Thank you. We will review this listing.");
        } catch (e) {
          appAlert(
            "Error",
            (e as any)?.response?.data?.message ?? "Failed to submit report."
          );
        }
      };
      appAlert("Report listing", "Why are you reporting this listing?", [
        { text: "Cancel", style: "cancel" },
        { text: "Spam", onPress: () => void submit("Spam") },
        { text: "Fake listing", onPress: () => void submit("Fake Listing") },
        {
          text: "More reasons…",
          onPress: () =>
            appAlert("Report reason", "Choose one:", [
              { text: "Cancel", style: "cancel" },
              { text: "Duplicate", onPress: () => void submit("Duplicate") },
              { text: "Wrong category", onPress: () => void submit("Wrong Category") },
              {
                text: "Illegal / sold / other",
                onPress: () =>
                  appAlert("Final reason", undefined, [
                    { text: "Cancel", style: "cancel" },
                    { text: "Illegal item", onPress: () => void submit("Illegal Item") },
                    { text: "Already sold", onPress: () => void submit("Already Sold") },
                    { text: "Other", onPress: () => void submit("Other") }
                  ])
              }
            ])
        }
      ]);
      return;
    }
    appAlert("Report post", "Do you want to report this post for review?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Report",
        style: "destructive",
        onPress: async () => {
          try {
            await reportPost(postId, "Reported by user");
            appAlert("Report submitted", "Thank you. We will review this post.");
          } catch {
            appAlert("Error", "Failed to submit report.");
          }
        }
      }
    ]);
  }, [post, postId]);

  const handleToggleJobStatus = useCallback(() => {
    if (postId == null || !post || post.post_type !== "JOB" || updatingJob) return;
    const isClosed = post.job_status === "CLOSED";
    const nextStatus = isClosed ? "OPEN" : "CLOSED";
    appAlert(
      isClosed ? "Reopen this job?" : "Close this job?",
      isClosed
        ? "The listing will appear under Open jobs again."
        : "Closed jobs stay visible under Closed, but are hidden from Open jobs.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: isClosed ? "Reopen" : "Close job",
          style: isClosed ? "default" : "destructive",
          onPress: async () => {
            setUpdatingJob(true);
            try {
              const updated = await updatePost(postId, { job_status: nextStatus });
              setPost(updated);
              appAlert("Updated", isClosed ? "Job is open again." : "Job marked as closed.");
            } catch {
              appAlert("Error", "Could not update job status.");
            } finally {
              setUpdatingJob(false);
            }
          }
        }
      ]
    );
  }, [post, postId, updatingJob]);

  const handleMarkSold = useCallback(() => {
    if (postId == null || !post || post.post_type !== "MARKETPLACE" || updatingJob) return;
    if (post.marketplace_status !== "LIVE") return;
    appAlert("Mark as sold?", "Buyers will no longer see this listing in Marketplace browse.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Mark sold",
        style: "destructive",
        onPress: async () => {
          setUpdatingJob(true);
          try {
            const updated = await updatePost(postId, { marketplace_status: "SOLD" });
            setPost(updated);
            appAlert("Updated", "Listing marked as sold.");
          } catch (e) {
            appAlert(
              "Error",
              (e as any)?.response?.data?.message ?? "Could not update listing."
            );
          } finally {
            setUpdatingJob(false);
          }
        }
      }
    ]);
  }, [post, postId, updatingJob]);

  const handleContactSeller = useCallback(() => {
    if (!post || post.post_type !== "MARKETPLACE") return;
    if (post.marketplace_status !== "LIVE") {
      appAlert("Unavailable", "This listing is not available for contact.");
      return;
    }
    appAlert(
      "Contact seller",
      "Meet safely in public. Digital House does not handle payments or delivery.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Open chat",
          onPress: () =>
            navigation.navigate("Chat", {
              otherUserId: post.user_id,
              name: post.author.name,
              profileImage: post.author.profile_image
            })
        }
      ]
    );
  }, [navigation, post]);

  const handleExpressInterest = useCallback(() => {
    if (postId == null || !post || post.post_type !== "JOB" || interestBusy) return;
    if (post.job_interested_by_me) {
      if (post.job_can_message_poster) {
        navigation.navigate("Chat", {
          otherUserId: post.user_id,
          name: post.author.name,
          profileImage: post.author.profile_image
        });
      } else {
        appAlert(
          "Interest sent",
          post.job_status === "CLOSED"
            ? "This listing is closed. Connect with the poster to message them."
            : "You already expressed interest. Connect with the poster to message them."
        );
      }
      return;
    }
    if (post.job_status === "CLOSED") {
      appAlert("Closed", "This job is no longer accepting interest.");
      return;
    }
    appAlert("Express interest", "Notify the poster that you are interested in this role?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "I'm interested",
        onPress: async () => {
          setInterestBusy(true);
          try {
            const res = await expressJobInterest(postId);
            setPost((p) =>
              p
                ? {
                    ...p,
                    job_interested_by_me: true,
                    job_can_message_poster: res.canMessage,
                    job_interest_count: (p.job_interest_count ?? 0) + 1
                  }
                : null
            );
            if (res.canMessage) {
              appAlert("Interest sent", "You can message the poster — you are already connected.", [
                { text: "OK", style: "cancel" },
                {
                  text: "Message",
                  onPress: () =>
                    navigation.navigate("Chat", {
                      otherUserId: post.user_id,
                      name: post.author.name,
                      profileImage: post.author.profile_image
                    })
                }
              ]);
            } else {
              appAlert(
                "Interest sent",
                "The poster was notified. Connect with them to start a chat."
              );
            }
          } catch (e) {
            appAlert(
              "Error",
              (e as any)?.response?.data?.message ??
                (e instanceof Error ? e.message : "Could not send interest.")
            );
          } finally {
            setInterestBusy(false);
          }
        }
      }
    ]);
  }, [interestBusy, navigation, post, postId]);

  const handleOfferHelp = useCallback(() => {
    if (postId == null || !post || post.post_type !== "HELP_REQUEST" || helpBusy) return;
    if (post.help_status === "COMPLETED" || post.help_status === "CANCELLED") {
      appAlert("Closed", "This request is no longer open for help.");
      return;
    }
    const contactAfter = (requesterUserId: number, phone: string | null) => {
      appAlert("Thank you", "How would you like to reach out?", [
        {
          text: "Chat",
          onPress: () =>
            navigation.navigate("Chat", {
              otherUserId: requesterUserId,
              name: post.author.name,
              profileImage: post.author.profile_image
            })
        },
        ...(phone
          ? [
              {
                text: "Call",
                onPress: () => {
                  void Linking.openURL(`tel:${phone}`);
                }
              }
            ]
          : []),
        { text: "Done", style: "cancel" as const }
      ]);
    };
    if (post.help_offered_by_me) {
      contactAfter(post.user_id, post.help_contact_phone ?? null);
      return;
    }
    appAlert("Ready to help?", "Let the requester know you are ready to help.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "I'm Ready to Help",
        onPress: async () => {
          setHelpBusy(true);
          try {
            const res = await offerHelp(postId);
            setPost((p) =>
              p
                ? {
                    ...p,
                    help_offered_by_me: true,
                    help_helper_count: (p.help_helper_count ?? 0) + (res.created ? 1 : 0),
                    help_status: p.help_status === "OPEN" ? "IN_PROGRESS" : p.help_status
                  }
                : null
            );
            const helpers = await listHelpHelpers(postId);
            setHelpHelpers(helpers.items);
            contactAfter(res.requesterUserId, res.contactPhone);
          } catch (e) {
            appAlert(
              "Error",
              (e as any)?.response?.data?.message ??
                (e instanceof Error ? e.message : "Could not offer help.")
            );
          } finally {
            setHelpBusy(false);
          }
        }
      }
    ]);
  }, [helpBusy, navigation, post, postId]);

  const handleCompleteHelp = useCallback(() => {
    if (postId == null || !post || post.post_type !== "HELP_REQUEST" || helpBusy) return;
    if (post.help_status === "COMPLETED") {
      appAlert("Already completed", "This request is already marked completed.");
      return;
    }
    const helpers = helpHelpers;
    const finish = async (helperUserId?: number, appreciation?: string | null) => {
      setHelpBusy(true);
      try {
        await completeHelpRequest(postId, {
          helper_user_id: helperUserId,
          appreciation: appreciation ?? null
        });
        setPost((p) => (p ? { ...p, help_status: "COMPLETED" } : null));
        appAlert("Completed", "Thank you — both of you have been notified.");
      } catch (e) {
        appAlert(
          "Error",
          (e as any)?.response?.data?.message ??
            (e instanceof Error ? e.message : "Could not complete request.")
        );
      } finally {
        setHelpBusy(false);
      }
    };

    appAlert("Mark completed?", "Confirm that help for this request is done.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Complete",
        onPress: () => {
          if (helpers.length === 0) {
            void finish();
            return;
          }
          appAlert(
            "Appreciate your helper?",
            "Would you like to write a short thank-you for someone who helped?",
            [
              {
                text: "Skip",
                style: "cancel",
                onPress: () => void finish()
              },
              {
                text: "Yes",
                onPress: () => {
                  const primary = helpers[0];
                  appAlert(
                    "Appreciation",
                    `Write a short thank-you for ${primary.author.name}?`,
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Use default",
                        onPress: () =>
                          void finish(
                            primary.from_user_id,
                            `Because of ${primary.author.name}'s support, this request was completed successfully.`
                          )
                      }
                    ]
                  );
                }
              }
            ]
          );
        }
      }
    ]);
  }, [helpBusy, helpHelpers, post, postId]);

  const s = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        content: { paddingBottom: spacing.xl * 2 },
        center: {
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: spacing.lg,
          gap: spacing.sm
        },
        errorText: { ...typography.body, color: colors.error, textAlign: "center" },
        retryBtn: {
          paddingVertical: spacing.sm,
          paddingHorizontal: spacing.lg,
          backgroundColor: colors.primary,
          borderRadius: radius.md
        },
        retryText: { ...typography.button, color: colors.white },
        header: {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: spacing.md,
          paddingTop: spacing.md,
          marginBottom: spacing.sm
        },
        headerText: { flex: 1, minWidth: 0 },
        authorName: { ...typography.h3, fontWeight: "600", color: colors.text },
        metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
        meta: { ...typography.caption, color: colors.textSecondary },
        typePill: {
          paddingHorizontal: 8,
          paddingVertical: 2,
          borderRadius: radius.sm,
          backgroundColor: colors.surfaceElevated
        },
        typePillText: { ...typography.caption, fontWeight: "600", color: colors.primary },
        moreBtn: { padding: spacing.xs },
        body: { paddingHorizontal: spacing.md },
        title: { ...typography.h2, color: colors.text, marginBottom: spacing.sm },
        description: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.md },
        mediaWrap: { marginBottom: spacing.sm, backgroundColor: colors.border },
        actions: {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.sm,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          gap: spacing.xs
        },
        actionBtn: {
          flexDirection: "row",
          alignItems: "center",
          gap: 6,
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.sm,
          borderRadius: radius.md
        },
        actionBtnPressed: { opacity: 0.65 },
        actionCount: { ...typography.caption, fontWeight: "600", color: colors.textSecondary },
        actionCountActive: { color: HEART_COLOR },
        commentsTeaser: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.md
        },
        commentsTeaserPressed: { opacity: 0.7 },
        commentsTeaserText: { ...typography.body, fontWeight: "500", color: colors.text },
        commentsTeaserHint: { ...typography.caption, color: colors.textSecondary }
      }),
    [colors]
  );

  if (postId == null) {
    return (
      <View style={s.center}>
        <Text style={s.errorText}>Invalid post</Text>
      </View>
    );
  }

  if (loading && !post) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (error && !post) {
    return (
      <View style={s.center}>
        <Ionicons name="cloud-offline-outline" size={40} color={colors.textSecondary} />
        <Text style={s.errorText}>{error}</Text>
        <Pressable style={s.retryBtn} onPress={loadPost}>
          <Text style={s.retryText}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  if (!post) return null;

  const typeLabel = formatPostType(post.post_type);
  const saved = post.saved_by_me ?? false;
  const isOwnJob =
    post.post_type === "JOB" && user?.id != null && post.user_id === user.id;
  const jobOpen = post.job_status !== "CLOSED";
  const isOwnListing =
    post.post_type === "MARKETPLACE" && user?.id != null && post.user_id === user.id;
  const listingLive = post.marketplace_status === "LIVE";
  const isOwnHelp =
    post.post_type === "HELP_REQUEST" && user?.id != null && post.user_id === user.id;
  const helpOpen =
    post.help_status !== "COMPLETED" && post.help_status !== "CANCELLED";
  const helpUrgencyColors = urgencyBadgeColor(post.help_urgency);

  return (
    <>
      <ScrollView
        style={s.container}
        contentContainerStyle={s.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.primary]} />
        }
      >
        <View style={s.header}>
          <AvatarImage
            uri={post.author.profile_image}
            name={post.author.name}
            size={44}
            containerStyle={{ marginRight: spacing.sm }}
          />
          <View style={s.headerText}>
            <Text style={s.authorName} numberOfLines={1}>
              {post.author.name}
            </Text>
            <View style={s.metaRow}>
              <Text style={s.meta}>{timeAgo(post.created_at)}</Text>
              <Text style={s.meta}>·</Text>
              <View style={s.typePill}>
                <Text style={s.typePillText}>{typeLabel}</Text>
              </View>
              {post.post_type === "JOB" ? (
                <>
                  <Text style={s.meta}>·</Text>
                  <View style={[s.typePill, !jobOpen && { backgroundColor: colors.border }]}>
                    <Text style={[s.typePillText, !jobOpen && { color: colors.textSecondary }]}>
                      {jobOpen ? "Open" : "Closed"}
                    </Text>
                  </View>
                </>
              ) : null}
            </View>
          </View>
          <Pressable onPress={handleReport} style={s.moreBtn} hitSlop={8}>
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
          </Pressable>
        </View>

        <View style={s.body}>
          <Text style={s.title}>{post.title}</Text>
          {post.post_type === "JOB" ? (
            <View style={{ gap: 6, marginBottom: spacing.md }}>
              {post.job_company ? (
                <Text style={{ fontSize: 14, fontWeight: "600", color: colors.textSecondary }}>
                  {post.job_company}
                </Text>
              ) : null}
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                {post.job_location ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                    <Text style={{ fontSize: 12, color: colors.textMuted }}>{post.job_location}</Text>
                  </View>
                ) : null}
                {formatEmploymentType(post.job_employment_type) ? (
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>
                    {formatEmploymentType(post.job_employment_type)}
                  </Text>
                ) : null}
                {formatJobSalary(post.job_salary_min, post.job_salary_max) ? (
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>
                    {formatJobSalary(post.job_salary_min, post.job_salary_max)}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}
          {post.post_type === "MARKETPLACE" ? (
            <View style={{ gap: 6, marginBottom: spacing.md }}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                <View
                  style={[
                    s.typePill,
                    post.marketplace_status === "REJECTED" && { backgroundColor: "#FEE2E2" },
                    post.marketplace_status === "PENDING_REVIEW" && { backgroundColor: "#FEF3C7" },
                    post.marketplace_status === "SOLD" && { backgroundColor: colors.border }
                  ]}
                >
                  <Text style={s.typePillText}>
                    {formatMarketplaceStatus(post.marketplace_status)}
                  </Text>
                </View>
                {formatMarketplacePrice(
                  post.marketplace_intent,
                  post.marketplace_price,
                  post.marketplace_negotiable
                ) ? (
                  <Text style={{ fontSize: 15, fontWeight: "700", color: colors.primary }}>
                    {formatMarketplacePrice(
                      post.marketplace_intent,
                      post.marketplace_price,
                      post.marketplace_negotiable
                    )}
                  </Text>
                ) : null}
              </View>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                {formatMarketplaceCategory(post.marketplace_category) ? (
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>
                    {formatMarketplaceCategory(post.marketplace_category)}
                  </Text>
                ) : null}
                {formatMarketplaceCondition(post.marketplace_condition) ? (
                  <Text style={{ fontSize: 12, color: colors.textMuted }}>
                    {formatMarketplaceCondition(post.marketplace_condition)}
                  </Text>
                ) : null}
                {post.marketplace_district ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                    <Text style={{ fontSize: 12, color: colors.textMuted }}>
                      {post.marketplace_district}
                    </Text>
                  </View>
                ) : null}
              </View>
              {isOwnListing && post.marketplace_admin_note ? (
                <Text style={{ fontSize: 12, color: colors.error, marginTop: 4 }}>
                  Admin note: {post.marketplace_admin_note}
                </Text>
              ) : null}
            </View>
          ) : null}
          {post.post_type === "HELP_REQUEST" ? (
            <View style={{ gap: 8, marginBottom: spacing.md }}>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
                <View style={[s.typePill, { backgroundColor: helpUrgencyColors.bg }]}>
                  <Text style={[s.typePillText, { color: helpUrgencyColors.text }]}>
                    {formatHelpUrgency(post.help_urgency)}
                  </Text>
                </View>
                <View style={s.typePill}>
                  <Text style={s.typePillText}>{formatHelpStatus(post.help_status)}</Text>
                </View>
                <Text style={{ fontSize: 12, color: colors.textMuted }}>
                  {formatHelpCategory(post.help_category)}
                </Text>
              </View>
              {post.help_location ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Ionicons name="location-outline" size={14} color={colors.textMuted} />
                  <Text style={{ fontSize: 13, color: colors.textMuted }}>{post.help_location}</Text>
                </View>
              ) : null}
              {post.help_contact_phone ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                  <Ionicons name="call-outline" size={14} color={colors.textMuted} />
                  <Text style={{ fontSize: 13, color: colors.textMuted }}>
                    {post.help_contact_phone}
                  </Text>
                </View>
              ) : null}
              {(post.help_helper_count ?? helpHelpers.length) > 0 ? (
                <Text style={{ fontSize: 12, color: colors.textMuted }}>
                  {post.help_helper_count ?? helpHelpers.length} people helping
                </Text>
              ) : null}
            </View>
          ) : null}
          {post.description ? <Text style={s.description}>{post.description}</Text> : null}
          {post.post_type === "HELP_REQUEST" &&
          (post.help_gallery?.length ?? 0) > 1 ? (
            <View style={{ marginTop: spacing.md }}>
              <MarketplaceGallery urls={post.help_gallery ?? []} />
            </View>
          ) : null}
        </View>

        {isOwnJob ? (
          <View style={{ paddingHorizontal: spacing.md, marginBottom: spacing.md }}>
            <PrimaryButton
              title={jobOpen ? "Close job listing" : "Reopen job listing"}
              onPress={handleToggleJobStatus}
              loading={updatingJob}
              variant={jobOpen ? "secondary" : "primary"}
            />
          </View>
        ) : null}

        {isOwnListing &&
        (listingLive ||
          post.marketplace_status === "CHANGES_REQUESTED" ||
          post.marketplace_status === "PENDING_REVIEW" ||
          post.marketplace_status === "EXPIRED" ||
          post.marketplace_status === "SOLD") ? (
          <View style={{ paddingHorizontal: spacing.md, marginBottom: spacing.md, gap: 8 }}>
            {listingLive ||
            post.marketplace_status === "CHANGES_REQUESTED" ||
            post.marketplace_status === "PENDING_REVIEW" ? (
              <PrimaryButton
                title={
                  post.marketplace_status === "CHANGES_REQUESTED"
                    ? "Edit & resubmit"
                    : "Edit listing"
                }
                onPress={() =>
                  navigation.navigate("CreatePost", {
                    initialPostType: "MARKETPLACE",
                    editPostId: post.id
                  })
                }
                variant="secondary"
              />
            ) : null}
            {listingLive ? (
              <PrimaryButton
                title="Mark as sold"
                onPress={handleMarkSold}
                loading={updatingJob}
                variant="secondary"
              />
            ) : null}
            {post.marketplace_status === "EXPIRED" ? (
              <PrimaryButton
                title="Renew listing"
                onPress={() => {
                  appAlert(
                    "Renew listing?",
                    "Your listing will go back to admin review. After approval it stays live for 30 more days.",
                    [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Renew",
                        onPress: async () => {
                          setUpdatingJob(true);
                          try {
                            const updated = await updatePost(postId!, {
                              marketplace_status: "PENDING_REVIEW"
                            });
                            setPost(updated);
                            appAlert("Submitted", "Renewal sent for admin review.");
                          } catch (e) {
                            appAlert(
                              "Error",
                              (e as any)?.response?.data?.message ?? "Could not renew."
                            );
                          } finally {
                            setUpdatingJob(false);
                          }
                        }
                      }
                    ]
                  );
                }}
                loading={updatingJob}
              />
            ) : null}
            {post.marketplace_status === "EXPIRED" || post.marketplace_status === "SOLD" ? (
              <PrimaryButton
                title="Archive"
                onPress={() => {
                  appAlert("Archive listing?", "It will move to Archived in My listings.", [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Archive",
                      style: "destructive",
                      onPress: async () => {
                        setUpdatingJob(true);
                        try {
                          const updated = await updatePost(postId!, {
                            marketplace_status: "ARCHIVED"
                          });
                          setPost(updated);
                          appAlert("Archived", "Listing archived.");
                        } catch (e) {
                          appAlert(
                            "Error",
                            (e as any)?.response?.data?.message ?? "Could not archive."
                          );
                        } finally {
                          setUpdatingJob(false);
                        }
                      }
                    }
                  ]);
                }}
                loading={updatingJob}
                variant="secondary"
              />
            ) : null}
            {post.marketplace_expires_at && listingLive ? (
              <Text
                style={{
                  fontSize: 12,
                  color: colors.textMuted,
                  textAlign: "center"
                }}
              >
                {formatMarketplaceExpiry(post.marketplace_expires_at) ??
                  `Expires ${new Date(post.marketplace_expires_at).toLocaleDateString()}`}
              </Text>
            ) : null}
            {post.marketplace_featured ? (
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "700",
                  color: "#B45309",
                  textAlign: "center"
                }}
              >
                Featured listing
              </Text>
            ) : null}
          </View>
        ) : null}

        {post.post_type === "MARKETPLACE" && !isOwnListing && listingLive ? (
          <View style={{ paddingHorizontal: spacing.md, marginBottom: spacing.md }}>
            <PrimaryButton title="Contact seller" onPress={handleContactSeller} />
            <Text
              style={{
                marginTop: 8,
                fontSize: 12,
                color: colors.textMuted,
                textAlign: "center"
              }}
            >
              Negotiate offline. No in-app payments or delivery.
            </Text>
          </View>
        ) : null}

        {post.post_type === "JOB" && !isOwnJob && (jobOpen || post.job_interested_by_me) ? (
          <View style={{ paddingHorizontal: spacing.md, marginBottom: spacing.md }}>
            <PrimaryButton
              title={
                post.job_interested_by_me
                  ? post.job_can_message_poster
                    ? "Message poster"
                    : jobOpen
                      ? "Interest sent"
                      : "Interest sent (closed)"
                  : "I'm interested"
              }
              onPress={handleExpressInterest}
              loading={interestBusy}
              variant={post.job_interested_by_me ? "secondary" : "primary"}
            />
            {(post.job_interest_count ?? 0) > 0 ? (
              <Text
                style={{
                  marginTop: 8,
                  fontSize: 12,
                  color: colors.textMuted,
                  textAlign: "center"
                }}
              >
                {post.job_interest_count} member
                {post.job_interest_count === 1 ? "" : "s"} interested
              </Text>
            ) : null}
          </View>
        ) : null}

        {post.post_type === "HELP_REQUEST" && !isOwnHelp && helpOpen ? (
          <View style={{ paddingHorizontal: spacing.md, marginBottom: spacing.md }}>
            <PrimaryButton
              title={post.help_offered_by_me ? "Contact requester" : "I'm Ready to Help"}
              onPress={handleOfferHelp}
              loading={helpBusy}
              variant={post.help_offered_by_me ? "secondary" : "primary"}
            />
          </View>
        ) : null}

        {isOwnHelp && helpOpen ? (
          <View style={{ paddingHorizontal: spacing.md, marginBottom: spacing.md }}>
            <PrimaryButton
              title="Mark as completed"
              onPress={handleCompleteHelp}
              loading={helpBusy}
              variant="secondary"
            />
          </View>
        ) : null}

        {post.post_type === "HELP_REQUEST" && helpHelpers.length > 0 ? (
          <View style={{ paddingHorizontal: spacing.md, marginBottom: spacing.md }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 8 }}>
              Current volunteers ({helpHelpers.length})
            </Text>
            {helpHelpers.map((item) => (
              <Pressable
                key={item.id}
                onPress={() =>
                  navigation.navigate("Chat", {
                    otherUserId: item.from_user_id,
                    name: item.author.name,
                    profileImage: item.author.profile_image
                  })
                }
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 10,
                  paddingVertical: 8,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.border
                }}
              >
                <AvatarImage
                  uri={item.author.profile_image}
                  name={item.author.name}
                  size={36}
                />
                <Text style={{ flex: 1, fontWeight: "600", color: colors.text }}>
                  {item.author.name}
                </Text>
                <Ionicons name="chatbubble-outline" size={18} color={colors.textMuted} />
              </Pressable>
            ))}
          </View>
        ) : null}

        {isOwnJob && interestItems.length > 0 ? (
          <View style={{ paddingHorizontal: spacing.md, marginBottom: spacing.md }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text, marginBottom: 8 }}>
              Interested members ({interestItems.length})
            </Text>
            {interestItems.map((item) => (
              <Pressable
                key={item.id}
                onPress={() =>
                  navigation.navigate("MemberProfile", { userId: item.author.id })
                }
                style={{
                  paddingVertical: 10,
                  borderBottomWidth: StyleSheet.hairlineWidth,
                  borderBottomColor: colors.border
                }}
              >
                <Text style={{ fontWeight: "600", color: colors.text }}>{item.author.name}</Text>
                {item.message ? (
                  <Text style={{ marginTop: 2, fontSize: 12, color: colors.textSecondary }}>
                    {item.message}
                  </Text>
                ) : null}
              </Pressable>
            ))}
          </View>
        ) : null}

        {post.post_type === "MARKETPLACE" &&
        ((post.marketplace_gallery && post.marketplace_gallery.length > 0) || post.media_url) ? (
          <View style={s.mediaWrap}>
            <MarketplaceGallery
              urls={
                post.marketplace_gallery && post.marketplace_gallery.length > 0
                  ? post.marketplace_gallery
                  : post.media_url
                    ? [post.media_url]
                    : []
              }
            />
          </View>
        ) : post.media_url ? (
          <View style={s.mediaWrap}>
            <PostMedia mediaUrl={post.media_url} feedMode />
          </View>
        ) : null}

        <View style={s.actions}>
          <Pressable
            style={({ pressed }) => [s.actionBtn, pressed && s.actionBtnPressed]}
            onPress={handleLike}
            disabled={liking}
          >
            <Ionicons
              name={post.liked_by_me ? "heart" : "heart-outline"}
              size={22}
              color={post.liked_by_me ? HEART_COLOR : colors.textSecondary}
            />
            <Text style={[s.actionCount, post.liked_by_me && s.actionCountActive]}>
              {post.like_count}
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [s.actionBtn, pressed && s.actionBtnPressed]}
            onPress={() => setCommentsOpen(true)}
          >
            <Ionicons name="chatbubble-outline" size={22} color={colors.textSecondary} />
            <Text style={s.actionCount}>{post.comment_count}</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [s.actionBtn, pressed && s.actionBtnPressed]}
            onPress={handleSave}
            disabled={saving}
          >
            <Ionicons
              name={saved ? "bookmark" : "bookmark-outline"}
              size={22}
              color={saved ? colors.primary : colors.textSecondary}
            />
          </Pressable>

          <Pressable
            style={({ pressed }) => [s.actionBtn, pressed && s.actionBtnPressed]}
            onPress={() => void handleShare()}
          >
            <Ionicons name="share-outline" size={22} color={colors.textSecondary} />
          </Pressable>
        </View>

        <Pressable
          style={({ pressed }) => [s.commentsTeaser, pressed && s.commentsTeaserPressed]}
          onPress={() => setCommentsOpen(true)}
        >
          <View>
            <Text style={s.commentsTeaserText}>
              {post.comment_count > 0
                ? `View all ${post.comment_count} comment${post.comment_count === 1 ? "" : "s"}`
                : "Be the first to comment"}
            </Text>
            <Text style={s.commentsTeaserHint}>Tap to open comments</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
        </Pressable>
      </ScrollView>

      <CommentSheet
        visible={commentsOpen}
        postId={postId}
        postTitle={post.title}
        onClose={() => setCommentsOpen(false)}
        onCommentCountChange={handleCommentCountChange}
      />
    </>
  );
}
