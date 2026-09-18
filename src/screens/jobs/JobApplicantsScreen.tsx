import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  ScrollView
} from "react-native";
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  listJobInterests,
  updateJobInterest,
  type JobInterestItem
} from "../../api/posts.api";
import { getErrorStatus } from "../../api/client";
import { HeaderBackButton } from "../../components/ui/HeaderBackButton";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { AvatarImage } from "../../components/ui/AvatarImage";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { textFieldMultiline } from "../../theme/textField";
import { appAlert } from "../../utils/appAlert";
import { formatApplicationStatus, EMPLOYER_APPLICATION_ACTIONS } from "../../constants/jobs";
import type { RootStackParamList } from "../../navigation/types";
import { timeAgo } from "../../utils/timeAgo";

type StatusFilter =
  | "all"
  | "APPLIED"
  | "REVIEWED"
  | "SHORTLISTED"
  | "INTERVIEW_SCHEDULED"
  | "SELECTED"
  | "REJECTED";

const STATUS_CHIPS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "APPLIED", label: "Applied" },
  { id: "REVIEWED", label: "Reviewed" },
  { id: "SHORTLISTED", label: "Shortlisted" },
  { id: "INTERVIEW_SCHEDULED", label: "Interview" },
  { id: "SELECTED", label: "Selected" },
  { id: "REJECTED", label: "Rejected" }
];

const ACTION_LABELS: Record<string, string> = Object.fromEntries(
  EMPLOYER_APPLICATION_ACTIONS.map((a) => [a.value, a.label])
);

export function JobApplicantsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<RootStackParamList, "JobApplicants">>();
  const postId = route.params.postId;
  const jobTitle = route.params.jobTitle;
  const insets = useSafeAreaInsets();
  const { colors, mode: themeMode } = useTheme();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [items, setItems] = useState<JobInterestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await listJobInterests(postId, statusFilter === "all" ? undefined : statusFilter);
      setItems(data.items);
      setNotesDraft((prev) => {
        const next = { ...prev };
        for (const it of data.items) {
          if (next[it.id] === undefined && it.employer_notes) {
            next[it.id] = it.employer_notes;
          }
        }
        return next;
      });
    } catch (e) {
      const status = getErrorStatus(e);
      if (status === 401) navigation.reset({ index: 0, routes: [{ name: "Login" }] });
      else if (status === 403) navigation.reset({ index: 0, routes: [{ name: "PendingApproval" }] });
      else setError(e instanceof Error ? e.message : "Failed to load applicants");
    }
  }, [navigation, postId, statusFilter]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load().finally(() => setLoading(false));
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const patchItem = useCallback((updated: JobInterestItem) => {
    setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
  }, []);

  const runStatusUpdate = useCallback(
    async (item: JobInterestItem, nextStatus: string) => {
      setUpdatingId(item.id);
      try {
        const updated = await updateJobInterest(postId, item.id, { status: nextStatus });
        patchItem(updated);
      } catch (e) {
        appAlert(
          "Error",
          (e as any)?.response?.data?.message ?? "Could not update application status."
        );
      } finally {
        setUpdatingId(null);
      }
    },
    [patchItem, postId]
  );

  const handleAction = useCallback(
    (item: JobInterestItem, action: string) => {
      const label = ACTION_LABELS[action] ?? action;
      if (action === "REJECTED") {
        appAlert("Reject applicant?", `${item.author.name} will be marked as rejected.`, [
          { text: "Cancel", style: "cancel" },
          {
            text: "Reject",
            style: "destructive",
            onPress: () => void runStatusUpdate(item, action)
          }
        ]);
        return;
      }
      if (action === "SELECTED") {
        appAlert("Select applicant?", `Mark ${item.author.name} as selected for this role?`, [
          { text: "Cancel", style: "cancel" },
          { text: "Select", onPress: () => void runStatusUpdate(item, action) }
        ]);
        return;
      }
      void runStatusUpdate(item, action);
    },
    [runStatusUpdate]
  );

  const saveNotes = useCallback(
    async (item: JobInterestItem) => {
      const notes = notesDraft[item.id] ?? "";
      setSavingId(item.id);
      try {
        const updated = await updateJobInterest(postId, item.id, {
          employer_notes: notes.trim() || null
        });
        patchItem(updated);
        appAlert("Saved", "Employer notes updated.");
      } catch (e) {
        appAlert("Error", (e as any)?.response?.data?.message ?? "Could not save notes.");
      } finally {
        setSavingId(null);
      }
    },
    [notesDraft, patchItem, postId]
  );

  const s = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: colors.background },
        header: {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: spacing.md,
          paddingBottom: spacing.sm,
          backgroundColor: colors.surface,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border,
          gap: 8
        },
        headerTextCol: { flex: 1, minWidth: 0 },
        headerTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
        headerSub: { marginTop: 1, fontSize: 12, color: colors.textSecondary },
        chipRow: {
          flexGrow: 0,
          flexShrink: 0,
          backgroundColor: colors.surface,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border
        },
        chipScroll: {
          flexGrow: 0,
          paddingHorizontal: spacing.md,
          paddingVertical: 10,
          alignItems: "center"
        },
        chip: {
          height: 34,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 14,
          borderRadius: radius.full,
          borderWidth: 1,
          borderColor: colors.border,
          backgroundColor: colors.background,
          marginRight: 8
        },
        chipActive: {
          borderColor: "#0D9488",
          backgroundColor: themeMode === "dark" ? "#134E4A" : "#F0FDFA"
        },
        chipText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
        chipTextActive: { color: themeMode === "dark" ? "#5EEAD4" : "#0F766E" },
        listContent: {
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.sm,
          paddingBottom: spacing.xxxl,
          flexGrow: 1
        },
        card: {
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border,
          padding: spacing.lg,
          marginBottom: spacing.md,
          gap: spacing.sm
        },
        name: { fontSize: 16, fontWeight: "700", color: colors.text },
        message: { fontSize: 13, lineHeight: 19, color: colors.textSecondary },
        meta: { fontSize: 12, color: colors.textMuted },
        statusBadge: {
          alignSelf: "flex-start",
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: radius.full,
          backgroundColor: themeMode === "dark" ? "#134E4A" : "#CCFBF1"
        },
        statusText: {
          fontSize: 11,
          fontWeight: "700",
          color: themeMode === "dark" ? "#5EEAD4" : "#0F766E"
        },
        actionsRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 },
        actionBtn: {
          paddingHorizontal: 10,
          paddingVertical: 8,
          borderRadius: radius.md,
          backgroundColor: colors.surfaceElevated,
          borderWidth: 1,
          borderColor: colors.border
        },
        actionBtnText: { fontSize: 11, fontWeight: "700", color: colors.primary },
        notesInput: {
          ...textFieldMultiline,
          minHeight: 72,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.md,
          padding: spacing.sm,
          color: colors.text,
          backgroundColor: colors.surfaceElevated,
          marginTop: 4
        },
        center: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.xl },
        errorText: { color: colors.error, textAlign: "center", marginBottom: spacing.md },
        empty: { alignItems: "center", paddingTop: 48, paddingHorizontal: spacing.xl },
        emptyTitle: { fontSize: 16, fontWeight: "800", color: colors.text },
        emptyText: { marginTop: spacing.sm, fontSize: 13, color: colors.textSecondary, textAlign: "center" }
      }),
    [colors, themeMode]
  );

  const availableActions = useCallback((status: string) => {
    const all = EMPLOYER_APPLICATION_ACTIONS.map((a) => a.value);
    if (status === "SELECTED" || status === "REJECTED" || status === "WITHDRAWN") return [];
    return all.filter((a) => a !== status);
  }, []);

  const renderItem = useCallback(
    ({ item }: { item: JobInterestItem }) => {
      const actions = availableActions(item.status);
      const busy = updatingId === item.id || savingId === item.id;
      return (
        <View style={s.card}>
          <Pressable
            onPress={() => navigation.navigate("MemberProfile", { userId: item.author.id })}
            style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
          >
            <AvatarImage
              uri={item.author.profile_image}
              name={item.author.name}
              size={44}
            />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={s.name} numberOfLines={1}>
                {item.author.name}
              </Text>
              <Text style={s.meta}>Applied {timeAgo(item.created_at)}</Text>
            </View>
            <View style={s.statusBadge}>
              <Text style={s.statusText}>{formatApplicationStatus(item.status)}</Text>
            </View>
          </Pressable>
          {item.message ? <Text style={s.message}>{item.message}</Text> : null}
          {actions.length > 0 ? (
            <View style={s.actionsRow}>
              {actions.map((action) => (
                <Pressable
                  key={action}
                  style={({ pressed }) => [s.actionBtn, pressed && { opacity: 0.85 }]}
                  disabled={busy}
                  onPress={() => handleAction(item, action)}
                >
                  <Text style={s.actionBtnText}>
                    {action === "REVIEWED"
                      ? "Review"
                      : action === "SHORTLISTED"
                        ? "Shortlist"
                        : action === "INTERVIEW_SCHEDULED"
                          ? "Interview"
                          : action === "SELECTED"
                            ? "Select"
                            : "Reject"}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}
          <Text style={{ fontSize: 12, fontWeight: "700", color: colors.textSecondary, marginTop: 4 }}>
            Employer notes (optional)
          </Text>
          <TextInput
            style={s.notesInput}
            value={notesDraft[item.id] ?? item.employer_notes ?? ""}
            onChangeText={(t) => setNotesDraft((prev) => ({ ...prev, [item.id]: t }))}
            placeholder="Private notes about this applicant"
            placeholderTextColor={colors.textMuted}
            multiline
            editable={!busy}
          />
          <PrimaryButton
            title="Save notes"
            variant="secondary"
            onPress={() => void saveNotes(item)}
            loading={savingId === item.id}
            disabled={busy && savingId !== item.id}
          />
        </View>
      );
    },
    [
      availableActions,
      colors.textMuted,
      colors.textSecondary,
      handleAction,
      navigation,
      notesDraft,
      saveNotes,
      savingId,
      s,
      updatingId
    ]
  );

  return (
    <View style={s.root}>
      <View style={[s.header, { paddingTop: insets.top + spacing.xs }]}>
        <HeaderBackButton onPress={() => navigation.goBack()} />
        <View style={s.headerTextCol}>
          <Text style={s.headerTitle} numberOfLines={1}>
            Applicants
          </Text>
          <Text style={s.headerSub} numberOfLines={1}>
            {jobTitle?.trim() || `Job #${postId}`}
          </Text>
        </View>
      </View>

      <View style={s.chipRow}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.chipScroll}
          keyboardShouldPersistTaps="handled"
          style={{ flexGrow: 0, flexShrink: 0 }}
        >
          {STATUS_CHIPS.map((c) => {
            const active = statusFilter === c.id;
            return (
              <Pressable
                key={c.id}
                style={[s.chip, active && s.chipActive]}
                onPress={() => setStatusFilter(c.id)}
              >
                <Text style={[s.chipText, active && s.chipTextActive]}>{c.label}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {loading && items.length === 0 ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : error && items.length === 0 ? (
        <View style={s.center}>
          <Text style={s.errorText}>{error}</Text>
          <PrimaryButton title="Retry" onPress={() => void load()} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={s.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} colors={[colors.primary]} />
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="people-outline" size={36} color="#0D9488" />
              <Text style={[s.emptyTitle, { marginTop: spacing.md }]}>No applicants yet</Text>
              <Text style={s.emptyText}>
                {statusFilter === "all"
                  ? "When members apply, they will appear here."
                  : "No applicants match this filter."}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
}
