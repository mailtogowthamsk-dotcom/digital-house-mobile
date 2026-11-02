import React, { memo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { describeSharePreview, type ChatShareDraft } from "../../navigation/chatShare";
import { radius, spacing } from "../../theme/spacing";

type Colors = {
  surfaceElevated: string;
  border: string;
  text: string;
  textMuted: string;
  primary: string;
};

type Props = {
  draft: ChatShareDraft;
  onDismiss: () => void;
  colors: Colors;
};

function ChatShareDraftCardInner({ draft, onDismiss, colors }: Props) {
  const { preview } = draft;
  const { kicker, icon, meta } = describeSharePreview(preview);

  return (
    <View
      style={[
        styles.wrap,
        { backgroundColor: colors.surfaceElevated, borderColor: colors.border }
      ]}
    >
      <View style={[styles.icon, { backgroundColor: colors.primary }]}>
        <Ionicons name={icon} size={16} color="#fff" />
      </View>
      <View style={styles.body}>
        <Text style={[styles.kicker, { color: colors.primary }]}>{kicker}</Text>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={2}>
          {preview.title}
        </Text>
        {meta ? (
          <Text style={[styles.meta, { color: colors.textMuted }]} numberOfLines={2}>
            {meta}
          </Text>
        ) : null}
      </View>
      <Pressable
        onPress={onDismiss}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Remove shared post"
        style={({ pressed }) => [styles.close, pressed && { opacity: 0.7 }]}
      >
        <Ionicons name="close" size={18} color={colors.textMuted} />
      </Pressable>
    </View>
  );
}

export const ChatShareDraftCard = memo(ChatShareDraftCardInner);

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm
  },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1
  },
  body: { flex: 1, minWidth: 0, gap: 1 },
  kicker: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.3 },
  title: { fontSize: 14, fontWeight: "700", lineHeight: 18 },
  meta: { fontSize: 12, lineHeight: 16 },
  close: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -2
  }
});
