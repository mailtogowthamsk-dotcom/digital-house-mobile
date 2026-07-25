import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator
} from "react-native";
import { AppKeyboardAvoidingView } from "../../components/ui/AppKeyboardAvoidingView";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Input } from "../../components/ui/Input";
import { PrimaryButton } from "../../components/ui/PrimaryButton";
import { checkUsernameAvailability, setUsername } from "../../api/users.api";
import { getAuthErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { normalizeUsernameInput, validateUsernameLocal } from "../../utils/username";
import { spacing } from "../../theme/spacing";
import { useTheme } from "../../theme/ThemeContext";

export function SetUsernameScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { refreshSession } = useAuth();
  const [username, setUsernameInput] = useState("");
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const normalized = normalizeUsernameInput(username);
    const localErr = validateUsernameLocal(normalized);
    if (!normalized || localErr) {
      setAvailable(null);
      return;
    }

    setChecking(true);
    const timer = setTimeout(() => {
      checkUsernameAvailability(normalized)
        .then((ok) => setAvailable(ok))
        .catch(() => setAvailable(false))
        .finally(() => setChecking(false));
    }, 350);

    return () => clearTimeout(timer);
  }, [username]);

  const onSubmit = async () => {
    setMsg(null);
    const normalized = normalizeUsernameInput(username);
    const localErr = validateUsernameLocal(normalized);
    if (localErr) {
      setMsg(localErr);
      return;
    }
    if (!available) {
      setMsg("This username is not available.");
      return;
    }

    setLoading(true);
    try {
      await setUsername(normalized);
      await refreshSession();
    } catch (e) {
      setMsg(getAuthErrorMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppKeyboardAvoidingView
      style={[styles.fill, { backgroundColor: colors.background }]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.xl }
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.title, { color: colors.text }]}>Choose your username</Text>
        <Text style={[styles.sub, { color: colors.textSecondary }]}>
          Every member needs a unique @username so others can find the right person, even when names
          are similar.
        </Text>

        <Input
          placeholder="@username"
          value={username}
          onChangeText={setUsernameInput}
          autoCapitalize="none"
          autoCorrect={false}
        />

        {checking ? (
          <ActivityIndicator size="small" color={colors.primary} style={{ marginTop: spacing.sm }} />
        ) : available === true ? (
          <Text style={[styles.hintOk, { color: colors.primary }]}>@{normalizeUsernameInput(username)} is available</Text>
        ) : available === false ? (
          <Text style={[styles.hintBad, { color: colors.error }]}>Not available</Text>
        ) : null}

        {msg ? <Text style={[styles.error, { color: colors.error }]}>{msg}</Text> : null}

        <PrimaryButton
          title={loading ? "Saving…" : "Continue"}
          onPress={() => void onSubmit()}
          disabled={loading || checking || !available}
          style={{ marginTop: spacing.lg }}
        />
      </ScrollView>
    </AppKeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: spacing.lg },
  title: { fontSize: 24, fontWeight: "800" },
  sub: { marginTop: spacing.sm, fontSize: 15, lineHeight: 22 },
  hintOk: { marginTop: spacing.sm, fontSize: 13, fontWeight: "600" },
  hintBad: { marginTop: spacing.sm, fontSize: 13, fontWeight: "600" },
  error: { marginTop: spacing.md, fontSize: 14 }
});
