import React, { memo, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { AvatarImage } from "../ui/AvatarImage";
import { useTheme } from "../../theme/ThemeContext";
import type { StoryGroup } from "../../api/stories.api";

type Props = {
  groups: StoryGroup[];
  loading?: boolean;
  currentUser?: {
    id: number;
    name: string;
    profileImage?: string | null;
  } | null;
  onOpenGroup: (group: StoryGroup, index: number) => void;
  onAddStory: () => void;
};

const RING = 64;
const AVATAR = 54;

function StoryTrayInner({
  groups,
  loading,
  currentUser,
  onOpenGroup,
  onAddStory
}: Props) {
  const { colors, mode } = useTheme();

  const ownGroup = groups.find((g) => g.is_own) ?? null;
  const others = groups.filter((g) => !g.is_own);

  const s = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          paddingTop: 8,
          paddingBottom: 4,
          minHeight: 98
        },
        item: { width: 76, alignItems: "center", gap: 6 },
        ring: {
          width: RING,
          height: RING,
          borderRadius: RING / 2,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 2.5
        },
        ringUnseen: { borderColor: colors.primary },
        ringSeen: {
          borderColor: mode === "dark" ? "rgba(148,163,184,0.45)" : "rgba(148,163,184,0.7)"
        },
        ringEmpty: {
          borderColor: mode === "dark" ? "rgba(148,163,184,0.35)" : "rgba(148,163,184,0.55)",
          borderStyle: "dashed" as const
        },
        addBadge: {
          position: "absolute",
          right: 0,
          bottom: 0,
          width: 20,
          height: 20,
          borderRadius: 10,
          backgroundColor: colors.primary,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 2,
          borderColor: colors.background
        },
        label: {
          fontSize: 11,
          fontWeight: "600",
          color: colors.textSecondary,
          maxWidth: 72,
          textAlign: "center"
        },
        loader: { paddingVertical: 24 }
      }),
    [colors, mode]
  );

  const renderOwn = useCallback(() => {
    const hasStories = (ownGroup?.stories.length ?? 0) > 0;
    const ringStyle = hasStories
      ? ownGroup?.has_unseen
        ? s.ringUnseen
        : s.ringSeen
      : s.ringEmpty;
    return (
      <Pressable
        style={s.item}
        onPress={() => {
          if (hasStories && ownGroup) onOpenGroup(ownGroup, 0);
          else onAddStory();
        }}
        onLongPress={onAddStory}
        accessibilityLabel="Your story"
      >
        <View style={[s.ring, ringStyle]}>
          <AvatarImage
            uri={currentUser?.profileImage ?? ownGroup?.user.profile_image}
            name={currentUser?.name ?? "You"}
            size={AVATAR}
          />
          <View style={s.addBadge}>
            <Ionicons name="add" size={14} color="#fff" />
          </View>
        </View>
        <Text style={s.label} numberOfLines={1}>
          Your Story
        </Text>
      </Pressable>
    );
  }, [ownGroup, currentUser, onAddStory, onOpenGroup, s]);

  if (loading && groups.length === 0) {
    return (
      <View style={[s.wrap, s.loader]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={s.wrap}>
      <FlatList
        horizontal
        data={others}
        keyExtractor={(g) => String(g.user.id)}
        showsHorizontalScrollIndicator={false}
        ListHeaderComponent={renderOwn}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 4 }}
        renderItem={({ item, index }) => (
          <Pressable
            style={s.item}
            onPress={() => onOpenGroup(item, index + (ownGroup ? 1 : 0))}
            accessibilityLabel={`${item.user.name}'s story`}
          >
            <View style={[s.ring, item.has_unseen ? s.ringUnseen : s.ringSeen]}>
              <AvatarImage
                uri={item.user.profile_image}
                name={item.user.name}
                size={AVATAR}
              />
            </View>
            <Text style={s.label} numberOfLines={1}>
              {item.user.name.split(" ")[0] || item.user.name}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

export const StoryTray = memo(StoryTrayInner);
