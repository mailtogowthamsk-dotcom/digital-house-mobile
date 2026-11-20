import React, { memo, useCallback, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Image
} from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
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
  onOpenGroup: (groups: StoryGroup[], index: number) => void;
  onAddStory: () => void;
};

const RING = 64;
const AVATAR = 54;
const OFFICIAL_LOGO = require("../../../assets/logo_digital_house.png");

function StoryRing({ stories, unseenColor, seenColor }: {
  stories: StoryGroup["stories"];
  unseenColor: string;
  seenColor: string;
}) {
  if (stories.length === 0) return null;

  const center = RING / 2;
  const radius = center - 1.5;
  const segmentAngle = (2 * Math.PI) / stories.length;
  const gap = Math.min(0.12, segmentAngle * 0.24);
  const point = (angle: number) =>
    `${center + radius * Math.cos(angle)} ${center + radius * Math.sin(angle)}`;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={RING} height={RING}>
        {stories.map((story, index) => {
          const color = story.viewed_by_me ? seenColor : unseenColor;
          if (stories.length === 1) {
            return <Circle key={story.id} cx={center} cy={center} r={radius} fill="none" stroke={color} strokeWidth={3} />;
          }
          const start = index * segmentAngle - Math.PI / 2 + gap / 2;
          const end = start + segmentAngle - gap;
          return (
            <Path
              key={story.id}
              d={`M ${point(start)} A ${radius} ${radius} 0 0 1 ${point(end)}`}
              fill="none"
              stroke={color}
              strokeWidth={3}
            />
          );
        })}
      </Svg>
    </View>
  );
}

function StoryTrayInner({
  groups,
  loading,
  currentUser,
  onOpenGroup,
  onAddStory
}: Props) {
  const { colors, mode } = useTheme();

  const officialGroup =
    groups.find((g) => g.is_official && (g.stories?.length ?? 0) > 0) ?? null;
  const ownGroup = groups.find((g) => g.is_own && !g.is_official) ?? null;
  const others = useMemo(() => groups.filter((g) => !g.is_own && !g.is_official), [groups]);
  const viewerGroups = useMemo(
    () => [...(ownGroup ? [ownGroup] : []), ...(officialGroup ? [officialGroup] : []), ...others],
    [ownGroup, officialGroup, others]
  );

  const s = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          paddingTop: 4,
          paddingBottom: 4,
          minHeight: 94
        },
        item: { width: 76, alignItems: "center", gap: 6 },
        ring: {
          width: RING,
          height: RING,
          borderRadius: RING / 2,
          alignItems: "center",
          justifyContent: "center"
        },
        ringUnseen: { borderColor: colors.primary },
        ringSeen: {
          borderColor: mode === "dark" ? "rgba(148,163,184,0.45)" : "rgba(148,163,184,0.7)"
        },
        ringEmpty: {
          borderWidth: 2.5,
          borderColor: mode === "dark" ? "rgba(148,163,184,0.35)" : "rgba(148,163,184,0.55)",
          borderStyle: "dashed" as const
        },
        officialLogo: {
          width: AVATAR,
          height: AVATAR,
          borderRadius: AVATAR / 2,
          backgroundColor: colors.surface
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
        labelOfficial: {
          fontSize: 11,
          fontWeight: "800",
          color: colors.primary,
          maxWidth: 72,
          textAlign: "center"
        },
        loader: { width: 36, alignSelf: "flex-start", marginTop: 22 }
      }),
    [colors, mode]
  );

  const officialIndex = ownGroup ? 1 : 0;
  const ownIndex = 0;
  const othersOffset = (officialGroup ? 1 : 0) + (ownGroup ? 1 : 0);

  const renderHeader = useCallback(() => {
    const hasOwnStories = (ownGroup?.stories.length ?? 0) > 0;
    return (
      <View style={{ flexDirection: "row", gap: 4 }}>
        <Pressable
          style={s.item}
          onPress={() => {
            if (hasOwnStories && ownGroup) onOpenGroup(viewerGroups, ownIndex);
            else onAddStory();
          }}
          onLongPress={onAddStory}
          accessibilityRole="button"
          accessibilityLabel={hasOwnStories ? `Your story, ${ownGroup?.stories.length} updates` : "Add to your story"}
        >
          <View style={[s.ring, !hasOwnStories && s.ringEmpty]}>
            <AvatarImage
              uri={currentUser?.profileImage ?? ownGroup?.user.profile_image}
              name={currentUser?.name ?? "You"}
              size={AVATAR}
            />
            {hasOwnStories && ownGroup ? (
              <StoryRing
                stories={ownGroup.stories}
                unseenColor={s.ringUnseen.borderColor}
                seenColor={s.ringSeen.borderColor}
              />
            ) : null}
            <View style={s.addBadge}>
              <Ionicons name="add" size={14} color="#fff" />
            </View>
          </View>
          <Text style={s.label} numberOfLines={1}>
            Your Story
          </Text>
        </Pressable>
        {officialGroup ? (
          <Pressable
            style={s.item}
            onPress={() => onOpenGroup(viewerGroups, officialIndex)}
            accessibilityRole="button"
            accessibilityLabel={`VettuvaGounder status, ${officialGroup.stories.length} updates`}
          >
            <View style={s.ring}>
              <Image source={OFFICIAL_LOGO} style={s.officialLogo} resizeMode="cover" />
              <StoryRing
                stories={officialGroup.stories}
                unseenColor={s.ringUnseen.borderColor}
                seenColor={s.ringSeen.borderColor}
              />
            </View>
            <Text style={s.labelOfficial} numberOfLines={1}>
              VettuvaGounder
            </Text>
          </Pressable>
        ) : null}
        {loading && groups.length === 0 ? (
          <ActivityIndicator style={s.loader} color={s.ringUnseen.borderColor} />
        ) : null}
      </View>
    );
  }, [
    officialGroup,
    ownGroup,
    currentUser,
    onAddStory,
    onOpenGroup,
    officialIndex,
    viewerGroups,
    loading,
    groups.length,
    s
  ]);

  return (
    <View style={s.wrap}>
      <FlatList
        horizontal
        data={others}
        keyExtractor={(g) => `u-${g.user.id}`}
        showsHorizontalScrollIndicator={false}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 4 }}
        renderItem={({ item, index }) => (
          <Pressable
            style={s.item}
            onPress={() => onOpenGroup(viewerGroups, index + othersOffset)}
            accessibilityRole="button"
            accessibilityLabel={`${item.user.name}'s story, ${item.stories.length} updates`}
          >
            <View style={s.ring}>
              <AvatarImage
                uri={item.user.profile_image}
                name={item.user.name}
                size={AVATAR}
              />
              <StoryRing
                stories={item.stories}
                unseenColor={s.ringUnseen.borderColor}
                seenColor={s.ringSeen.borderColor}
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
