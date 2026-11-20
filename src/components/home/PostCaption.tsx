/**
 * Title + caption under the action bar.
 * Title: bold, hide when empty. Caption: See more + hashtags.
 */

import React, { memo, useCallback, useState } from "react";
import { Text, Pressable, StyleSheet, View } from "react-native";
import { useTheme } from "../../theme/ThemeContext";
import { typography } from "../../theme/typography";

const TOKEN_RE = /([#@][\w.]+)/g;

type Props = {
  title?: string;
  description?: string;
  maxLines?: number;
  /** title | caption | full (both) */
  variant?: "title" | "caption" | "full";
  compact?: boolean;
  feedReading?: boolean;
};

function renderTokens(
  text: string,
  colors: { primary: string; text: string },
  baseStyle?: object
) {
  return text.split(TOKEN_RE).map((part, i) => {
    const isTag = part.startsWith("#") || part.startsWith("@");
    return (
      <Text
        key={`${i}-${part.slice(0, 12)}`}
        style={[
          baseStyle,
          isTag ? { color: colors.primary, fontWeight: "600" } : { color: colors.text }
        ]}
      >
        {part}
      </Text>
    );
  });
}

function PostCaptionInner({
  title,
  description,
  maxLines = 2,
  variant = "full",
  compact = false,
  feedReading = false
}: Props) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [needsMore, setNeedsMore] = useState(false);

  const titleText = title?.trim() ?? "";
  const descText = description?.trim() ?? "";
  const same = Boolean(titleText && descText && titleText === descText);

  const showTitle = (variant === "title" || variant === "full") && Boolean(titleText);
  const captionText =
    variant === "title"
      ? ""
      : same
        ? ""
        : descText && (variant === "caption" || variant === "full")
          ? descText
          : !titleText
            ? descText
            : "";

  const onMeasureLayout = useCallback(
    (e: { nativeEvent: { lines: Array<unknown> } }) => {
      setNeedsMore(e.nativeEvent.lines.length > maxLines);
    },
    [maxLines]
  );

  if (!showTitle && !captionText) return null;

  const titleStyle = feedReading ? styles.feedTitle : compact ? styles.titleCompact : styles.title;
  const captionStyle = feedReading ? styles.feedCaption : styles.caption;
  const captionColor = feedReading ? colors.text : colors.textSecondary;

  return (
    <View
      style={[
        styles.wrap,
        compact ? styles.wrapCompact : styles.wrapDefault,
        feedReading && !compact && styles.feedWrap,
        feedReading && compact && styles.feedMediaWrap
      ]}
    >
      {captionText && !expanded ? (
        <Text
          accessible={false}
          importantForAccessibility="no"
          style={[typography.feedCaption, captionStyle, styles.measure, compact ? styles.measureCompact : styles.measureDefault]}
          onTextLayout={onMeasureLayout}
        >
          {captionText}
        </Text>
      ) : null}

      {showTitle ? (
        <Text style={[titleStyle, { color: colors.text }]} numberOfLines={2}>
          {renderTokens(titleText, colors, titleStyle)}
        </Text>
      ) : null}

      {captionText ? (
        <Text
          style={[typography.feedCaption, captionStyle, { color: captionColor }]}
          numberOfLines={expanded ? undefined : maxLines}
        >
          {renderTokens(captionText, { ...colors, text: captionColor }, captionStyle)}
        </Text>
      ) : null}

      {needsMore && !expanded && captionText ? (
        <Pressable onPress={() => setExpanded(true)} hitSlop={6} style={styles.moreBtn} accessibilityRole="button">
          <Text style={[typography.feedCount, styles.more, { color: colors.primary }]}>{feedReading ? "More" : "See more"}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export const PostCaption = memo(PostCaptionInner);

const styles = StyleSheet.create({
  wrap: {
    gap: 3
  },
  wrapDefault: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 4
  },
  wrapCompact: {
    paddingHorizontal: 14,
    paddingTop: 2,
    paddingBottom: 2
  },
  feedWrap: { paddingTop: 7, paddingBottom: 4 },
  feedMediaWrap: { paddingTop: 4, paddingBottom: 0, gap: 1 },
  feedTitle: { fontSize: 13, fontWeight: "700", lineHeight: 19 },
  feedCaption: { fontSize: 12, lineHeight: 18 },
  title: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 20,
    letterSpacing: -0.25
  },
  titleCompact: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 19,
    letterSpacing: -0.2
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: -0.05
  },
  measure: {
    position: "absolute",
    opacity: 0,
    zIndex: -1
  },
  measureDefault: { left: 16, right: 16 },
  measureCompact: { left: 14, right: 14 },
  moreBtn: {
    alignSelf: "flex-start",
    marginTop: 0,
    paddingVertical: 0
  },
  more: {
    fontSize: 12,
    lineHeight: 15,
    fontWeight: "600"
  }
});
