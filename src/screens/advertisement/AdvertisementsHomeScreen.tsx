import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Image,
  RefreshControl,
  ActivityIndicator
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  deleteAdvertisement,
  getAdvertisementInvoice,
  listMyAdvertisements,
  type AdvertisementListItem
} from "../../api/advertisement.api";
import { getAuthErrorMessage, getErrorStatus } from "../../api/client";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { appAlert } from "../../utils/appAlert";
import {
  adStatusColor,
  adStatusLabel,
  adTypeLabel,
  formatInrFromPaise,
  isEditableAdvertisement,
  isUnpaidDraft,
  isContinuableDraft,
  advertiserEditActionLabel,
  isAdvertiserDeletable,
  shouldShowAnalytics,
  isRasterPreviewUri
} from "../../utils/advertisementUi";

export function AdvertisementsHomeScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [items, setItems] = useState<AdvertisementListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdvertisementListItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  const deletingRef = useRef(false);

  const load = useCallback(async () => {
    const data = await listMyAdvertisements(1);
    setItems(data.items || []);
    setError(null);
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load()
        .catch((e) => setError(getAuthErrorMessage(e)))
        .finally(() => setLoading(false));
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await load();
    } catch (e) {
      setError(getAuthErrorMessage(e));
    } finally {
      setRefreshing(false);
    }
  }, [load]);

  const openInvoice = useCallback(async (item: AdvertisementListItem) => {
    if (!item.invoiceAvailable) return;
    try {
      const invoice = await getAdvertisementInvoice(item.id);
      await appAlert(
        "Invoice",
        [
          invoice.invoiceNumber,
          `Total ${formatInrFromPaise(Math.round(invoice.amountInr * 100))}`,
          `GST ${invoice.gstPercent}% · ${formatInrFromPaise(invoice.gstAmountPaise)}`,
          invoice.issuedAt ? `Issued ${new Date(invoice.issuedAt).toLocaleDateString()}` : ""
        ]
          .filter(Boolean)
          .join("\n")
      );
    } catch (e) {
      await appAlert("Invoice unavailable", getAuthErrorMessage(e));
    }
  }, []);

  const openActions = useCallback(
    (item: AdvertisementListItem) => {
      const buttons: Array<{ text: string; style?: "cancel" | "destructive"; onPress?: () => void }> = [
        { text: "Cancel", style: "cancel" },
        {
          text: "View details",
          onPress: () => navigation.navigate("AdvertisementDetail", { id: item.id })
        }
      ];
      if (isEditableAdvertisement(item.status)) {
        buttons.push({
          text: advertiserEditActionLabel(item.status) || "Edit",
          onPress: () => navigation.navigate("AdvertisementCreate", { id: item.id })
        });
      }
      if (item.invoiceAvailable) {
        buttons.push({
          text: "Invoice",
          onPress: () => void openInvoice(item)
        });
      }
      if (isAdvertiserDeletable(item.status)) {
        buttons.push({
          text: isUnpaidDraft(item.status) ? "Delete draft" : "Delete advertisement",
          style: "destructive",
          onPress: () => setDeleteTarget(item)
        });
      }
      appAlert(item.title, undefined, buttons, { variant: "actionSheet" });
    },
    [navigation, openInvoice]
  );

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget || deletingRef.current) return;
    const target = deleteTarget;
    deletingRef.current = true;
    setDeleting(true);
    try {
      await deleteAdvertisement(target.id);
      setItems((prev) => prev.filter((row) => row.id !== target.id));
      setDeleteTarget(null);
      appAlert(
        isUnpaidDraft(target.status) ? "Draft deleted" : "Advertisement removed",
        isUnpaidDraft(target.status)
          ? "The draft and its uploaded media were removed."
          : "This advertisement will no longer be shown. Payment records and invoices are kept."
      );
    } catch (e) {
      if (getErrorStatus(e) === 404) {
        setItems((prev) => prev.filter((row) => row.id !== target.id));
        setDeleteTarget(null);
        return;
      }
      appAlert("Could not delete", getAuthErrorMessage(e));
    } finally {
      deletingRef.current = false;
      setDeleting(false);
    }
  }, [deleteTarget]);

  const s = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: colors.background, paddingTop: insets.top },
        header: {
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          gap: 8
        },
        backBtn: {
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.surfaceElevated
        },
        title: { flex: 1, ...typography.h3, color: colors.text },
        card: {
          marginHorizontal: spacing.md,
          marginBottom: spacing.sm,
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          overflow: "hidden"
        },
        row: { flexDirection: "row", gap: 12, padding: spacing.md },
        thumb: {
          width: 72,
          height: 72,
          borderRadius: radius.md,
          backgroundColor: colors.surfaceElevated,
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden"
        },
        play: {
          position: "absolute",
          right: 6,
          bottom: 6,
          backgroundColor: "rgba(0,0,0,0.55)",
          borderRadius: 10,
          padding: 2
        },
        name: { ...typography.body, fontWeight: "700" as const, color: colors.text },
        meta: { ...typography.caption, color: colors.textSecondary, marginTop: 4 },
        badge: {
          alignSelf: "flex-start",
          marginTop: 6,
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: radius.full
        },
        badgeText: { fontSize: 11, fontWeight: "700" as const },
        actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
        actionChip: {
          paddingHorizontal: 10,
          paddingVertical: 6,
          borderRadius: radius.full,
          borderWidth: 1,
          borderColor: colors.border
        },
        actionText: { fontSize: 12, fontWeight: "600" as const, color: colors.text },
        empty: { alignItems: "center", paddingTop: 48, paddingHorizontal: spacing.xl },
        emptyTitle: { ...typography.h3, color: colors.text, textAlign: "center" },
        emptyText: {
          ...typography.bodySmall,
          color: colors.textSecondary,
          textAlign: "center",
          marginTop: spacing.sm
        },
        errorBox: { padding: spacing.md, alignItems: "center" },
        errorText: { color: colors.error, textAlign: "center", marginBottom: spacing.sm }
      }),
    [colors, insets.top]
  );

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={s.title}>My Advertisements</Text>
      </View>
      {loading && items.length === 0 ? (
        <View style={{ paddingTop: 48, alignItems: "center" }}>
          <ActivityIndicator color={colors.primary} />
          <Text style={{ color: colors.textSecondary, marginTop: 12 }}>Loading advertisements…</Text>
        </View>
      ) : error && items.length === 0 ? (
        <View style={s.errorBox}>
          <Text style={s.errorText}>{error}</Text>
          <PrimaryButton title="Retry" onPress={() => void onRefresh()} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.id)}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />
          }
          ListHeaderComponent={
            <View style={{ padding: spacing.md }}>
              <PrimaryButton
                title="Create advertisement"
                onPress={() => navigation.navigate("AdvertisementCreate")}
              />
            </View>
          }
          ListEmptyComponent={
            <View style={s.empty}>
              <Text style={s.emptyTitle}>No advertisements yet</Text>
              <Text style={s.emptyText}>
                Create a campaign, upload media, and pay the server-quoted price. It stays in review until an admin
                approves it.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const statusColor = adStatusColor(item.status, colors);
            return (
              <Pressable
                style={s.card}
                  onPress={() =>
                    isContinuableDraft(item.status)
                      ? navigation.navigate("AdvertisementCreate", { id: item.id })
                      : navigation.navigate("AdvertisementDetail", { id: item.id })
                  }
              >
                <View style={s.row}>
                  <View style={s.thumb}>
                    {item.thumbnailUrl && isRasterPreviewUri(item.thumbnailUrl, item.mediaKind) ? (
                      <Image source={{ uri: item.thumbnailUrl }} style={{ width: 72, height: 72 }} />
                    ) : (
                      <Ionicons
                        name={item.mediaKind === "video" ? "videocam-outline" : "image-outline"}
                        size={22}
                        color={colors.textMuted}
                      />
                    )}
                    {item.mediaKind === "video" ? (
                      <View style={s.play}>
                        <Ionicons name="play" size={12} color="#fff" />
                      </View>
                    ) : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.name}>{item.title}</Text>
                    <Text style={s.meta}>{adTypeLabel(item.typeCode)}</Text>
                    <View style={[s.badge, { backgroundColor: `${statusColor}18` }]}>
                      <Text style={[s.badgeText, { color: statusColor }]}>{adStatusLabel(item.status)}</Text>
                    </View>
                    <Text style={s.meta}>
                      {item.amountPaise != null ? formatInrFromPaise(item.amountPaise) : "Not paid"}
                      {item.durationDays ? ` · ${item.durationDays} days` : ""}
                      {item.scheduledStartAt && item.scheduledEndAt
                        ? ` · ${new Date(item.scheduledStartAt).toLocaleDateString()} – ${new Date(
                            item.scheduledEndAt
                          ).toLocaleDateString()}`
                        : ""}
                    </Text>
                    {shouldShowAnalytics(item.status) ? (
                      <Text style={s.meta}>
                        {item.impressions} impressions · {item.clicks} clicks · {item.ctr}% CTR
                        {item.remainingDays != null ? ` · ${item.remainingDays}d left` : ""}
                      </Text>
                    ) : null}
                    <View style={s.actions}>
                      {isEditableAdvertisement(item.status) ? (
                        <Pressable
                          style={s.actionChip}
                          onPress={() => navigation.navigate("AdvertisementCreate", { id: item.id })}
                        >
                          <Text style={s.actionText}>
                            {advertiserEditActionLabel(item.status) || "Edit"}
                          </Text>
                        </Pressable>
                      ) : null}
                      {item.invoiceAvailable ? (
                        <Pressable style={s.actionChip} onPress={() => void openInvoice(item)}>
                          <Text style={s.actionText}>Invoice</Text>
                        </Pressable>
                      ) : null}
                      {isAdvertiserDeletable(item.status) ? (
                        <Pressable
                          style={s.actionChip}
                          onPress={() => setDeleteTarget(item)}
                          disabled={deleting}
                        >
                          <Text style={[s.actionText, { color: colors.error }]}>Delete</Text>
                        </Pressable>
                      ) : null}
                      <Pressable style={s.actionChip} onPress={() => openActions(item)}>
                        <Text style={s.actionText}>More</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              </Pressable>
            );
          }}
        />
      )}
      <ConfirmDialog
        visible={deleteTarget != null}
        title={deleteTarget && isUnpaidDraft(deleteTarget.status) ? "Delete this draft?" : "Delete Advertisement?"}
        message={
          deleteTarget && isUnpaidDraft(deleteTarget.status)
            ? "This will permanently remove the draft and its uploaded media."
            : "This advertisement will stop showing. Payment records and invoices are kept. Are you sure?"
        }
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        cancelLabel="Cancel"
        variant="destructive"
        onCancel={() => (deleting ? undefined : setDeleteTarget(null))}
        onConfirm={() => void confirmDelete()}
      />
    </View>
  );
}
