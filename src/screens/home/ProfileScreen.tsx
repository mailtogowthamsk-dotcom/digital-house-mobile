import React, { useEffect, useCallback, useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
  ActivityIndicator
} from "react-native";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useProfile } from "../../hooks/useProfile";
import { useProfileActivity } from "../../hooks/useProfileActivity";
import { useProfilePosts } from "../../hooks/useProfilePosts";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../theme/ThemeContext";
import { typography } from "../../theme/typography";
import { spacing, radius } from "../../theme/spacing";
import { messages } from "../../theme/messages";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import {
  ProfileHeader,
  PersonalInfoSection,
  ProfessionalInfoSection,
  StatsCards,
  MyActivityTabs,
  ProfilePostsSection,
  ActionButtons,
  ProfileSkeleton
} from "../../components/profile";
import type { ActivityTab } from "../../components/profile";

/**
 * Profile Screen – read-only by default; Edit opens separate screen.
 * My Posts: paginated grid via GET /api/profile/posts; saved/liked use activity API.
 */
export function ProfileScreen() {
  const { signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { profile, loading, error, refetch } = useProfile();
  const [activityTab, setActivityTab] = useState<ActivityTab>("my");

  const {
    items: posts,
    loading: postsLoading,
    loadingMore: postsLoadingMore,
    error: postsError,
    refetch: refetchPosts,
    loadMore: loadMorePosts,
    removePost
  } = useProfilePosts(!!profile && activityTab === "my");

  useFocusEffect(
    useCallback(() => {
      refetch();
      if (activityTab === "my") refetchPosts();
    }, [refetch, refetchPosts, activityTab])
  );

  const {
    items: activityItems,
    loading: activityLoading,
    refetch: refetchActivity
  } = useProfileActivity(activityTab, !!profile && activityTab !== "my");

  const [refreshing, setRefreshing] = useState(false);
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);

  const s = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        centered: { justifyContent: "center", alignItems: "center", paddingHorizontal: spacing.xxl },
        listContent: {
          flexGrow: 1,
          paddingHorizontal: spacing.xl,
          paddingBottom: spacing.xxxl
        },
        errorIconWrap: {
          width: 88,
          height: 88,
          borderRadius: 44,
          backgroundColor: colors.error + "12",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: spacing.lg
        },
        errorTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.xs },
        errorText: { ...typography.bodySmall, color: colors.textSecondary, textAlign: "center" },
        retryBtn: {
          marginTop: spacing.xl,
          paddingVertical: spacing.md,
          paddingHorizontal: spacing.xxl,
          backgroundColor: colors.primary,
          borderRadius: radius.lg
        },
        pressed: { opacity: 0.9 },
        retryBtnText: { ...typography.buttonSmall, color: colors.white },
        footerLoader: { paddingVertical: spacing.lg }
      }),
    [colors]
  );

  useEffect(() => {
    if (!error) return;
    const status = error.status;
    if (status === 401) {
      signOut().then(() => {
        navigation.reset({ index: 0, routes: [{ name: "Landing" }] });
      });
      return;
    }
    if (status === 403) {
      navigation.reset({ index: 0, routes: [{ name: "PendingApproval" }] });
    }
  }, [error, navigation, signOut]);

  useEffect(() => {
    if (profile && activityTab !== "my") refetchActivity();
  }, [activityTab, profile, refetchActivity]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    if (activityTab === "my") await refetchPosts();
    else refetchActivity();
    setRefreshing(false);
  }, [refetch, activityTab, refetchPosts, refetchActivity]);

  const onPostPress = useCallback(
    (postId: number) => {
      navigation.navigate("PostDetail", { postId });
    },
    [navigation]
  );

  const onLogoutPress = useCallback(() => setLogoutDialogVisible(true), []);
  const onLogoutConfirm = useCallback(async () => {
    setLogoutDialogVisible(false);
    await signOut();
    navigation.reset({ index: 0, routes: [{ name: "Landing" }] });
  }, [navigation, signOut]);
  const onLogoutCancel = useCallback(() => setLogoutDialogVisible(false), []);
  const onEditPress = useCallback(() => navigation.navigate("EditProfile"), [navigation]);

  const listHeader = useMemo(() => {
    if (!profile) return null;
    return (
      <>
        <ProfileHeader
          name={profile.name}
          profile_image={profile.profile_image}
          verified={profile.verified}
          member_since={profile.member_since}
          completion_percentage={profile.completion_percentage}
        />
        <PersonalInfoSection fullName={profile.name} personal={profile.personal_info} />
        <ProfessionalInfoSection professional={profile.professional_info} />
        <StatsCards stats={profile.stats} />
        <MyActivityTabs
          activeTab={activityTab}
          onTabChange={setActivityTab}
          items={activityItems}
          loading={activityLoading}
          onActivityItemPress={onPostPress}
          myPostsContent={
            activityTab === "my" ? (
              <ProfilePostsSection
                items={posts}
                loading={postsLoading}
                loadingMore={postsLoadingMore}
                error={postsError}
                onRetry={refetchPosts}
                onPostPress={onPostPress}
                onDeleted={removePost}
              />
            ) : undefined
          }
        />
      </>
    );
  }, [
    profile,
    activityTab,
    activityItems,
    activityLoading,
    posts,
    postsLoading,
    postsLoadingMore,
    postsError,
    refetchPosts,
    onPostPress,
    removePost
  ]);

  const listFooter = useMemo(
    () => (
      <>
        {activityTab === "my" && postsLoadingMore ? (
          <ActivityIndicator size="small" color={colors.primary} style={s.footerLoader} />
        ) : null}
        <ActionButtons
          onEditPress={onEditPress}
          onDownloadPress={() => {}}
          onLogoutPress={onLogoutPress}
        />
        <ConfirmDialog
          visible={logoutDialogVisible}
          title={messages.confirm.logoutTitle}
          message={messages.confirm.logoutMessage}
          confirmLabel={messages.confirm.logoutConfirm}
          cancelLabel={messages.confirm.logoutCancel}
          onConfirm={onLogoutConfirm}
          onCancel={onLogoutCancel}
          variant="destructive"
        />
      </>
    ),
    [
      activityTab,
      postsLoadingMore,
      colors.primary,
      s.footerLoader,
      onEditPress,
      onLogoutPress,
      logoutDialogVisible,
      onLogoutConfirm,
      onLogoutCancel
    ]
  );

  if (loading && !profile) {
    return (
      <View style={s.container}>
        <ProfileSkeleton />
      </View>
    );
  }

  if (error && !profile) {
    const isAuthError = error.status === 401 || error.status === 403;
    if (isAuthError) return null;
    return (
      <View style={[s.container, s.centered]}>
        <View style={s.errorIconWrap}>
          <Ionicons name="cloud-offline-outline" size={48} color={colors.error} />
        </View>
        <Text style={s.errorTitle}>Couldn't load profile</Text>
        <Text style={s.errorText}>{error.message || messages.error.loadProfile}</Text>
        <Pressable style={({ pressed }) => [s.retryBtn, pressed && s.pressed]} onPress={refetch}>
          <Text style={s.retryBtnText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (!profile) return null;

  return (
    <FlatList
      style={s.container}
      data={[]}
      renderItem={() => null}
      ListHeaderComponent={
        <View style={{ paddingTop: insets.top + spacing.lg }}>{listHeader}</View>
      }
      ListFooterComponent={
        <View style={{ paddingBottom: insets.bottom + spacing.xxl }}>{listFooter}</View>
      }
      contentContainerStyle={s.listContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
      }
      onEndReached={activityTab === "my" ? loadMorePosts : undefined}
      onEndReachedThreshold={0.35}
      showsVerticalScrollIndicator={false}
    />
  );
}
