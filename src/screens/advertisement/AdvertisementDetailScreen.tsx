import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl
} from "react-native";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  deleteAdvertisement,
  getAdvertisementAnalytics,
  getAdvertisementDetail
} from "../../api/advertisement.api";
import { getAuthErrorMessage, getErrorStatus } from "../../api/client";
import { AdvertisementCard } from "../../components/advertisement/AdvertisementCard";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { typography } from "../../theme/typography";
import { appAlert } from "../../utils/appAlert";
import {
  adStatusColor,
  adStatusLabel,
  adTypeLabel,
  formatInrFromPaise,
  invoiceAvailableFromDetail,
  isEditableAdvertisement,
  advertiserEditActionLabel,
  isUnpaidDraft,
  isAdvertiserDeletable,
  shouldShowAnalytics
} from "../../utils/advertisementUi";

function formatDate(value?: string | null) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

export function AdvertisementDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const id = Number(route.params?.id);
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [detail, setDetail] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const deletingRef = useRef(false);

  const load = useCallback(async () => {
    const d = await getAdvertisementDetail(id);
    setDetail(d);
    setError(null);
    const status = d?.advertisement?.status as string | undefined;
    if (status && shouldShowAnalytics(status)) {
      try {
        setAnalytics(await getAdvertisementAnalytics(id));
      } catch {
        setAnalytics(null);
      }
    } else {
      setAnalytics(null);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load()
        .catch((e) => {
          setDetail(null);
          setError(getAuthErrorMessage(e));
        })
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

  const onDelete = useCallback(async () => {
    if (deletingRef.current) return;
    const status = String(detail?.advertisement?.status || "");
    deletingRef.current = true;
    setDeleting(true);
    try {
      await deleteAdvertisement(id);
      setConfirmDelete(false);
      appAlert(
        isUnpaidDraft(status) ? "Draft deleted" : "Advertisement removed",
        isUnpaidDraft(status)
          ? "The draft and its uploaded media were removed."
          : "This advertisement will no longer be shown. Payment records and invoices are kept."
      );
      navigation.navigate("AdvertisementsHome");
    } catch (e) {
      if (getErrorStatus(e) === 404) {
        setConfirmDelete(false);
        navigation.navigate("AdvertisementsHome");
        return;
      }
      appAlert("Could not delete", getAuthErrorMessage(e));
    } finally {
      deletingRef.current = false;
      setDeleting(false);
    }
  }, [id, navigation, detail?.advertisement?.status]);

  const s = useMemo(
    () =>
      StyleSheet.create({
        root: { flex: 1, backgroundColor: colors.background, paddingTop: insets.top },
        header: { flexDirection: "row", alignItems: "center", padding: spacing.md, gap: 8 },
        backBtn: {
          width: 40,
          height: 40,
          borderRadius: 20,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.surfaceElevated
        },
        title: { ...typography.h3, color: colors.text, flex: 1 },
        box: {
          marginHorizontal: spacing.md,
          marginBottom: spacing.md,
          padding: spacing.md,
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border
        },
        section: { ...typography.label, color: colors.textSecondary, marginBottom: 6, textTransform: "uppercase" as const },
        label: { ...typography.caption, color: colors.textSecondary, marginTop: 8 },
        value: { ...typography.bodySmall, color: colors.text, marginTop: 2 },
        badge: {
          alignSelf: "flex-start",
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: radius.full,
          marginBottom: 8
        },
        badgeText: { fontSize: 12, fontWeight: "700" as const },
        actions: { paddingHorizontal: spacing.md, gap: 10, paddingBottom: 40 }
      }),
    [colors, insets.top]
  );

  if (loading && !detail) {
    return (
      <View style={s.root}>
        <View style={s.header}>
          <Pressable onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={s.title}>Advertisement</Text>
        </View>
        <ActivityIndicator color={colors.primary} style={{ marginTop: 32 }} />
        <Text style={{ textAlign: "center", color: colors.textSecondary, marginTop: 12 }}>Loading…</Text>
      </View>
    );
  }

  if (error && !detail) {
    return (
      <View style={s.root}>
        <View style={s.header}>
          <Pressable onPress={() => navigation.goBack()} style={s.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={s.title}>Advertisement</Text>
        </View>
        <View style={s.box}>
          <Text style={{ color: colors.error }}>{error}</Text>
        </View>
        <View style={s.actions}>
          <PrimaryButton title="Retry" onPress={() => void onRefresh()} />
        </View>
      </View>
    );
  }

  const ad = detail?.advertisement;
  if (!ad) {
    return (
      <View style={s.root}>
        <Text style={{ padding: 24, color: colors.textSecondary }}>Advertisement not found.</Text>
      </View>
    );
  }

  const statusColor = adStatusColor(ad.status, colors);
  const showInvoice = invoiceAvailableFromDetail(detail);
  const invoice = detail.invoice;
  const showAnalytics = shouldShowAnalytics(ad.status);
  const totals = analytics?.totals;

  return (
    <View style={s.root}>
      <View style={s.header}>
        <Pressable onPress={() => navigation.goBack()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={s.title} numberOfLines={1}>
          {ad.title}
        </Text>
      </View>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
      >
        <AdvertisementCard
          preview
          placement="home"
          ad={{
            id: ad.id,
            title: ad.title,
            description: ad.description,
            shortDescription: ad.shortDescription,
            ctaLabel: ad.ctaLabel,
            mediaUrl: ad.mediaUrl,
            thumbnailUrl: ad.thumbnailUrl,
            mediaKind: ad.mediaKind,
            typeCode: ad.typeCode,
            sponsoredLabel: "Advertisement",
            destinationUrl: ad.destinationUrl,
            validUntil: ad.scheduledEndAt,
            businessName: ad.businessName,
            businessCategory: ad.businessCategory,
            contactPhone: ad.contactPhone,
            whatsappNumber: ad.whatsappNumber,
            contactEmail: ad.contactEmail,
            business: ad.business,
            contact: ad.contact,
            location: ad.location,
            cta: ad.cta
          }}
        />

        <View style={s.box}>
          <Text style={s.section}>Status</Text>
          <View style={[s.badge, { backgroundColor: `${statusColor}18` }]}>
            <Text style={[s.badgeText, { color: statusColor }]}>{adStatusLabel(ad.status)}</Text>
          </View>
          {ad.status === "PENDING_REVIEW" && ad.approvedAt ? (
            <Text style={s.value}>
              You edited this live campaign. It is not showing until an admin approves the new creative. Paid dates stay the same.
            </Text>
          ) : ad.status === "PENDING_REVIEW" ? (
            <Text style={s.value}>Payment successful — this advertisement is waiting for admin review. It is not live yet.</Text>
          ) : null}
          {ad.status === "DRAFT" ? (
            <Text style={s.value}>This campaign is saved as a draft. Continue Draft to finish it.</Text>
          ) : null}
          {ad.status === "PAYMENT_PENDING" ? (
            <Text style={s.value}>Payment is not complete. Continue checkout to submit this campaign for review.</Text>
          ) : null}
          {ad.rejectionReason ? (
            <>
              <Text style={s.label}>Rejection reason</Text>
              <Text style={s.value}>{ad.rejectionReason}</Text>
            </>
          ) : null}
        </View>

        <View style={s.box}>
          <Text style={s.section}>Campaign</Text>
          <Text style={s.label}>Type</Text>
          <Text style={s.value}>{adTypeLabel(ad.typeCode)}</Text>
          <Text style={s.label}>Call to action</Text>
          <Text style={s.value}>{ad.ctaLabel || "—"}</Text>
          <Text style={s.label}>Destination</Text>
          <Text style={s.value}>{ad.destinationUrl || "—"}</Text>
        </View>

        <View style={s.box}>
          <Text style={s.section}>Schedule</Text>
          <Text style={s.value}>
            {formatDate(ad.scheduledStartAt)} → {formatDate(ad.scheduledEndAt)}
          </Text>
          {ad.remainingDays != null && ad.status === "ACTIVE" ? (
            <Text style={s.value}>Remaining: {ad.remainingDays} days</Text>
          ) : null}
        </View>

        <View style={s.box}>
          <Text style={s.section}>Payment</Text>
          <Text style={s.value}>
            {detail.payment
              ? `${detail.payment.status} · ${formatInrFromPaise(detail.payment.amountPaise)}`
              : "Not paid"}
          </Text>
        </View>

        {showInvoice ? (
          <View style={s.box}>
            <Text style={s.section}>Invoice</Text>
            <Text style={s.value}>{invoice.invoiceNumber}</Text>
            <Text style={s.value}>
              Total {formatInrFromPaise(Math.round(invoice.amountInr * 100))} · GST {invoice.gstPercent}% ·{" "}
              {formatInrFromPaise(invoice.gstAmountPaise)}
            </Text>
            {invoice.issuedAt ? <Text style={s.value}>Issued {formatDate(invoice.issuedAt)}</Text> : null}
          </View>
        ) : ad.status === "DRAFT" || ad.status === "PAYMENT_PENDING" ? null : (
          <View style={s.box}>
            <Text style={s.section}>Invoice</Text>
            <Text style={s.value}>Invoice is not available yet.</Text>
          </View>
        )}

        {showAnalytics ? (
          <View style={s.box}>
            <Text style={s.section}>Analytics</Text>
            {totals ? (
              <>
                <Text style={s.value}>Impressions: {totals.impressions}</Text>
                <Text style={s.value}>Unique reach: {totals.uniqueReach}</Text>
                <Text style={s.value}>Clicks: {totals.clicks}</Text>
                <Text style={s.value}>CTR: {totals.ctr}%</Text>
                {analytics.actions ? (
                  <Text style={s.value}>
                    Call {analytics.actions.call || 0} · WhatsApp {analytics.actions.whatsapp || 0} · Website{" "}
                    {analytics.actions.website || 0} · Directions {analytics.actions.directions || 0}
                  </Text>
                ) : null}
                <Text style={s.value}>Remaining days: {analytics.remainingDays ?? "—"}</Text>
              </>
            ) : (
              <Text style={s.value}>No analytics yet.</Text>
            )}
          </View>
        ) : null}

        <View style={s.actions}>
          {isEditableAdvertisement(ad.status) ? (
            <PrimaryButton
              title={advertiserEditActionLabel(ad.status) || "Edit"}
              onPress={() => navigation.navigate("AdvertisementCreate", { id: ad.id })}
            />
          ) : null}
          {isAdvertiserDeletable(ad.status) ? (
            <PrimaryButton
              title={isUnpaidDraft(ad.status) ? "Delete draft" : "Delete advertisement"}
              variant="outline"
              onPress={() => setConfirmDelete(true)}
              disabled={deleting}
            />
          ) : null}
        </View>
      </ScrollView>
      <ConfirmDialog
        visible={confirmDelete}
        title={isUnpaidDraft(ad.status) ? "Delete this draft?" : "Delete Advertisement?"}
        message={
          isUnpaidDraft(ad.status)
            ? "This will permanently remove the draft and its uploaded media."
            : "This advertisement will stop showing. Payment records and invoices are kept. Are you sure?"
        }
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        cancelLabel="Cancel"
        variant="destructive"
        onCancel={() => (deleting ? undefined : setConfirmDelete(false))}
        onConfirm={() => void onDelete()}
      />
    </View>
  );
}
