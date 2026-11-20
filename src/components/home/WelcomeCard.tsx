import React, { useMemo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { AvatarImage } from "../ui/AvatarImage";
import { useTheme } from "../../theme/ThemeContext";

type WelcomeCardProps = {
  userName: string;
  avatarUri?: string | null;
};

export function WelcomeCard({ userName, avatarUri }: WelcomeCardProps) {
  const { colors, mode } = useTheme();
  const s = useMemo(
    () =>
      StyleSheet.create({
        card: {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.surface,
          borderRadius: 16,
          paddingHorizontal: 12,
          paddingVertical: 6,
          gap: 8
        },
        textWrap: { flex: 1, minWidth: 0 },
        greeting: {
          fontSize: 13,
          fontWeight: "600",
          color: colors.text
        }
      }),
    [colors]
  );

  const displayName = userName.trim() || "User";

  return (
    <View style={s.card}>
      <AvatarImage
        uri={avatarUri}
        name={displayName}
        size={28}
        placeholderColor={mode === "dark" ? "#1E3A5F" : "#EFF6FF"}
        textColor={colors.primary}
      />
      <View style={s.textWrap}>
        <Text style={s.greeting} numberOfLines={1}>
          Hello, {displayName} 👋
        </Text>
      </View>
    </View>
  );
}
