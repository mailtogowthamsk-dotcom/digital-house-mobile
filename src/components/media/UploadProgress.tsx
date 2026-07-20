import React, { memo, useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { typography } from "../../theme/typography";
import { spacing, radius } from "../../theme/spacing";

type UploadProgressProps = {
  progress: number;
  label?: string;
  failed?: boolean;
  onRetryLabel?: string;
};

function UploadProgressInner({
  progress,
  label = "Uploading...",
  failed
}: UploadProgressProps) {
  const { colors } = useTheme();
  const pct = Math.max(0, Math.min(100, Math.round(progress * 100)));
  const s = useMemo(
    () =>
      StyleSheet.create({
        wrap: { marginTop: spacing.sm },
        label: {
          ...typography.caption,
          color: failed ? colors.error : colors.textSecondary,
          marginBottom: 6
        },
        track: {
          height: 8,
          borderRadius: radius.full,
          backgroundColor: colors.surfaceElevated,
          overflow: "hidden"
        },
        fill: {
          height: "100%",
          borderRadius: radius.full,
          backgroundColor: failed ? colors.error : colors.primary
        },
        pct: {
          ...typography.caption,
          color: colors.textMuted,
          marginTop: 4,
          alignSelf: "flex-end"
        }
      }),
    [colors, failed]
  );

  return (
    <View style={s.wrap}>
      <Text style={s.label}>{failed ? "Upload failed" : label}</Text>
      <View style={s.track}>
        <View style={[s.fill, { width: `${failed ? 100 : pct}%` }]} />
      </View>
      <Text style={s.pct}>{failed ? "Tap Retry to try again" : `${pct}%`}</Text>
    </View>
  );
}

export const UploadProgress = memo(UploadProgressInner);
