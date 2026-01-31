import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";

const VERIFIED_GREEN = "#22C55E";
const TEXT_PRIMARY = "#111827";
const TEXT_SECONDARY = "#6B7280";
const BLUE = "#2563EB";

type WelcomeCardProps = {
  userName: string;
  avatarUri?: string | null;
};

/**
 * Welcome card: avatar left, greeting, welcome line + verified badge.
 * Premium: 16px radius, soft shadow, clear typography hierarchy.
 */
export function WelcomeCard({ userName, avatarUri }: WelcomeCardProps) {
  const initial = userName.trim().charAt(0).toUpperCase() || "U";
  const displayName = userName.trim() || "User";

  return (
    <View style={s.card}>
      <View style={s.avatarWrap}>
        <Text style={s.avatarText}>{initial}</Text>
      </View>
      <View style={s.textWrap}>
        <Text style={s.greeting} numberOfLines={1}>
          Hello, {displayName} 👋
        </Text>
        <View style={s.welcomeRow}>
          <Text style={s.welcome} numberOfLines={1}>
            Welcome to Digital House
          </Text>
          <View style={s.verifiedBadge}>
            <Ionicons name="checkmark-circle" size={16} color={VERIFIED_GREEN} />
            <Text style={s.verifiedText}>Verified</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
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
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 16
  },
  avatarText: {
    fontSize: 24,
    fontWeight: "700",
    color: BLUE
  },
  textWrap: { flex: 1, minWidth: 0 },
  greeting: {
    fontSize: 19,
    fontWeight: "600",
    color: TEXT_PRIMARY,
    marginBottom: 4
  },
  welcomeRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8
  },
  welcome: {
    fontSize: 14,
    fontWeight: "500",
    color: TEXT_SECONDARY
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4
  },
  verifiedText: {
    fontSize: 12,
    fontWeight: "600",
    color: VERIFIED_GREEN
  }
});
