import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Switch } from "react-native";
import { Input } from "../ui/Input";
import { PrimaryButton } from "../ui/PrimaryButton";
import {
  changeUsername,
  getUsernameEligibility,
  updateProfileVisibility,
  type ProfileVisibility,
  type UsernameEligibility
} from "../../api/users.api";
import { useAuth } from "../../context/AuthContext";
import { formatUsername, normalizeUsernameInput, validateUsernameLocal } from "../../utils/username";
import { spacing, radius } from "../../theme/spacing";
import { appAlert } from "../../utils/appAlert";

type Colors = {
  surface: string;
  border: string;
  text: string;
  textSecondary: string;
  primary: string;
};

type Props = {
  username: string | null;
  profileVisibility: ProfileVisibility;
  colors: Colors;
  onUpdated: () => void;
};

export function ProfileIdentitySection({
  username,
  profileVisibility,
  colors,
  onUpdated
}: Props) {
  const { refreshSession } = useAuth();
  const [visibility, setVisibility] = useState(profileVisibility);
  const [nextUsername, setNextUsername] = useState("");
  const [eligibility, setEligibility] = useState<UsernameEligibility | null>(null);
  const [savingVisibility, setSavingVisibility] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);

  useEffect(() => {
    setVisibility(profileVisibility);
  }, [profileVisibility]);

  useEffect(() => {
    getUsernameEligibility()
      .then(setEligibility)
      .catch(() => setEligibility(null));
  }, [username]);

  const onToggleVisibility = async (next: boolean) => {
    const value: ProfileVisibility = next ? "PUBLIC" : "PRIVATE";
    setVisibility(value);
    setSavingVisibility(true);
    try {
      await updateProfileVisibility(value);
      await refreshSession();
      onUpdated();
    } catch (e: unknown) {
      setVisibility(profileVisibility);
      appAlert("Could not update", e instanceof Error ? e.message : "Try again.");
    } finally {
      setSavingVisibility(false);
    }
  };

  const onChangeUsername = async () => {
    const normalized = normalizeUsernameInput(nextUsername);
    const localErr = validateUsernameLocal(normalized);
    if (localErr) {
      appAlert("Invalid username", localErr);
      return;
    }
    setSavingUsername(true);
    try {
      await changeUsername(normalized);
      setNextUsername("");
      await refreshSession();
      onUpdated();
      const nextEligibility = await getUsernameEligibility();
      setEligibility(nextEligibility);
      appAlert("Username updated", `You are now ${formatUsername(normalized)}.`);
    } catch (e: unknown) {
      appAlert("Could not change username", e instanceof Error ? e.message : "Try again.");
    } finally {
      setSavingUsername(false);
    }
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]}>Identity & privacy</Text>

      <Text style={[styles.label, { color: colors.textSecondary }]}>Current username</Text>
      <Text style={[styles.username, { color: colors.primary }]}>
        {username ? formatUsername(username) : "Not set"}
      </Text>

      <View style={styles.switchRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.label, { color: colors.text }]}>Public profile</Text>
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            {visibility === "PUBLIC"
              ? "Approved members can view your full profile."
              : "Others see a limited preview until they connect with you."}
          </Text>
        </View>
        <Switch
          value={visibility === "PUBLIC"}
          onValueChange={(v) => void onToggleVisibility(v)}
          disabled={savingVisibility}
        />
      </View>

      {eligibility?.canChange ? (
        <View style={{ marginTop: spacing.md }}>
          <Input
            placeholder="New @username"
            value={nextUsername}
            onChangeText={setNextUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Text style={[styles.hint, { color: colors.textSecondary, marginTop: spacing.xs }]}>
            {eligibility.changesUsed}/{eligibility.changesLimit} changes used in the last 12 months.
          </Text>
          <PrimaryButton
            title={savingUsername ? "Saving…" : "Change username"}
            onPress={() => void onChangeUsername()}
            disabled={savingUsername || !nextUsername.trim()}
            style={{ marginTop: spacing.sm }}
          />
        </View>
      ) : eligibility ? (
        <Text style={[styles.hint, { color: colors.textSecondary, marginTop: spacing.md }]}>
          {eligibility.reason ?? "Username change is not available right now."}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    marginBottom: spacing.lg
  },
  title: { fontSize: 16, fontWeight: "800", marginBottom: spacing.md },
  label: { fontSize: 13, fontWeight: "600" },
  username: { fontSize: 18, fontWeight: "800", marginTop: 4, marginBottom: spacing.md },
  switchRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  hint: { fontSize: 12, lineHeight: 17, marginTop: 4 }
});
