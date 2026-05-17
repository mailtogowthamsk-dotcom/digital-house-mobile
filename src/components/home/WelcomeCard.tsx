import React, { useMemo } from "react";
import { View, Text, StyleSheet, Image } from "react-native";
import { getImageUrl } from "../../api/client";
import { useTheme } from "../../theme/ThemeContext";

type WelcomeCardProps = {
  userName: string;
  avatarUri?: string | null;
};

export function WelcomeCard({ userName, avatarUri }: WelcomeCardProps) {
  const { colors, mode } = useTheme();
  const avatarUrl = getImageUrl(avatarUri ?? null);
  const s = useMemo(
    () =>
      StyleSheet.create({
        card: {
          flexDirection: "row",
          alignItems: "center",
          backgroundColor: colors.surface,
          borderRadius: 16,
          padding: 18,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 10,
          elevation: 3
        },
        avatarWrap: {
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: mode === "dark" ? "#1E3A5F" : "#EFF6FF",
          alignItems: "center",
          justifyContent: "center",
          marginRight: 16,
          overflow: "hidden"
        },
        avatarImg: { width: 56, height: 56, borderRadius: 28 },
        avatarText: {
          fontSize: 24,
          fontWeight: "700",
          color: colors.primary
        },
        textWrap: { flex: 1, minWidth: 0 },
        greeting: {
          fontSize: 19,
          fontWeight: "600",
          color: colors.text,
          marginBottom: 4
        },
        welcome: {
          fontSize: 14,
          fontWeight: "500",
          color: colors.textSecondary
        }
      }),
    [colors, mode]
  );

  const initial = userName.trim().charAt(0).toUpperCase() || "U";
  const displayName = userName.trim() || "User";

  return (
    <View style={s.card}>
      <View style={s.avatarWrap}>
        {avatarUrl ? (
          <Image key={avatarUrl} source={{ uri: avatarUrl }} style={s.avatarImg} />
        ) : (
          <Text style={s.avatarText}>{initial}</Text>
        )}
      </View>
      <View style={s.textWrap}>
        <Text style={s.greeting} numberOfLines={1}>
          Hello, {displayName} 👋
        </Text>
        <Text style={s.welcome} numberOfLines={1}>
          Welcome to Digital House
        </Text>
      </View>
    </View>
  );
}
