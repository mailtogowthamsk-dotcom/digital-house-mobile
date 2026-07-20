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
  KeyboardAvoidingView,
  Platform
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
  const [panel, setPanel] = useState<Panel>("menu");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [reposting, setReposting] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const { targets, loading, error, reload } = useShareTargets(visible && panel === "connections");

  const resetState = useCallback(() => {
    setPanel("menu");
    setQuery("");
    setSelected(new Set());
    setNote("");
    setSending(false);
    setReposting(false);
    setDownloading(false);
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  useEffect(() => {
    if (!visible) resetState();
  }, [visible, resetState]);

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
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSend = useCallback(async () => {
    if (!post || selected.size === 0) return;
    setSending(true);
    try {
      const result = await sharePostToConnections(post.postId, {
        recipientIds: [...selected],
        message: note.trim() || undefined
      });
      const failed = result.failed.length;
      appAlert(
        "Sent",
        failed > 0
          ? `Shared with ${result.sent} member${result.sent === 1 ? "" : "s"}. ${failed} could not be reached.`
          : `Shared with ${result.sent} connection${result.sent === 1 ? "" : "s"}.`
      );
      handleClose();
    } catch (e) {
      appAlert("Could not share", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setSending(false);
    }
  }, [post, selected, note, handleClose]);

  const handleRepost = useCallback(async () => {
    if (!post) return;
    setReposting(true);
    try {
      await repostPost(post.postId);
      appAlert("Reposted", "This post is now on your profile timeline.");
      onReposted?.();
      handleClose();
    } catch (e) {
      appAlert("Could not repost", e instanceof Error ? e.message : "Please try again.");
    } finally {
      setReposting(false);
    }
  }, [post, onReposted, handleClose]);

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
    try {
      const result = await downloadPostMedia({
        url: post.mediaUrl,
        mediaType,
        fileName: `post_${post.postId}`
      });
      setDownloading(false);
      if (result.ok) {
        handleClose();
        // Defer alert so Modal unmount doesn't freeze the UI thread.
        setTimeout(() => appAlert("Saved", result.message), 250);
      } else {
        appAlert("Download failed", result.message);
      }
    } catch (e) {
      setDownloading(false);
      appAlert(
        "Download failed",
        e instanceof Error ? e.message : "Could not save media."
      );
    }
  }, [post, handleClose]);

  const sheetStyle = useMemo(
    () => [
      styles.sheet,
      {
        backgroundColor: colors.surface,
        paddingBottom: Math.max(insets.bottom, spacing.md),
        maxHeight: panel === "connections" ? "88%" : "52%"
      }
    ],
    [colors.surface, insets.bottom, panel]
  );

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
              @{item.username}
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
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
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
              <Pressable onPress={() => setPanel("menu")} hitSlop={8} style={styles.backBtn}>
                <Ionicons name="chevron-back" size={22} color={colors.text} />
              </Pressable>
            ) : (
              <View style={styles.backBtn} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={[styles.title, { color: colors.text }]}>
                {panel === "menu" ? "Share Post" : "Send to Connections"}
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
                icon="people-outline"
                label="Send to Connections"
                subtitle="Share privately inside the community"
                onPress={() => setPanel("connections")}
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
                    placeholder="Search connections"
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
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>No Connections Yet</Text>
                  <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
                    Connect with members to start sharing posts.
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
                    No connections match your search.
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
      </KeyboardAvoidingView>
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
  sendBtnText: { color: "#fff", fontWeight: "800", fontSize: 16 }
});
