import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  Pressable,
  ActivityIndicator
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useNavigation } from "@react-navigation/native";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { searchUsers, type DirectoryUser } from "../../api/users.api";
import { getAuthErrorMessage, getErrorStatus, getImageUrl } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { AvatarImage } from "../../components/ui/AvatarImage";
import { formatUsername } from "../../utils/username";
import { relationshipLabel } from "../../utils/relationshipStatus";

export function SearchMembersScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const { status, refreshSession } = useAuth();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DirectoryUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setError(null);
      return;
    }

    if (status !== "home") {
      setResults([]);
      setError("Please sign in with an approved account to search members.");
      return;
    }

    setLoading(true);
    setError(null);
    const timer = setTimeout(() => {
      searchUsers(trimmed)
        .then(setResults)
        .catch(async (e: unknown) => {
          setError(getAuthErrorMessage(e));
          setResults([]);
          if (getErrorStatus(e) === 401) {
            await refreshSession().catch(() => {});
          }
        })
        .finally(() => setLoading(false));
    }, 250);

    return () => clearTimeout(timer);
  }, [query, status, refreshSession]);

  const renderItem = useCallback(
    ({ item }: { item: DirectoryUser }) => {
      const location = [item.city, item.district].filter(Boolean).join(", ");
      return (
        <Pressable
          style={[styles.row, { borderBottomColor: colors.border }]}
          onPress={() =>
            navigation.navigate("MemberProfile", {
              userId: item.id,
              username: item.username
            })
          }
        >
          <AvatarImage
            uri={getImageUrl(item.profileImage)}
            name={item.fullName}
            size={48}
            placeholderColor={colors.surfaceElevated}
            textColor={colors.textMuted}
          />
          <View style={styles.rowText}>
            <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
              {item.fullName}
            </Text>
            {item.username ? (
              <Text style={[styles.username, { color: colors.primary }]} numberOfLines={1}>
                {formatUsername(item.username)}
              </Text>
            ) : (
              <Text style={[styles.setupBadge, { color: colors.textMuted }]}>
                Username not set yet
              </Text>
            )}
            {location ? (
              <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
                {location}
              </Text>
            ) : null}
            {item.profileVisibility === "PRIVATE" ? (
              <Text style={[styles.privateBadge, { color: colors.textMuted }]}>Private profile</Text>
            ) : null}
            {relationshipLabel(item.relationshipStatus) ? (
              <Text style={[styles.relBadge, { color: colors.primary }]}>
                {relationshipLabel(item.relationshipStatus)}
              </Text>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      );
    },
    [colors, navigation]
  );

  const s = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor: colors.background },
        searchWrap: {
          margin: spacing.lg,
          flexDirection: "row",
          alignItems: "center",
          gap: spacing.sm,
          backgroundColor: colors.surface,
          borderRadius: radius.lg,
          borderWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm
        },
        searchInput: { flex: 1, fontSize: 15, color: colors.text, minHeight: 36 },
        empty: { padding: spacing.xl, alignItems: "center" },
        emptyText: { color: colors.textSecondary, textAlign: "center", lineHeight: 20 }
      }),
    [colors]
  );

  return (
    <View style={s.container}>
      <View style={s.searchWrap}>
        <Ionicons name="search" size={18} color={colors.textMuted} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search by name or @username"
          placeholderTextColor={colors.textMuted}
          style={s.searchInput}
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: spacing.lg }} color={colors.primary} />
      ) : error ? (
        <View style={s.empty}>
          <Text style={s.emptyText}>{error}</Text>
        </View>
      ) : !query.trim() ? (
        <View style={s.empty}>
          <Ionicons name="people-outline" size={42} color={colors.textSecondary} />
          <Text style={[s.emptyText, { marginTop: spacing.md }]}>
            Search approved members by full name or @username.
          </Text>
        </View>
      ) : results.length === 0 ? (
        <View style={s.empty}>
          <Text style={s.emptyText}>
            No members found. Search by full name or @username. Members must be approved to appear.
          </Text>
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth
  },
  rowText: { flex: 1, minWidth: 0 },
  name: { fontSize: 16, fontWeight: "800" },
  username: { fontSize: 14, fontWeight: "600", marginTop: 2 },
  meta: { fontSize: 13, marginTop: 2 },
  privateBadge: { fontSize: 12, marginTop: 4, fontWeight: "600" },
  setupBadge: { fontSize: 13, marginTop: 2, fontWeight: "600", fontStyle: "italic" },
  relBadge: { fontSize: 12, marginTop: 4, fontWeight: "700" }
});
