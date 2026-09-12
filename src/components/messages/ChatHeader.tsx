import React, { memo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AvatarImage } from "../ui/AvatarImage";

export type ChatHeaderProps = {
  title: string;
  subtitle?: string;
  avatarUri?: string | null;
  /** Opens the peer's profile when the header avatar is pressed. */
  onAvatarPress?: () => void;
  left?: React.ReactNode;
  /** Renders on the right of the title row (e.g. chat options menu). */
  right?: React.ReactNode;
  /** Renders below status bar, above the title row (e.g. matrimony lock notice). */
  banner?: React.ReactNode;
  /** Override top inset (e.g. 0 when parent already applied safe area). */
  topInset?: number;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  textSecondary: string;
  placeholderColor: string;
  titleFontSize?: number;
};

function ChatHeaderComponent({
  title,
  subtitle,
  avatarUri,
  onAvatarPress,
  left,
  right,
  banner,
  topInset,
  backgroundColor,
  borderColor,
  textColor,
  textSecondary,
  placeholderColor,
  titleFontSize = 16
}: ChatHeaderProps) {
  const insets = useSafeAreaInsets();
  const resolvedTopInset = topInset ?? insets.top;

  const avatar =
    avatarUri !== undefined ? (
      <AvatarImage
        uri={avatarUri}
        name={title}
        size={40}
        placeholderColor={placeholderColor}
        textColor={textSecondary}
      />
    ) : null;

  return (
    <View
      style={[
        styles.shell,
        {
          backgroundColor,
          borderBottomColor: borderColor
        }
      ]}
    >
      <View style={{ paddingTop: resolvedTopInset }}>
        {banner ? <View style={styles.bannerSlot}>{banner}</View> : null}
        <View style={styles.row}>
        {left}
        {avatar ? (
          onAvatarPress ? (
            <Pressable
              onPress={onAvatarPress}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={`View ${title}'s profile`}
            >
              {avatar}
            </Pressable>
          ) : (
            avatar
          )
        ) : null}
        <View style={styles.textCol}>
          <Text style={[styles.title, { color: textColor, fontSize: titleFontSize }]} numberOfLines={1}>
            {title}
          </Text>
          {subtitle !== undefined ? (
            <Text style={[styles.subtitle, { color: textSecondary }]} numberOfLines={1}>
              {subtitle || " "}
            </Text>
          ) : null}
        </View>
        {right ? <View style={styles.rightSlot}>{right}</View> : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexShrink: 0
  },
  bannerSlot: {
    paddingHorizontal: 12,
    paddingBottom: 6
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 10,
    gap: 10
  },
  textCol: {
    flex: 1,
    minWidth: 0
  },
  title: {
    fontWeight: "800"
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12
  },
  rightSlot: {
    flexShrink: 0
  }
});

export const ChatHeader = memo(ChatHeaderComponent);
