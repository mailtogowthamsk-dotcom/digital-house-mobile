import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  FlatList,
  ActivityIndicator,
  Platform,
  useWindowDimensions
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { AvatarImage } from "../ui/AvatarImage";
import { getImageUrl } from "../../api/client";
import { useShareTargets, type ShareTarget } from "../../hooks/useShareTargets";
import { sharePostToConnections, repostPost } from "../../api/postShare.api";
import { downloadPostMedia } from "../../services/postMediaDownload";
import { appAlert } from "../../utils/appAlert";
import { openAppSettings } from "../../permissions";
import { useModalKeyboardPad } from "../../hooks/useModalKeyboardPad";
import { ModalKeyboardAvoiding } from "../ui/ModalKeyboardAvoiding";

export type PostSharePayload = {
  postId: number;
  title: string;
  authorName: string;
  mediaUrl?: string | null;
  mediaType?: "image" | "video" | "none" | string | null;
  thumbnailUrl?: string | null;
};

type Panel = "menu" | "connections";

type Props = {
  visible: boolean;
  post: PostSharePayload | null;
  onClose: () => void;
  onReposted?: () => void;
  onNavigateFindMembers?: () => void;
};

function ActionRow({
  icon,
  label,
  subtitle,
  onPress,
  disabled
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  subtitle?: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors, mode } = useTheme();
  return (
    <Pressable
      style={({ pressed }) => [
        styles.actionRow,
        {
          backgroundColor: pressed ? (mode === "dark" ? "#1E293B" : "#F8FAFC") : "transparent",
          opacity: disabled ? 0.45 : 1
        }
      ]}
      onPress={onPress}
      disabled={disabled}
    >
      <View style={[styles.actionIcon, { backgroundColor: mode === "dark" ? "#1E293B" : "#EEF2FF" }]}>
        <Ionicons name={icon} size={22} color={colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.actionLabel, { color: colors.text }]}>{label}</Text>
        {subtitle ? (
          <Text style={[styles.actionSub, { color: colors.textSecondary }]}>{subtitle}</Text>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

function PostActionsBottomSheetInner({
  visible,
  post,
  onClose,
  onReposted,
  onNavigateFindMembers
}: Props) {
  const { colors, mode } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();
  const { keyboardOpen, keyboardHeight } = useModalKeyboardPad();
  const [panel, setPanel] = useState<Panel>("menu");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [reposting, setReposting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { targets, loading, error, reload } = useShareTargets(visible && panel === "connections");

  const resetState = useCallback(() => {
    setPanel("menu");
    setQuery("");
    setSelected(new Set());
    setNote("");
    setSending(false);
    setReposting(false);
    setDownloading(false);
    setActionError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  /**
   * appAlert renders its own Modal from the provider at the app root. iOS cannot
   * present it above this sheet's Modal, so it lands behind as an invisible
   * full-screen touch blocker and the app appears frozen. Always dismiss the
   * sheet first and let it finish animating out.
   */
  const closeThenAlert = useCallback(
    (...args: Parameters<typeof appAlert>) => {
      handleClose();
      setTimeout(() => appAlert(...args), 250);
    },
    [handleClose]
  );

  useEffect(() => {
    if (!visible) resetState();
  }, [visible, resetState]);

  // Drop anyone who left the list (access revoked mid-session) so Send can never
  // be retried against a recipient the server will reject.
  useEffect(() => {
    if (targets.length === 0) return;
    setSelected((prev) => {
      if (prev.size === 0) return prev;
      const valid = new Set<number>();
      for (const t of targets) if (prev.has(t.id)) valid.add(t.id);
      return valid.size === prev.size ? prev : valid;
    });
  }, [targets]);

  const filteredTargets = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return targets;
    return targets.filter(
      (t) =>
        t.fullName.toLowerCase().includes(q) ||
        t.username.toLowerCase().includes(q)
    );
  }, [targets, query]);

  const toggleSelect = useCallback((id: number) => {
    setActionError(null);
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const showPanel = useCallback((next: Panel) => {
    setActionError(null);
    setPanel(next);
  }, []);

  const errorBanner = actionError ? (
    <View
      style={[
        styles.errorBanner,
        { backgroundColor: mode === "dark" ? "#3F1D1D" : "#FEF2F2" }
      ]}
    >
      <Ionicons name="alert-circle-outline" size={18} color={colors.error} />
      <Text style={[styles.errorText, { color: colors.error }]}>{actionError}</Text>
    </View>
  ) : null;

  const handleSend = useCallback(async () => {
    if (!post || selected.size === 0) return;
    setSending(true);
    setActionError(null);
    try {
      const result = await sharePostToConnections(post.postId, {
        recipientIds: [...selected],
        message: note.trim() || undefined
      });
      const failed = result.failed.length;
      closeThenAlert(
        "Sent",
        failed > 0
          ? `Shared with ${result.sent} member${result.sent === 1 ? "" : "s"}. ${failed} could not be reached.`
          : `Shared with ${result.sent} person${result.sent === 1 ? "" : "s"}.`
      );
    } catch (e) {
      // Reported inline: the recipient is usually no longer someone you can
      // message, and keeping the sheet open lets them change the selection.
      setActionError(
        e instanceof Error
          ? e.message
          : "Could not share this post. Please try again."
      );
      void reload();
    } finally {
      setSending(false);
    }
  }, [post, selected, note, closeThenAlert, reload]);

  const handleRepost = useCallback(async () => {
    if (!post) return;
    setReposting(true);
    setActionError(null);
    try {
      await repostPost(post.postId);
      onReposted?.();
      closeThenAlert("Reposted", "This post is now on your profile timeline.");
    } catch (e) {
      setActionError(
        e instanceof Error ? e.message : "Could not repost. Please try again."
      );
    } finally {
      setReposting(false);
    }
  }, [post, onReposted, closeThenAlert]);

  const handleDownload = useCallback(async () => {
    if (!post?.mediaUrl) {
      appAlert("No media", "This post does not include downloadable media.");
      return;
    }
    const mediaType =
      post.mediaType === "video" || /\.(mp4|mov)(\?|$)/i.test(post.mediaUrl)
        ? "video"
        : "image";
    setDownloading(true);
    setActionError(null);
    try {
      const result = await downloadPostMedia({
        url: post.mediaUrl,
        mediaType,
        fileName: `post_${post.postId}`
      });
      setDownloading(false);
      if (result.ok) {
        closeThenAlert("Saved", result.message);
      } else if (result.permissionDenied) {
        // Needs buttons, so it has to be a dialog — dismiss the sheet first.
        closeThenAlert("Gallery access needed", result.message, [
          { text: "Cancel", style: "cancel" },
          {
            text: "Open Settings",
            onPress: () => {
              void openAppSettings();
            }
          }
        ]);
      } else {
        setActionError(result.message);
      }
    } catch (e) {
      setDownloading(false);
      setActionError(
        e instanceof Error ? e.message : "Could not save media."
      );
    }
  }, [post, closeThenAlert]);

  const sheetStyle = useMemo(() => {
    const closedMax = panel === "connections" ? windowHeight * 0.88 : windowHeight * 0.52;
    const openMax = Math.max(280, windowHeight - keyboardHeight - insets.top - 8);
    const maxHeight = keyboardOpen ? openMax : closedMax;
    return [
      styles.sheet,
      {
        backgroundColor: colors.surface,
        paddingBottom: keyboardOpen ? spacing.sm : Math.max(insets.bottom, spacing.md),
        maxHeight,
        ...(panel === "connections" && !keyboardOpen
          ? { minHeight: Math.min(closedMax, 420) }
          : null)
      }
    ];
  }, [colors.surface, insets.bottom, insets.top, panel, keyboardOpen, keyboardHeight, windowHeight]);

  const renderConnection = useCallback(
    ({ item }: { item: ShareTarget }) => {
      const isSelected = selected.has(item.id);
      return (
        <Pressable
          style={({ pressed }) => [
            styles.connectionRow,
            {
              backgroundColor: pressed
                ? mode === "dark"
                  ? "#1E293B"
                  : "#F8FAFC"
                : "transparent"
            }
          ]}
          onPress={() => toggleSelect(item.id)}
        >
          <AvatarImage
            uri={getImageUrl(item.profileImage)}
            name={item.fullName}
            size={44}
            placeholderColor={colors.surfaceElevated}
            textColor={colors.textMuted}
          />
          <View style={{ flex: 1, marginLeft: spacing.md }}>
            <Text style={{ color: colors.text, fontWeight: "700", fontSize: 15 }} numberOfLines={1}>
              {item.fullName}
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 13 }} numberOfLines={1}>
              {item.kind === "matrimony"
                ? "Matrimony match"
                : item.kind === "connection"
                  ? item.username
                    ? `@${item.username}`
                    : "Connection"
                  : item.username
                    ? `@${item.username}`
                    : "Chat"}
            </Text>
          </View>
          <Ionicons
            name={isSelected ? "checkmark-circle" : "ellipse-outline"}
            size={24}
            color={isSelected ? colors.primary : colors.textMuted}
          />
        </Pressable>
      );
    },
    [colors, mode, selected, toggleSelect]
  );

  if (!post) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <ModalKeyboardAvoiding style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} accessibilityLabel="Dismiss" />
        <View style={sheetStyle}>
          <View style={styles.handleWrap}>
            <View
              style={[
                styles.handle,
                { backgroundColor: mode === "dark" ? "#334155" : "#CBD5E1" }
              ]}
            />
          </View>

          <View style={[styles.header, { borderBottomColor: colors.border }]}>
            {panel === "connections" ? (
              <Pressable onPress={() => showPanel("menu")} hitSlop={8} style={styles.backBtn}>
                <Ionicons name="chevron-back" size={22} color={colors.text} />
              </Pressable>
            ) : (
              <View style={styles.backBtn} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.text }]}>
                {panel === "menu" ? "Share Post" : "Send to Chat"}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 13 }} numberOfLines={1}>
                {post.title}
              </Text>
            </View>
            <Pressable
              style={[styles.closeBtn, { backgroundColor: mode === "dark" ? "#1E293B" : "#F1F5F9" }]}
              onPress={handleClose}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </Pressable>
          </View>

          {panel === "menu" ? (
            <View style={styles.menuBody}>
              <ActionRow
                icon="chatbubbles-outline"
                label="Send to Chat"
                subtitle="Share with anyone you can message"
                onPress={() => showPanel("connections")}
              />
              <ActionRow
                icon="repeat-outline"
                label="Repost"
                subtitle="Share on your profile with attribution"
                onPress={() => void handleRepost()}
                disabled={reposting}
              />
              <ActionRow
                icon="download-outline"
                label="Download"
                subtitle={
                  post.mediaUrl ? "Save image or video to gallery" : "No media on this post"
                }
                onPress={() => void handleDownload()}
                disabled={!post.mediaUrl || downloading}
              />
              {reposting || downloading ? (
                <ActivityIndicator style={{ marginTop: spacing.md }} color={colors.primary} />
              ) : null}
              {errorBanner}
            </View>
          ) : (
            <>
              <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
                <View
                  style={[
                    styles.searchWrap,
                    { backgroundColor: mode === "dark" ? "#1E293B" : "#F1F5F9" }
                  ]}
                >
                  <Ionicons name="search" size={18} color={colors.textMuted} />
                  <TextInput
                    value={query}
                    onChangeText={setQuery}
                    placeholder="Search chats"
                    placeholderTextColor={colors.textMuted}
                    style={[styles.searchInput, { color: colors.text }]}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
                <TextInput
                  value={note}
                  onChangeText={setNote}
                  placeholder="Add a message (optional)"
                  placeholderTextColor={colors.textMuted}
                  style={[
                    styles.noteInput,
                    {
                      color: colors.text,
                      borderColor: colors.border,
                      backgroundColor: colors.surface
                    }
                  ]}
                  multiline
                  maxLength={500}
                />
              </View>

              {loading ? (
                <View style={styles.centered}>
                  <ActivityIndicator color={colors.primary} />
                </View>
              ) : error ? (
                <View style={styles.centered}>
                  <Text style={{ color: colors.error, textAlign: "center" }}>{error}</Text>
                  <Pressable onPress={() => void reload()} style={{ marginTop: spacing.md }}>
                    <Text style={{ color: colors.primary, fontWeight: "700" }}>Retry</Text>
                  </Pressable>
                </View>
              ) : targets.length === 0 ? (
                <View style={styles.empty}>
                  <View
                    style={[
                      styles.emptyIcon,
                      { backgroundColor: mode === "dark" ? "#1E293B" : "#F1F5F9" }
                    ]}
                  >
                    <Ionicons name="people-outline" size={32} color={colors.textMuted} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>No chats yet</Text>
                  <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
                    Connect with members or match on Matrimony to share posts in chat.
                  </Text>
                  <Pressable
                    style={[styles.findBtn, { backgroundColor: colors.primary }]}
                    onPress={() => {
                      handleClose();
                      onNavigateFindMembers?.();
                    }}
                  >
                    <Text style={styles.findBtnText}>Find Members</Text>
                  </Pressable>
                </View>
              ) : filteredTargets.length === 0 ? (
                <View style={styles.centered}>
                  <Text style={{ color: colors.textSecondary, textAlign: "center" }}>
                    No people match your search.
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={filteredTargets}
                  keyExtractor={(item) => String(item.id)}
                  renderItem={renderConnection}
                  contentContainerStyle={{ paddingBottom: spacing.md }}
                  keyboardShouldPersistTaps="handled"
                />
              )}

              {errorBanner}

              {filteredTargets.length > 0 ? (
                <Pressable
                  style={[
                    styles.sendBtn,
                    {
                      backgroundColor:
                        selected.size > 0 && !sending ? colors.primary : colors.border,
                      marginHorizontal: spacing.lg,
                      marginBottom: spacing.sm
                    }
                  ]}
                  disabled={selected.size === 0 || sending}
                  onPress={() => void handleSend()}
                >
                  {sending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.sendBtnText}>
                      Send{selected.size > 0 ? ` (${selected.size})` : ""}
                    </Text>
                  )}
                </Pressable>
              ) : null}
            </>
          )}
        </View>
      </ModalKeyboardAvoiding>
    </Modal>
  );
}

export const PostActionsBottomSheet = memo(PostActionsBottomSheetInner);

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "flex-end"
  },
  sheet: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    minHeight: 280
  },
  handleWrap: { alignItems: "center", paddingTop: spacing.sm, paddingBottom: spacing.xs },
  handle: { width: 40, height: 4, borderRadius: 2 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: spacing.sm
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 18, fontWeight: "800" },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center"
  },
  menuBody: { paddingVertical: spacing.sm },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md
  },
  actionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center"
  },
  actionLabel: { fontSize: 16, fontWeight: "700" },
  actionSub: { fontSize: 13, marginTop: 2 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === "ios" ? spacing.sm : 4,
    marginBottom: spacing.sm
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: spacing.xs },
  noteInput: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    minHeight: 44,
    maxHeight: 88,
    marginBottom: spacing.sm
  },
  connectionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm
  },
  centered: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    flex: 1
  },
  empty: {
    alignItems: "center",
    padding: spacing.xl,
    gap: spacing.sm,
    flex: 1
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
  findBtn: {
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md
  },
  findBtnText: { color: "#fff", fontWeight: "800", fontSize: 15 },
  sendBtn: {
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48
  },
  sendBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  errorBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md
  },
  errorText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: "600" }
});
