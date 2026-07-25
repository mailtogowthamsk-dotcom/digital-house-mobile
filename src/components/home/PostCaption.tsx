/**
 * Title + caption under the action bar.
 * Title: bold, hide when empty. Caption: See more + hashtags.
 */

import React, { memo, useMemo, useState, useCallback } from "react";
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
  maxLines = 3,
  variant = "full"
}: Props) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const [needsMore, setNeedsMore] = useState(false);

  const titleText = title?.trim() ?? "";
  const descText = description?.trim() ?? "";
  const same = Boolean(titleText && descText && titleText === descText);

  const showTitle =
    (variant === "title" || variant === "full") && Boolean(titleText);
  const showCaption =
    variant === "caption"
      ? Boolean(descText && !same) || Boolean(!titleText && descText)
      : variant === "full"
        ? Boolean(descText && !same)
        : false;

  /** When caption-only and title===desc, title variant already showed it — skip. */
  const captionText =
    variant === "caption"
      ? same
        ? ""
        : descText || (!titleText ? "" : "")
      : showCaption
        ? descText
        : "";

  const measureText = variant === "caption" ? captionText : captionText;

  const onMeasureLayout = useCallback(
    (e: { nativeEvent: { lines: Array<unknown> } }) => {
      if (e.nativeEvent.lines.length > maxLines) setNeedsMore(true);
    },
    [maxLines]
  );

  if (variant === "title" && !showTitle) return null;
  if (variant === "caption" && !captionText) return null;
  if (variant === "full" && !titleText && !captionText) return null;

  return (
    <View
      style={[
        styles.wrap,
        variant === "title" && styles.titleWrap,
        variant === "caption" && styles.captionWrap
      ]}
    >
      {variant !== "title" && captionText && !expanded ? (
        <Text
          style={[typography.feedCaption, styles.measure, { color: colors.text }]}
          onTextLayout={onMeasureLayout}
        >
          {measureText}
        </Text>
      ) : null}

      {showTitle ? (
        <Text
          style={[styles.title, { color: colors.text }]}
          numberOfLines={variant === "title" ? 3 : expanded ? undefined : 2}
        >
          {renderTokens(titleText, colors, styles.title)}
        </Text>
      ) : null}

      {captionText ? (
        <Text
          style={[typography.feedCaption, { color: colors.textSecondary }]}
          numberOfLines={expanded ? undefined : maxLines}
        >
          {renderTokens(
            captionText,
            { ...colors, text: colors.textSecondary },
            typography.feedCaption
          )}
        </Text>
      ) : null}

      {needsMore && !expanded && variant !== "title" && captionText ? (
        <Pressable onPress={() => setExpanded(true)} hitSlop={8} style={styles.moreBtn}>
          <Text style={[typography.feedCount, { color: colors.primary }]}>See more</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export const PostCaption = memo(PostCaptionInner);

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    gap: 2
  },
  titleWrap: {
    paddingTop: 4,
    paddingBottom: 2
  },
  captionWrap: {
    paddingTop: 2,
    paddingBottom: 2
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24,
    letterSpacing: -0.3
  },
  measure: {
    position: "absolute",
    opacity: 0,
    left: 20,
    right: 20,
    zIndex: -1
  },
  moreBtn: {
    alignSelf: "flex-start",
    marginTop: 2,
    paddingVertical: 2
  }
});
