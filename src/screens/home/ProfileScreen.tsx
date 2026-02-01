import React, { useEffect, useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useProfile } from "../../hooks/useProfile";
import { useProfileActivity } from "../../hooks/useProfileActivity";
import { clearToken } from "../../storage/token.storage";
import { colors } from "../../theme/colors";
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
  ActionButtons,
  ProfileSkeleton
} from "../../components/profile";
import type { ActivityTab } from "../../components/profile";

/**
 * Profile Screen – read-only by default; Edit opens separate screen.
 * Data from useProfile + useProfileActivity; no API calls in UI.
 * 401 → Login; 403 → Approval Pending.
 */
export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const { profile, loading, error, refetch } = useProfile();
  const [activityTab, setActivityTab] = useState<ActivityTab>("my");
  const { items, loading: activityLoading, refetch: refetchActivity } = useProfileActivity(
    activityTab,
    !!profile
  );
  const [refreshing, setRefreshing] = useState(false);
  const [logoutDialogVisible, setLogoutDialogVisible] = useState(false);

  /** 401 → clear token, go to Login; 403 → Approval Pending */
  useEffect(() => {
    if (!error) return;
    const status = error.status;
    if (status === 401) {
      clearToken().then(() => {
        navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      });
      return;
    }
    if (status === 403) {
      navigation.reset({ index: 0, routes: [{ name: "PendingApproval" }] });
    }
  }, [error, navigation]);

  useEffect(() => {
    if (profile) refetchActivity();
  }, [activityTab, profile, refetchActivity]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    refetchActivity();
    setRefreshing(false);
  }, [refetch, refetchActivity]);

  const onLogoutPress = useCallback(() => {
    setLogoutDialogVisible(true);
  }, []);

  const onLogoutConfirm = useCallback(async () => {
    setLogoutDialogVisible(false);
    await clearToken();
    navigation.reset({ index: 0, routes: [{ name: "Landing" }] });
  }, [navigation]);

  const onLogoutCancel = useCallback(() => {
    setLogoutDialogVisible(false);
  }, []);

  const onEditPress = useCallback(() => {
    navigation.navigate("EditProfile");
  }, [navigation]);

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
    <ScrollView
      style={s.container}
      contentContainerStyle={[
        s.scrollContent,
        { paddingTop: insets.top + spacing.lg, paddingBottom: insets.bottom + spacing.xxl }
      ]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
      }
      showsVerticalScrollIndicator={false}
    >
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
        items={items}
        loading={activityLoading}
      />
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
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  centered: { justifyContent: "center", alignItems: "center", paddingHorizontal: spacing.xxl },
  scrollContent: { flexGrow: 1, paddingHorizontal: spacing.xl, paddingBottom: spacing.xxxl },
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
  retryBtnText: { ...typography.buttonSmall, color: colors.white }
});
