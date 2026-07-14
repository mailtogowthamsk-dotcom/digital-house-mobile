import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Image,
  ScrollView
} from "react-native";
import { useFocusEffect, useNavigation, useRoute, type RouteProp } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import {
  getSupportGuide,
  listSupportGuides,
  type SupportGuide,
  type SupportGuideDetail
} from "../../api/support.api";
import type { RootStackParamList } from "../../navigation/types";

export function SupportGuidesScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [guides, setGuides] = useState<SupportGuide[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      listSupportGuides()
        .then((data) => {
          if (!cancelled) setGuides(data);
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

  return (
    <FlatList
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      data={guides}
      keyExtractor={(g) => String(g.id)}
      ListEmptyComponent={
        <Text style={{ color: colors.textSecondary, textAlign: "center" }}>No guides yet.</Text>
      }
      renderItem={({ item }) => (
        <Pressable
          style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => navigation.navigate("SupportGuideDetail", { guideId: item.id })}
        >
          <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
          {item.summary ? (
            <Text style={[styles.summary, { color: colors.textSecondary }]}>{item.summary}</Text>
          ) : null}
          <View style={styles.linkRow}>
            <Text style={{ color: colors.primary, fontWeight: "700" }}>View steps</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </View>
        </Pressable>
      )}
    />
  );
}

export function SupportGuideDetailScreen() {
  const route = useRoute<RouteProp<RootStackParamList, "SupportGuideDetail">>();
  const { colors } = useTheme();
  const [guide, setGuide] = useState<SupportGuideDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getSupportGuide(route.params.guideId)
        .then((data) => {
          if (!cancelled) setGuide(data);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [route.params.guideId])
  );

  if (loading || !guide) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.detailTitle, { color: colors.text }]}>{guide.title}</Text>
      {guide.summary ? (
        <Text style={[styles.summary, { color: colors.textSecondary, marginBottom: spacing.lg }]}>
          {guide.summary}
        </Text>
      ) : null}
      {guide.steps.map((step, idx) => (
        <View key={step.id} style={{ marginBottom: spacing.xl }}>
          <Text style={[styles.stepLabel, { color: colors.primary }]}>Step {idx + 1}</Text>
          <Text style={[styles.stepTitle, { color: colors.text }]}>{step.title}</Text>
          <Text style={[styles.stepBody, { color: colors.textSecondary }]}>{step.body}</Text>
          {step.imageUrl ? (
            <Image source={{ uri: step.imageUrl }} style={styles.stepImage} resizeMode="cover" />
          ) : null}
          {idx < guide.steps.length - 1 ? (
            <Text style={[styles.arrow, { color: colors.textMuted }]}>↓</Text>
          ) : null}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  card: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: 14,
    marginBottom: 10
  },
  title: { fontSize: 16, fontWeight: "800" },
  summary: { fontSize: 14, lineHeight: 20, marginTop: 6 },
  linkRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 10 },
  detailTitle: { fontSize: 22, fontWeight: "800", marginBottom: 8 },
  stepLabel: { fontSize: 12, fontWeight: "800", marginBottom: 4 },
  stepTitle: { fontSize: 17, fontWeight: "700", marginBottom: 6 },
  stepBody: { fontSize: 14, lineHeight: 21 },
  stepImage: { width: "100%", height: 180, borderRadius: 12, marginTop: 12, backgroundColor: "#ddd" },
  arrow: { textAlign: "center", fontSize: 22, marginTop: 12 }
});
