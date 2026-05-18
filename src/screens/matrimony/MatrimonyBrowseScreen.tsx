import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { discoverMatrimonyProfiles, type DiscoverCard } from "../../api/matrimony.api";
import { getImageUrl } from "../../api/client";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";

function DiscoverCardItem({
  item,
  onPress
}: {
  item: DiscoverCard;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const uri = item.photoUrl ? getImageUrl(item.photoUrl) ?? item.photoUrl : null;

  return (
    <Pressable
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
    >
      {uri ? (
        <Image source={{ uri }} style={styles.photo} />
      ) : (
        <View style={[styles.photo, styles.photoPlaceholder, { backgroundColor: colors.border }]}>
          <Text style={{ fontSize: 28 }}>👤</Text>
        </View>
      )}
      <View style={styles.cardBody}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {item.name}
          {item.age != null ? `, ${item.age}` : ""}
        </Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
          {[item.district, item.occupation].filter(Boolean).join(" · ")}
        </Text>
        {item.education ? (
          <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
            {item.education}
          </Text>
        ) : null}
        <View style={styles.badges}>
          {item.verified && (
            <Text style={styles.badgeVerified}>✓ Verified</Text>
          )}
          {item.horoscopeAvailable && (
            <Text style={styles.badgeHoroscope}>Horoscope available</Text>
          )}
          {item.familyManaged && (
            <Text style={[styles.badgeFamily, { color: colors.textSecondary }]}>Family managed</Text>
          )}
        </View>
        {item.kulamLabel ? (
          <Text style={[styles.kulam, { color: colors.primary }]}>{item.kulamLabel}</Text>
        ) : null}
      </View>
    </Pressable>
  );
}

export function MatrimonyBrowseScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [items, setItems] = useState<DiscoverCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await discoverMatrimonyProfiles({ page: 1, limit: 40 });
      setItems(res.items);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Text style={{ color: colors.primary, fontWeight: "700" }}>← Back</Text>
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Browse profiles</Text>
        <Pressable onPress={() => navigation.navigate("MatrimonyInterests")}>
          <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}>Interests</Text>
        </Pressable>
      </View>
      <Text style={[styles.sub, { color: colors.textSecondary, paddingHorizontal: spacing.lg }]}>
        Verified matrimony candidates only · Same kulam excluded
      </Text>

      {loading && !items.length ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : error ? (
        <Text style={{ color: colors.error, textAlign: "center", marginTop: 24 }}>{error}</Text>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i) => String(i.userId)}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", color: colors.textSecondary, marginTop: 32 }}>
              No compatible profiles right now. Check back soon.
            </Text>
          }
          renderItem={({ item }) => (
            <DiscoverCardItem
              item={item}
              onPress={() => navigation.navigate("MatrimonyCandidate", { userId: item.userId })}
            />
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  title: { fontSize: 18, fontWeight: "800" },
  sub: { fontSize: 12, marginBottom: spacing.sm },
  card: {
    flexDirection: "row",
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
    overflow: "hidden"
  },
  photo: { width: 100, height: 120 },
  photoPlaceholder: { alignItems: "center", justifyContent: "center" },
  cardBody: { flex: 1, padding: spacing.md },
  name: { fontSize: 16, fontWeight: "800" },
  meta: { fontSize: 13, marginTop: 2 },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  badgeVerified: { fontSize: 11, fontWeight: "700", color: "#15803D" },
  badgeHoroscope: { fontSize: 11, fontWeight: "600", color: "#7C3AED" },
  badgeFamily: { fontSize: 11 },
  kulam: { fontSize: 12, fontWeight: "600", marginTop: 4 }
});
