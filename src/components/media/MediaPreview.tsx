import React, { memo, useMemo } from "react";
import { View, Text, StyleSheet, Pressable, Image } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { typography } from "../../theme/typography";
import { spacing, radius } from "../../theme/spacing";
import { formatDuration } from "../../config/media.config";

export type MediaPreviewProps = {
  kind: "image" | "video";
  previewUri: string;
  fileName?: string | null;
  durationSec?: number | null;
  height?: number;
  onReplace?: () => void;
  onRemove?: () => void;
  disabled?: boolean;
};

function MediaPreviewInner({
  kind,
  previewUri,
  fileName,
  durationSec,
  height = 220,
  onReplace,
  onRemove,
  disabled
}: MediaPreviewProps) {
  const { colors } = useTheme();
  const s = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          marginTop: spacing.sm,
          borderRadius: radius.md,
          overflow: "hidden",
          backgroundColor: colors.surfaceElevated,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border
        },
        media: { width: "100%", height },
        overlayPlay: {
          ...StyleSheet.absoluteFillObject,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "rgba(0,0,0,0.28)"
        },
        metaRow: {
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingHorizontal: spacing.sm,
          paddingVertical: spacing.xs,
          gap: spacing.sm
        },
        metaText: {
          ...typography.caption,
          color: colors.textSecondary,
          flex: 1
        },
        actions: { flexDirection: "row", gap: spacing.sm },
        actionBtn: {
          flexDirection: "row",
          alignItems: "center",
          gap: 4,
          paddingVertical: 4,
          paddingHorizontal: 8
        },
        actionText: { ...typography.caption, color: colors.primary, fontWeight: "600" },
        durationBadge: {
          position: "absolute",
          right: 8,
          bottom: 8,
          backgroundColor: "rgba(0,0,0,0.7)",
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 4
        },
        durationText: { color: "#fff", fontSize: 12, fontWeight: "700" }
      }),
    [colors, height]
  );

  return (
    <View style={s.wrap}>
      <View style={{ height }}>
        <Image source={{ uri: previewUri }} style={s.media} resizeMode="cover" />
        {kind === "video" ? (
          <>
            <View style={s.overlayPlay} pointerEvents="none">
              <Ionicons name="play-circle" size={56} color="rgba(255,255,255,0.95)" />
            </View>
            {durationSec != null && durationSec > 0 ? (
              <View style={s.durationBadge}>
                <Text style={s.durationText}>{formatDuration(durationSec)}</Text>
              </View>
            ) : null}
          </>
        ) : null}
      </View>
      <View style={s.metaRow}>
        <Text style={s.metaText} numberOfLines={1}>
          {fileName?.trim() || (kind === "video" ? "Video selected" : "Photo selected")}
        </Text>
        <View style={s.actions}>
          {onReplace ? (
            <Pressable style={s.actionBtn} onPress={onReplace} disabled={disabled}>
              <Ionicons name="swap-horizontal" size={16} color={colors.primary} />
              <Text style={s.actionText}>Replace</Text>
            </Pressable>
          ) : null}
          {onRemove ? (
            <Pressable style={s.actionBtn} onPress={onRemove} disabled={disabled}>
              <Ionicons name="trash-outline" size={16} color={colors.error} />
              <Text style={[s.actionText, { color: colors.error }]}>Remove</Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

export const MediaPreview = memo(MediaPreviewInner);
