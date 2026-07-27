import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  RefreshControl
} from "react-native";
import { Image } from "expo-image";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { getMatrimonySavedProfiles, unsaveMatrimonyProfile, type SavedProfileItem } from "../../api/matrimony.api";
import { getImageUrl } from "../../api/client";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { MatrimonyBrowseGate } from "../../components/matrimony/MatrimonyBrowseGate";

export function MatrimonySavedScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [items, setItems] = useState<SavedProfileItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getMatrimonySavedProfiles();
      setItems(list);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const onUnsave = async (userId: number) => {
    await unsaveMatrimonyProfile(userId);
    setItems((prev) => prev.filter((x) => x.userId !== userId));
  };

  return (
    <MatrimonyBrowseGate>
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Saved profiles</Text>
        <View style={{ width: 24 }} />
      </View>

      {loading && !items.length ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={colors.primary} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(i, index) => `saved-${i.userId}-${index}`}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", color: colors.textSecondary, marginTop: 32 }}>
              No saved profiles yet. Tap the bookmark on a candidate profile to save.
            </Text>
          }
          renderItem={({ item }) => {
            const uri = item.photoUrl ? getImageUrl(item.photoUrl) ?? item.photoUrl : null;
            return (
              <Pressable
                style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => navigation.navigate("MatrimonyCandidate", { userId: item.userId })}
              >
                {uri ? (
                  <Image source={{ uri }} cachePolicy="memory-disk" contentFit="cover" style={styles.photo} />
                ) : (
                  <View style={[styles.photo, { backgroundColor: colors.border }]} />
                )}
                <View style={styles.body}>
                  <Text style={[styles.name, { color: colors.text }]}>
                    {item.name}
                    {item.age != null ? `, ${item.age}` : ""}
                  </Text>
                  {item.district ? (
                    <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{item.district}</Text>
                  ) : null}
                </View>
                <Pressable
                  onPress={() => void onUnsave(item.userId)}
                  hitSlop={8}
                  style={styles.unsaveBtn}
                >
                  <Ionicons name="bookmark" size={22} color={colors.primary} />
                </Pressable>
              </Pressable>
            );
          }}
        />
      )}
    </View>
    </MatrimonyBrowseGate>
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
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: spacing.sm,
    padding: spacing.sm,
    gap: spacing.sm
  },
  photo: { width: 56, height: 56, borderRadius: radius.md },
  body: { flex: 1 },
  name: { fontSize: 16, fontWeight: "700" },
  unsaveBtn: { padding: 6 }
});
