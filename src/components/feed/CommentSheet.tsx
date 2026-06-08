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
  Keyboard
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
    <Text style={{ fontSize: 14, lineHeight: 20, color: textColor }}>
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
  const { colors } = useTheme();
  const s = useMemo(
    () =>
      StyleSheet.create({
        row: {
          paddingVertical: 10,
          paddingLeft: depth > 0 ? 20 : 0,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border
        },
        meta: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
        actions: { flexDirection: "row", gap: 16, marginTop: 8 },
        action: { fontSize: 12, fontWeight: "600", color: colors.primary }
      }),
    [colors, depth]
  );

  return (
    <View style={s.row}>
      <Text style={s.meta}>
        {item.author.name} · {timeAgo(item.created_at)}
        {item.updated_at !== item.created_at ? " · edited" : ""}
      </Text>
      <MentionText body={item.body} color={colors.primary} textColor={colors.text} />
      <View style={s.actions}>
        {depth === 0 && (
          <Pressable onPress={() => onReply(item)} hitSlop={8}>
            <Text style={s.action}>Reply</Text>
          </Pressable>
        )}
        {item.is_mine && (
          <>
            <Pressable onPress={() => onEdit(item)} hitSlop={8}>
              <Text style={s.action}>Edit</Text>
            </Pressable>
            <Pressable onPress={() => onDelete(item)} hitSlop={8}>
              <Text style={[s.action, { color: colors.error }]}>Delete</Text>
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
  const { colors } = useTheme();
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
      setKeyboardHeight(e.endCoordinates.height);
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
        onCountChangeRef.current?.(res.total);
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
        setTotal((t) => {
          const next = t + 1;
          onCountChangeRef.current?.(next);
          return next;
        });
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

  const sheetBottomInset =
    keyboardHeight > 0 ? keyboardHeight : Math.max(insets.bottom, 8);

  const s = useMemo(
    () =>
      StyleSheet.create({
        overlay: {
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.45)",
          justifyContent: "flex-end"
        },
        sheet: {
          backgroundColor: colors.surface,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          height: "72%",
          maxHeight: 560,
          overflow: "hidden"
        },
        sheetBody: { flex: 1 },
        header: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: 16,
          paddingTop: 14,
          paddingBottom: 10,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: colors.border
        },
        title: { fontSize: 16, fontWeight: "600", color: colors.text, flex: 1, marginRight: 8 },
        sortRow: { flexDirection: "row", gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
        sortChip: {
          paddingHorizontal: 12,
          paddingVertical: 6,
          borderRadius: 16,
          backgroundColor: colors.surfaceElevated
        },
        sortChipActive: { backgroundColor: colors.primary },
        sortText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
        sortTextActive: { color: colors.white },
        list: { flex: 1 },
        listContent: { paddingHorizontal: 16, paddingBottom: 8 },
        listEmpty: { textAlign: "center", color: colors.textSecondary, padding: 24 },
        refreshOverlay: {
          ...StyleSheet.absoluteFillObject,
          alignItems: "center",
          paddingTop: 8,
          pointerEvents: "none"
        },
        composer: {
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: colors.border,
          backgroundColor: colors.surface,
          paddingTop: 8,
          paddingHorizontal: 16
        },
        replyBanner: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 8
        },
        replyText: { fontSize: 12, color: colors.textSecondary, flex: 1 },
        inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
        input: {
          flex: 1,
          minHeight: 44,
          maxHeight: 120,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 22,
          paddingHorizontal: 16,
          paddingTop: Platform.OS === "ios" ? 12 : 10,
          paddingBottom: Platform.OS === "ios" ? 12 : 10,
          fontSize: 15,
          color: colors.text,
          backgroundColor: colors.background
        },
        sendBtn: {
          width: 44,
          height: 44,
          borderRadius: 22,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.surfaceElevated,
          marginBottom: 2
        },
        sendBtnDisabled: { opacity: 0.4 }
      }),
    [colors]
  );

  const listEmpty = useMemo(
    () =>
      initialLoading ? (
        <ActivityIndicator style={{ marginVertical: 32 }} color={colors.primary} />
      ) : (
        <Text style={s.listEmpty}>No comments yet. Start the conversation!</Text>
      ),
    [initialLoading, colors.primary, s.listEmpty]
  );

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

        <View style={[s.sheet, { marginBottom: sheetBottomInset }]}>
          <View style={s.sheetBody}>
            <View style={s.header}>
              <Text style={s.title} numberOfLines={1}>
                Comments · {postTitle}
              </Text>
              <Pressable onPress={onClose} hitSlop={12}>
                <Ionicons name="close" size={24} color={colors.text} />
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
              <Text style={[s.sortText, { marginLeft: "auto" }]}>{total} total</Text>
            </View>

            <View style={{ flex: 1 }}>
              <FlatList
                style={s.list}
                contentContainerStyle={s.listContent}
                data={comments}
                keyExtractor={(c) => String(c.id)}
                renderItem={renderItem}
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
          </View>

          <View style={s.composer}>
            {replyTo ? (
              <View style={s.replyBanner}>
                <Text style={s.replyText} numberOfLines={1}>
                  Replying to {replyTo.author.name}
                </Text>
                <Pressable onPress={() => setReplyTo(null)} hitSlop={8}>
                  <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
                </Pressable>
              </View>
            ) : null}
            {editing ? (
              <View style={s.replyBanner}>
                <Text style={s.replyText}>Editing your comment</Text>
                <Pressable
                  onPress={() => {
                    setEditing(null);
                    setText("");
                  }}
                  hitSlop={8}
                >
                  <Ionicons name="close-circle" size={20} color={colors.textSecondary} />
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
                style={[s.sendBtn, (!text.trim() || submitting) && s.sendBtnDisabled]}
                onPress={submit}
                disabled={submitting || !text.trim()}
                hitSlop={8}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Ionicons
                    name="send"
                    size={22}
                    color={text.trim() ? colors.primary : colors.textSecondary}
                  />
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}
