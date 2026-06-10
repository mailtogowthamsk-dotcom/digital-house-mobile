import React, { useCallback, useEffect, useMemo, useState, useRef, memo } from "react";
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
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Dimensions
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import {
  getComments,
  addComment,
  updateComment,
  deleteComment,
  type CommentItem
} from "../../api/posts.api";
import { timeAgo } from "../../utils/timeAgo";
import { hapticComment } from "../../utils/feedHaptics";
import { trackFeedAction } from "../../utils/feedAnalytics";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";

type Props = {
  visible: boolean;
  postId: number;
  postTitle: string;
  onClose: () => void;
  onCommentCountChange?: (count: number) => void;
};

function MentionText({
  body,
  color,
  textColor
}: {
  body: string;
  color: string;
  textColor: string;
}) {
  const parts = body.split(/(@\w[\w\s]*\w|@\w+)/g);
  return (
    <Text style={{ fontSize: 15, lineHeight: 22, color: textColor }}>
      {parts.map((part, i) =>
        part.startsWith("@") ? (
          <Text key={`m-${i}-a`} style={{ color, fontWeight: "600" }}>
            {part}
          </Text>
        ) : (
          <Text key={`m-${i}-t`}>{part}</Text>
        )
      )}
    </Text>
  );
}

const CommentRow = memo(function CommentRow({
  item,
  onReply,
  onEdit,
  onDelete,
  depth = 0
}: {
  item: CommentItem;
  onReply: (c: CommentItem) => void;
  onEdit: (c: CommentItem) => void;
  onDelete: (c: CommentItem) => void;
  depth?: number;
}) {
  const { colors, mode } = useTheme();
  const s = useMemo(
    () =>
      StyleSheet.create({
        row: {
          paddingVertical: spacing.md,
          marginLeft: depth > 0 ? spacing.lg : 0,
          paddingLeft: depth > 0 ? spacing.md : 0,
          borderLeftWidth: depth > 0 ? 2 : 0,
          borderLeftColor: depth > 0 ? colors.border : "transparent"
        },
        metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
        avatar: {
          width: 28,
          height: 28,
          borderRadius: 14,
          backgroundColor: colors.primary + (mode === "dark" ? "33" : "18"),
          alignItems: "center",
          justifyContent: "center"
        },
        avatarText: { fontSize: 12, fontWeight: "700", color: colors.primary },
        meta: { fontSize: 13, color: colors.textSecondary, flex: 1 },
        bodyWrap: { paddingLeft: 34 },
        actions: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: spacing.sm, paddingLeft: 34 },
        actionBtn: {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          paddingHorizontal: spacing.sm,
          paddingVertical: 6,
          borderRadius: radius.sm
        },
        actionLabel: { fontSize: 13, fontWeight: "600", color: colors.textSecondary }
      }),
    [colors, mode, depth]
  );

  const initial = (item.author.name?.trim()?.[0] ?? "?").toUpperCase();

  return (
    <View style={s.row}>
      <View style={s.metaRow}>
        <View style={s.avatar}>
          <Text style={s.avatarText}>{initial}</Text>
        </View>
        <Text style={s.meta} numberOfLines={1}>
          <Text style={{ fontWeight: "600", color: colors.text }}>{item.author.name}</Text>
          {" · "}
          {timeAgo(item.created_at)}
          {item.updated_at !== item.created_at ? " · edited" : ""}
        </Text>
      </View>
      <View style={s.bodyWrap}>
        <MentionText body={item.body} color={colors.primary} textColor={colors.text} />
      </View>
      <View style={s.actions}>
        {depth === 0 && (
          <Pressable
            style={({ pressed }) => [s.actionBtn, pressed && { opacity: 0.6 }]}
            onPress={() => onReply(item)}
            hitSlop={6}
          >
            <Ionicons name="arrow-undo-outline" size={16} color={colors.textSecondary} />
            <Text style={s.actionLabel}>Reply</Text>
          </Pressable>
        )}
        {item.is_mine && (
          <>
            <Pressable
              style={({ pressed }) => [s.actionBtn, pressed && { opacity: 0.6 }]}
              onPress={() => onEdit(item)}
              hitSlop={6}
            >
              <Ionicons name="create-outline" size={16} color={colors.primary} />
              <Text style={[s.actionLabel, { color: colors.primary }]}>Edit</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [s.actionBtn, pressed && { opacity: 0.6 }]}
              onPress={() => onDelete(item)}
              hitSlop={6}
            >
              <Ionicons name="trash-outline" size={16} color={colors.error} />
              <Text style={[s.actionLabel, { color: colors.error }]}>Delete</Text>
            </Pressable>
          </>
        )}
      </View>
      {item.replies?.map((r) => (
        <CommentRow
          key={r.id}
          item={r}
          onReply={onReply}
          onEdit={onEdit}
          onDelete={onDelete}
          depth={1}
        />
      ))}
    </View>
  );
});

export function CommentSheet({ visible, postId, postTitle, onClose, onCommentCountChange }: Props) {
  const insets = useSafeAreaInsets();
  const { colors, mode } = useTheme();
  const inputRef = useRef<TextInput>(null);
  const onCountChangeRef = useRef(onCommentCountChange);
  onCountChangeRef.current = onCommentCountChange;

  const [comments, setComments] = useState<CommentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [initialLoading, setInitialLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [sort, setSort] = useState<"newest" | "top">("newest");
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<CommentItem | null>(null);
  const [editing, setEditing] = useState<CommentItem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const loadGenRef = useRef(0);
  const showInitialSpinnerRef = useRef(true);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const onShow = Keyboard.addListener(showEvent, (e) => {
      const height = e.endCoordinates?.height ?? 0;
      setKeyboardHeight(height);
    });
    const onHide = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      onShow.remove();
      onHide.remove();
    };
  }, []);

  const fetchComments = useCallback(
    async (sortMode: "newest" | "top", options?: { silent?: boolean }) => {
      const gen = ++loadGenRef.current;
      if (!options?.silent) {
        if (showInitialSpinnerRef.current) setInitialLoading(true);
        setRefreshing(true);
      }
      try {
        const res = await getComments(postId, 1, 50, sortMode);
        if (gen !== loadGenRef.current) return;
        setComments(res.items);
        setTotal(res.total);
        showInitialSpinnerRef.current = false;
      } catch {
        if (gen === loadGenRef.current) setComments([]);
      } finally {
        if (gen === loadGenRef.current) {
          setInitialLoading(false);
          setRefreshing(false);
        }
      }
    },
    [postId]
  );

  useEffect(() => {
    if (!visible) {
      loadGenRef.current += 1;
      showInitialSpinnerRef.current = true;
      setComments([]);
      setTotal(0);
      setReplyTo(null);
      setEditing(null);
      setText("");
      setKeyboardHeight(0);
      setInitialLoading(false);
      setRefreshing(false);
      return;
    }

    trackFeedAction("comment_sheet_open", postId);
    void fetchComments(sort);
  }, [visible, postId, sort, fetchComments]);

  useEffect(() => {
    if (!visible || initialLoading) return;
    onCountChangeRef.current?.(total);
  }, [visible, total, initialLoading]);

  const submit = useCallback(async () => {
    const body = text.trim();
    if (!body || submitting) return;
    setSubmitting(true);
    void hapticComment();
    try {
      if (editing) {
        await updateComment(postId, editing.id, body);
        setEditing(null);
      } else {
        const created = await addComment(postId, body, replyTo?.id ?? null);
        setReplyTo(null);
        trackFeedAction("comment", postId, { parentId: replyTo?.id ?? null });
        setComments((prev) => {
          if (created.parent_id) {
            return prev.map((c) =>
              c.id === created.parent_id
                ? { ...c, replies: [...(c.replies ?? []), created], reply_count: (c.reply_count ?? 0) + 1 }
                : c
            );
          }
          return [created, ...prev];
        });
        setTotal((t) => t + 1);
      }
      setText("");
      Keyboard.dismiss();
      if (editing) {
        await fetchComments(sort, { silent: true });
      }
    } catch {
      Alert.alert("Could not save", "Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [text, submitting, postId, replyTo, editing, sort, fetchComments]);

  const handleEdit = useCallback((c: CommentItem) => {
    setEditing(c);
    setReplyTo(null);
    setText(c.body);
    inputRef.current?.focus();
  }, []);

  const handleReply = useCallback((c: CommentItem) => {
    setReplyTo(c);
    setEditing(null);
    inputRef.current?.focus();
  }, []);

  const handleDelete = useCallback(
    (c: CommentItem) => {
      Alert.alert("Delete comment?", "This cannot be undone.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteComment(postId, c.id);
              await fetchComments(sort, { silent: true });
            } catch {
              Alert.alert("Delete failed");
            }
          }
        }
      ]);
    },
    [postId, sort, fetchComments]
  );

  const renderItem = useCallback(
    ({ item }: { item: CommentItem }) => (
      <CommentRow item={item} onReply={handleReply} onEdit={handleEdit} onDelete={handleDelete} />
    ),
    [handleReply, handleEdit, handleDelete]
  );

  const windowHeight = Dimensions.get("window").height;
  const keyboardOpen = keyboardHeight > 0;
  const sheetHeight = keyboardOpen
    ? Math.max(windowHeight - keyboardHeight - insets.top - 8, 260)
    : Math.min(windowHeight * 0.78, 620);

  const composerBottomPad = keyboardOpen ? spacing.sm : Math.max(insets.bottom, spacing.md);

  const s = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "flex-end"
        },
        sheet: {
          backgroundColor: colors.surface,
          borderTopLeftRadius: radius.xl,
          borderTopRightRadius: radius.xl,
          overflow: "hidden",
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: mode === "dark" ? 0.35 : 0.12,
          shadowRadius: 16,
          elevation: 24
        },
        handleWrap: { alignItems: "center", paddingTop: spacing.sm, paddingBottom: 4 },
        handle: {
          width: 40,
          height: 4,
          borderRadius: 2,
          backgroundColor: colors.border
        },
        header: {
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.md
        },
        headerText: { flex: 1, marginRight: spacing.md },
        title: { fontSize: 18, fontWeight: "700", color: colors.text },
        subtitle: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
        closeBtn: {
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: colors.surfaceElevated,
          alignItems: "center",
          justifyContent: "center"
        },
        sortRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
          paddingHorizontal: spacing.lg,
          paddingBottom: spacing.md
        },
        sortChip: {
          paddingHorizontal: spacing.md,
          paddingVertical: 7,
          borderRadius: radius.full,
          backgroundColor: colors.surfaceElevated,
          borderWidth: 1,
          borderColor: "transparent"
        },
        sortChipActive: {
          backgroundColor: mode === "dark" ? colors.primary + "33" : "#EFF6FF",
          borderColor: colors.primary + "55"
        },
        sortText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
        sortTextActive: { color: colors.primary },
        countBadge: {
          marginLeft: "auto",
          paddingHorizontal: spacing.sm,
          paddingVertical: 4,
          borderRadius: radius.full,
          backgroundColor: colors.surfaceElevated
        },
        countText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
        list: { flex: 1 },
        listContent: { paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
        separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
        listEmpty: {
          textAlign: "center",
          color: colors.textSecondary,
          paddingVertical: spacing.xxxl,
          paddingHorizontal: spacing.lg,
          lineHeight: 22
        },
        refreshOverlay: {
          ...StyleSheet.absoluteFillObject,
          alignItems: "center",
          paddingTop: spacing.sm,
          pointerEvents: "none"
        },
        composer: {
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          backgroundColor: colors.surfaceElevated,
          paddingTop: spacing.sm,
          paddingHorizontal: spacing.lg
        },
        contextBanner: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: spacing.sm,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
          borderRadius: radius.md,
          backgroundColor: mode === "dark" ? colors.background : "#EFF6FF",
          borderLeftWidth: 3,
          borderLeftColor: colors.primary
        },
        contextText: { fontSize: 13, color: colors.text, flex: 1, fontWeight: "500" },
        inputRow: { flexDirection: "row", alignItems: "flex-end", gap: spacing.sm },
        input: {
          flex: 1,
          minHeight: 44,
          maxHeight: 120,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 22,
          paddingHorizontal: spacing.lg,
          paddingTop: Platform.OS === "ios" ? 12 : 10,
          paddingBottom: Platform.OS === "ios" ? 12 : 10,
          fontSize: 15,
          color: colors.text,
          backgroundColor: colors.surface
        },
        sendBtn: {
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.surfaceElevated
        },
        sendBtnActive: { backgroundColor: colors.primary },
        sendBtnDisabled: { opacity: 0.45 }
      }),
    [colors, mode]
  );

  const listEmpty = useMemo(
    () =>
      initialLoading ? (
        <ActivityIndicator style={{ marginVertical: spacing.xxxl }} color={colors.primary} />
      ) : (
        <View style={{ alignItems: "center", paddingVertical: spacing.xxxl }}>
          <Ionicons name="chatbubble-outline" size={40} color={colors.textSecondary} style={{ opacity: 0.5 }} />
          <Text style={[s.listEmpty, { paddingTop: spacing.md, paddingBottom: 0 }]}>
            No comments yet
          </Text>
          <Text style={[s.listEmpty, { paddingTop: 4, fontSize: 13 }]}>
            Be the first to share your thoughts
          </Text>
        </View>
      ),
    [initialLoading, colors.primary, colors.textSecondary, s.listEmpty]
  );

  const canSend = !!text.trim() && !submitting;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={s.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close comments" />

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ width: "100%" }}
          keyboardVerticalOffset={0}
        >
          <View style={[s.sheet, { height: sheetHeight }]}>
            <View style={s.handleWrap}>
              <View style={s.handle} />
            </View>

            <View style={s.header}>
              <View style={s.headerText}>
                <Text style={s.title}>Comments</Text>
                <Text style={s.subtitle} numberOfLines={1}>
                  {postTitle}
                </Text>
              </View>
              <Pressable
                style={({ pressed }) => [s.closeBtn, pressed && { opacity: 0.7 }]}
                onPress={onClose}
                hitSlop={8}
                accessibilityLabel="Close"
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>

            <View style={s.sortRow}>
              {(["newest", "top"] as const).map((mode) => (
                <Pressable
                  key={mode}
                  style={[s.sortChip, sort === mode && s.sortChipActive]}
                  onPress={() => setSort(mode)}
                >
                  <Text style={[s.sortText, sort === mode && s.sortTextActive]}>
                    {mode === "newest" ? "Newest" : "Top"}
                  </Text>
                </Pressable>
              ))}
              <View style={s.countBadge}>
                <Text style={s.countText}>{total}</Text>
              </View>
            </View>

            <View style={{ flex: 1 }}>
              <FlatList
                style={s.list}
                contentContainerStyle={s.listContent}
                data={comments}
                keyExtractor={(c) => String(c.id)}
                renderItem={renderItem}
                ItemSeparatorComponent={() => <View style={s.separator} />}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                ListEmptyComponent={listEmpty}
                removeClippedSubviews={false}
              />
              {refreshing && comments.length > 0 ? (
                <View style={s.refreshOverlay}>
                  <ActivityIndicator size="small" color={colors.primary} />
                </View>
              ) : null}
            </View>

            <View style={[s.composer, { paddingBottom: composerBottomPad }]}>
              {replyTo ? (
                <View style={s.contextBanner}>
                  <Text style={s.contextText} numberOfLines={1}>
                    Replying to {replyTo.author.name}
                  </Text>
                  <Pressable onPress={() => setReplyTo(null)} hitSlop={8}>
                    <Ionicons name="close" size={18} color={colors.textSecondary} />
                  </Pressable>
                </View>
              ) : null}
              {editing ? (
                <View style={s.contextBanner}>
                  <Text style={s.contextText}>Editing your comment</Text>
                  <Pressable
                    onPress={() => {
                      setEditing(null);
                      setText("");
                    }}
                    hitSlop={8}
                  >
                    <Ionicons name="close" size={18} color={colors.textSecondary} />
                  </Pressable>
                </View>
              ) : null}

              <View style={s.inputRow}>
                <TextInput
                  ref={inputRef}
                  style={s.input}
                  placeholder={
                    editing ? "Edit your comment…" : replyTo ? "Write a reply…" : "Add a comment…"
                  }
                  placeholderTextColor={colors.textSecondary}
                  value={text}
                  onChangeText={setText}
                  multiline
                  blurOnSubmit={false}
                />
                <Pressable
                  style={[
                    s.sendBtn,
                    canSend && s.sendBtnActive,
                    !canSend && s.sendBtnDisabled
                  ]}
                  onPress={submit}
                  disabled={!canSend}
                  hitSlop={8}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color={colors.white} />
                  ) : (
                    <Ionicons
                      name="send"
                      size={20}
                      color={canSend ? colors.white : colors.textSecondary}
                    />
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
