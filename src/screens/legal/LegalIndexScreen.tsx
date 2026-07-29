import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  RefreshControl
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import {
  LEGAL_FALLBACK_LINKS,
  listLegalCatalog,
  type LegalCatalogItem
} from "../../api/legal.api";
import { getAuthErrorMessage } from "../../api/client";

type ListItem = {
  documentKey: string;
  title: string;
  slug: string;
  description?: string | null;
  version?: string | null;
};

export function LegalIndexScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [items, setItems] = useState<ListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usedFallback, setUsedFallback] = useState(false);

  const load = useCallback(async (soft?: boolean) => {
    if (!soft) setLoading(true);
    setError(null);
    try {
      const docs = await listLegalCatalog();
      if (docs.length > 0) {
        setItems(docs);
        setUsedFallback(false);
      } else {
        setItems(LEGAL_FALLBACK_LINKS);
        setUsedFallback(true);
      }
    } catch (e) {
      setItems(LEGAL_FALLBACK_LINKS);
      setUsedFallback(true);
      setError(getAuthErrorMessage(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const openDoc = (item: ListItem) => {
    navigation.navigate("LegalDocument", {
      documentKey: item.documentKey,
      slug: item.slug,
      title: item.title
    });
  };

  if (loading && items.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      data={items}
      keyExtractor={(item) => item.documentKey}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            void load(true);
          }}
          tintColor={colors.primary}
        />
      }
      ListHeaderComponent={
        error || usedFallback ? (
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            {error
              ? `${error} Showing default document list.`
              : "Showing available legal topics. Open a document to load the latest published version."}
          </Text>
        ) : (
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            Latest published policies for Digital House.
          </Text>
        )
      }
      ListEmptyComponent={
        <Text style={{ color: colors.textSecondary, textAlign: "center" }}>
          No published legal documents yet.
        </Text>
      }
      ItemSeparatorComponent={() => (
        <View style={[styles.separator, { backgroundColor: colors.border }]} />
      )}
      renderItem={({ item }) => (
        <Pressable
          style={({ pressed }) => [
            styles.row,
            {
              backgroundColor: pressed ? colors.surfaceElevated : colors.surface,
              borderColor: colors.border
            }
          ]}
          onPress={() => openDoc(item)}
          accessibilityRole="button"
          accessibilityLabel={`Open ${item.title}`}
        >
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
            {item.description ? (
              <Text style={[styles.desc, { color: colors.textSecondary }]} numberOfLines={2}>
                {item.description}
              </Text>
            ) : null}
            {item.version ? (
              <Text style={[styles.version, { color: colors.textMuted }]}>
                Version {item.version}
              </Text>
            ) : null}
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.sm
  },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.xs
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg
  },
  title: { fontSize: 16, fontWeight: "600" },
  desc: { fontSize: 13, lineHeight: 18, marginTop: 4 },
  version: { fontSize: 12, marginTop: 6, fontWeight: "600" },
  separator: { height: 0 }
});
