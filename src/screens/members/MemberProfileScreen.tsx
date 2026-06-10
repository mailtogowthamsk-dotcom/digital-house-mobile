import React, { useCallback, useState } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, Pressable } from "react-native";
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { getMemberProfile, type MemberProfile, blockMember, reportMember, MEMBER_REPORT_REASONS } from "../../api/users.api";
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
import { formatUsername } from "../../utils/username";
import { relationshipLabel } from "../../utils/relationshipStatus";
import { appAlert } from "../../utils/appAlert";

type Params = { MemberProfile: { userId?: number; username?: string } };

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
  const { colors } = useTheme();
  const route = useRoute<RouteProp<Params, "MemberProfile">>();
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const identifier = route.params.username ?? route.params.userId;

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
    }, [load])
  );

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
              void runAction(
                () => sendConnectionRequest(profile!.id),
                "Connection request sent."
              )
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
          <View style={styles.actionCol}>
            <Pressable
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              onPress={openChat}
            >
              <Ionicons name="chatbubble-outline" size={18} color={colors.white} />
              <Text style={[styles.primaryBtnText, { color: colors.white }]}>Message</Text>
            </Pressable>
            <Pressable
              onPress={() =>
                appAlert("Disconnect?", "You will need to wait 7 days before reconnecting.", [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Disconnect",
                    style: "destructive",
                    onPress: () => void runAction(() => disconnectConnection(profile!.id))
                  }
                ])
              }
            >
              <Text style={{ color: colors.error, fontWeight: "600", marginTop: spacing.sm }}>
                Disconnect
              </Text>
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

  const location = [profile.city, profile.district].filter(Boolean).join(", ");
  const statusLabel = relationshipLabel(profile.relationshipStatus);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.background }} contentContainerStyle={styles.content}>
      {!profile.isSelf ? (
        <Pressable
          style={[styles.menuBtn, { alignSelf: "flex-end", marginBottom: spacing.sm }]}
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
          size={88}
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
        {profile.needsUsernameSetup && !profile.isSelf ? (
          <View style={[styles.banner, { backgroundColor: colors.surfaceElevated }]}>
            <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.bannerText, { color: colors.textSecondary }]}>
              This member has not set a @username yet. Connection and messaging are unavailable until
              they complete profile setup.
            </Text>
          </View>
        ) : null}
        {profile.isPrivatePreview && !profile.needsUsernameSetup ? (
          <View style={[styles.banner, { backgroundColor: colors.surfaceElevated }]}>
            <Ionicons name="lock-closed-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.bannerText, { color: colors.textSecondary }]}>
              Private profile — limited preview only. Full profile is visible to accepted connections.
            </Text>
          </View>
        ) : null}
      </View>

      {!profile.isPrivatePreview ? (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {profile.occupation ? (
            <InfoRow label="Occupation" value={profile.occupation} colors={colors} />
          ) : null}
          {profile.community ? (
            <InfoRow label="Community" value={profile.community} colors={colors} />
          ) : null}
          {profile.communityRole ? (
            <InfoRow label="Role" value={profile.communityRole} colors={colors} />
          ) : null}
        </View>
      ) : null}

      {!profile.isSelf && !profile.needsUsernameSetup ? (
        <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <Ionicons name="people-outline" size={20} color={colors.textSecondary} />
          <Text style={[styles.connectTitle, { color: colors.text }]}>Connection</Text>
          <Text style={[styles.connectSub, { color: colors.textSecondary }]}>
            Messaging opens only after connection is accepted or mutual matrimony match.
          </Text>
          {renderConnectionActions(profile.relationshipStatus)}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
  card: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    alignItems: "center"
  },
  name: { marginTop: spacing.md, fontSize: 22, fontWeight: "800", textAlign: "center" },
  username: { marginTop: 4, fontSize: 16, fontWeight: "700" },
  location: { marginTop: 6, fontSize: 14 },
  statusBadge: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    borderRadius: radius.full
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
  infoRow: { width: "100%", marginBottom: spacing.sm },
  infoLabel: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  infoValue: { fontSize: 15, marginTop: 2, fontWeight: "600" },
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
  actionCol: { width: "100%", alignItems: "center" },
  errorTitle: { marginTop: spacing.md, fontSize: 17, fontWeight: "800" },
  errorSub: { marginTop: spacing.sm, textAlign: "center", lineHeight: 20 },
  menuBtn: { padding: spacing.sm }
});
