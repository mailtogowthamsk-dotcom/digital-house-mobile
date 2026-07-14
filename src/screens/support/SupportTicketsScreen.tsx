import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform
} from "react-native";
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import {
  getMySupportTicket,
  listMySupportTickets,
  replySupportTicket,
  type SupportTicket
} from "../../api/support.api";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import type { RootStackParamList } from "../../navigation/types";

const STATUS_COLOR: Record<string, string> = {
  OPEN: "#2563EB",
  UNDER_REVIEW: "#7C3AED",
  IN_PROGRESS: "#D97706",
  PLANNED: "#0891B2",
  ACCEPTED: "#059669",
  REJECTED: "#DC2626",
  RESOLVED: "#059669",
  RELEASED: "#059669",
  CLOSED: "#6B7280"
};

export function SupportMyTicketsScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      listMySupportTickets()
        .then((data) => {
          if (!cancelled) setTickets(data);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      data={tickets}
      keyExtractor={(t) => String(t.id)}
      ListEmptyComponent={
        <Text style={{ color: colors.textSecondary, textAlign: "center", marginTop: 40 }}>
          No requests yet. Report a bug or ask a question from Help & Support.
        </Text>
      }
      renderItem={({ item }) => (
        <Pressable
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => navigation.navigate("SupportTicketDetail", { ticketId: item.id })}
        >
          <View style={styles.cardTop}>
            <Text style={[styles.ref, { color: colors.primary }]}>{item.ref}</Text>
            <Text style={[styles.badge, { color: STATUS_COLOR[item.status] ?? colors.text }]}>
              {item.status.replace(/_/g, " ")}
            </Text>
          </View>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            {item.type} · {new Date(item.updatedAt).toLocaleString()}
          </Text>
        </Pressable>
      )}
    />
  );
}

export function SupportTicketDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "SupportTicketDetail">>();
  const { colors } = useTheme();
  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await getMySupportTicket(route.params.ticketId);
    setTicket(data);
  }, [route.params.ticketId]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      load()
        .catch((e: unknown) => {
          if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load ticket");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [load])
  );

  const onReply = async () => {
    if (!reply.trim() || !ticket) return;
    setSending(true);
    setError(null);
    try {
      const updated = await replySupportTicket(ticket.id, reply.trim());
      setTicket(updated);
      setReply("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to send reply");
    } finally {
      setSending(false);
    }
  };

  if (loading || !ticket) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
        {error ? <Text style={{ color: colors.error, marginTop: 12 }}>{error}</Text> : null}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.refBig, { color: colors.primary }]}>Ticket {ticket.ref}</Text>
        <Text style={[styles.titleBig, { color: colors.text }]}>{ticket.title}</Text>
        <Text style={[styles.badge, { color: STATUS_COLOR[ticket.status] ?? colors.text, marginBottom: 12 }]}>
          {ticket.status.replace(/_/g, " ")}
        </Text>
        <Text style={[styles.body, { color: colors.textSecondary }]}>{ticket.description}</Text>

        <Text style={[styles.threadLabel, { color: colors.text }]}>Conversation</Text>
        {(ticket.messages ?? []).map((m) => (
          <View
            key={m.id}
            style={[
              styles.bubble,
              {
                backgroundColor:
                  m.authorType === "ADMIN" ? colors.surfaceElevated : colors.surface,
                borderColor: colors.border,
                alignSelf: m.authorType === "ADMIN" ? "flex-start" : "flex-end"
              }
            ]}
          >
            <Text style={[styles.bubbleMeta, { color: colors.textMuted }]}>
              {m.authorType === "ADMIN" ? "Support" : "You"} ·{" "}
              {new Date(m.createdAt).toLocaleString()}
            </Text>
            <Text style={{ color: colors.text, lineHeight: 20 }}>{m.body}</Text>
          </View>
        ))}

        {ticket.status !== "CLOSED" ? (
          <>
            <TextInput
              value={reply}
              onChangeText={setReply}
              placeholder="Write a reply…"
              placeholderTextColor={colors.textMuted}
              multiline
              style={[
                styles.replyInput,
                { color: colors.text, borderColor: colors.border, backgroundColor: colors.surface }
              ]}
            />
            {error ? <Text style={{ color: colors.error, marginBottom: 8 }}>{error}</Text> : null}
            <PrimaryButton
              title={sending ? "Sending…" : "Send reply"}
              onPress={() => void onReply()}
              disabled={sending || !reply.trim()}
            />
          </>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 10
  },
  cardTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  ref: { fontWeight: "800", fontSize: 13 },
  badge: { fontWeight: "800", fontSize: 12, textTransform: "capitalize" },
  title: { fontSize: 16, fontWeight: "700" },
  meta: { fontSize: 12, marginTop: 6 },
  refBig: { fontWeight: "800", fontSize: 14, marginBottom: 4 },
  titleBig: { fontSize: 20, fontWeight: "800", marginBottom: 6 },
  body: { fontSize: 15, lineHeight: 22, marginBottom: spacing.lg },
  threadLabel: { fontSize: 16, fontWeight: "800", marginBottom: 10 },
  bubble: {
    maxWidth: "92%",
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8
  },
  bubbleMeta: { fontSize: 11, marginBottom: 4 },
  replyInput: {
    borderWidth: 1,
    borderRadius: radius.lg,
    minHeight: 90,
    padding: 12,
    marginTop: spacing.md,
    marginBottom: 10,
    textAlignVertical: "top"
  }
});
