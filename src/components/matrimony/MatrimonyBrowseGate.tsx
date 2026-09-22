import React, { createContext, useCallback, useContext, useRef, useState } from "react";
import { View, Text, StyleSheet, ActivityIndicator, Pressable } from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { getMatrimonyHub, type MatrimonyHub } from "../../api/matrimony.api";
import { useTheme } from "../../theme/ThemeContext";
import { spacing } from "../../theme/spacing";
import { PrimaryButton } from "../ui/PrimaryButton";

const MatrimonyHubContext = createContext<MatrimonyHub | null>(null);

/** Hub loaded by BrowseGate — children should prefer this over another GET. */
export function useMatrimonyHubFromGate(): MatrimonyHub | null {
  return useContext(MatrimonyHubContext);
}

function blockedMessage(hub: MatrimonyHub): string {
  if (hub.can_browse) return "";
  if (hub.status === "PAUSED") {
    return "Your matrimony profile is paused. Matches and chats stay available from Matrimony Home.";
  }
  if (hub.status === "CLOSED") {
    return "Your matrimony profile is closed. Reactivate it to browse again. Matches and chats stay available.";
  }
  if (hub.status === "PENDING" || hub.status === "RESUBMITTED") {
    return "Your matrimony profile is under admin review. Browsing unlocks after approval.";
  }
  if (hub.status === "CHANGES_REQUESTED") {
    return "Admin requested changes. Complete the requested updates and resubmit before browsing.";
  }
  if (hub.status === "REJECTED") {
    return "Your matrimony application was rejected. Update your profile and submit again.";
  }
  if (hub.status === "APPROVED" && hub.completion_percentage < 100) {
    return `Complete your matrimony profile (${hub.completion_percentage}% done) before browsing.`;
  }
  if (hub.completion_percentage < 100) {
    return `Complete your matrimony profile (${hub.completion_percentage}% done) and submit for admin approval.`;
  }
  return "Complete matrimony setup and get admin approval before browsing profiles.";
}

function hasRelationshipAccess(hub: MatrimonyHub): boolean {
  return hub.status === "APPROVED" || hub.status === "PAUSED" || hub.status === "CLOSED";
}

type Props = {
  children: React.ReactNode;
  /**
   * browse (default): requires can_browse
   * relationships: allows paused/closed so matches & interests stay reachable
   */
  mode?: "browse" | "relationships";
};

/** Hard gate — no dismissible bypass when access is locked. */
export function MatrimonyBrowseGate({ children, mode = "browse" }: Props) {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [hub, setHub] = useState<MatrimonyHub | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hubRef = useRef(hub);
  hubRef.current = hub;

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      if (!hubRef.current) setLoading(true);
      setError(null);
      // TTL + in-flight coalesce — sequential focus reuses fresh hub when possible.
      void getMatrimonyHub()
        .then((data) => {
          if (!cancelled) setHub(data);
        })
        .catch((e: unknown) => {
          if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (error || !hub) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, padding: spacing.xl }]}>
        <Text style={{ color: colors.text, textAlign: "center", marginBottom: spacing.md }}>
          {error ?? "Unable to load matrimony access"}
        </Text>
        <PrimaryButton
          title="Retry"
          onPress={() => {
            setLoading(true);
            void getMatrimonyHub({ force: true })
              .then(setHub)
              .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed"))
              .finally(() => setLoading(false));
          }}
        />
      </View>
    );
  }

  const allowed = mode === "browse" ? hub.can_browse : hasRelationshipAccess(hub);
  if (!allowed) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, padding: spacing.xl }]}>
        <Ionicons name="lock-closed-outline" size={40} color={colors.textMuted} />
        <Text
          style={{
            color: colors.text,
            textAlign: "center",
            marginTop: spacing.md,
            marginBottom: spacing.lg,
            lineHeight: 22
          }}
        >
          {blockedMessage(hub)}
        </Text>
        <PrimaryButton title="Open Matrimony Home" onPress={() => navigation.navigate("MatrimonyHome")} />
        <Pressable onPress={() => navigation.goBack()} style={{ marginTop: spacing.md }}>
          <Text style={{ color: colors.primary, fontWeight: "700" }}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return <MatrimonyHubContext.Provider value={hub}>{children}</MatrimonyHubContext.Provider>;
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center" }
});
