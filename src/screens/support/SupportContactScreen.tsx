import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Linking
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { getSupportContact, type SupportContact } from "../../api/support.api";
import { appAlert } from "../../utils/appAlert";

export function SupportContactScreen() {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [contact, setContact] = useState<SupportContact | null>(null);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      getSupportContact()
        .then((c) => {
          if (!cancelled) setContact(c);
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const openUrl = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      appAlert("Unable to open", "Please try again or use another contact option.");
    }
  };

  if (loading || !contact) {
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
      {contact.supportNote ? (
        <Text style={[styles.note, { color: colors.textSecondary }]}>{contact.supportNote}</Text>
      ) : null}

      {contact.emailEnabled && contact.email ? (
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.row, { backgroundColor: pressed ? colors.surfaceElevated : colors.surface, borderColor: colors.border }]}
          onPress={() => openUrl(`mailto:${contact.email}`)}
        >
          <View style={[styles.icon, { backgroundColor: colors.primary + "14" }]}>
            <Ionicons name="mail-outline" size={18} color={colors.primary} />
          </View>
          <View style={styles.textCol}>
            <Text style={[styles.title, { color: colors.text }]}>Email</Text>
            <Text style={[styles.sub, { color: colors.textSecondary }]}>{contact.email}</Text>
          </View>
        </Pressable>
      ) : null}

      {contact.chatEnabled ? (
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.row, { backgroundColor: pressed ? colors.surfaceElevated : colors.surface, borderColor: colors.border }]}
          onPress={() => navigation.navigate("SupportCreateTicket", { type: "CONTACT" })}
        >
          <View style={[styles.icon, { backgroundColor: colors.primary + "14" }]}>
            <Ionicons name="chatbubbles-outline" size={18} color={colors.primary} />
          </View>
          <View style={styles.textCol}>
            <Text style={[styles.title, { color: colors.text }]}>Chat with Support</Text>
            <Text style={[styles.sub, { color: colors.textSecondary }]}>
              Open a ticket — we reply in-app
            </Text>
          </View>
        </Pressable>
      ) : null}

      {contact.whatsappEnabled && contact.whatsappNumber ? (
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.row, { backgroundColor: pressed ? colors.surfaceElevated : colors.surface, borderColor: colors.border }]}
          onPress={() => {
            const n = contact.whatsappNumber!.replace(/[^\d+]/g, "");
            openUrl(`https://wa.me/${n.replace(/^\+/, "")}`);
          }}
        >
          <View style={[styles.icon, { backgroundColor: colors.primary + "14" }]}>
            <Ionicons name="logo-whatsapp" size={18} color="#25D366" />
          </View>
          <View style={styles.textCol}>
            <Text style={[styles.title, { color: colors.text }]}>WhatsApp</Text>
            <Text style={[styles.sub, { color: colors.textSecondary }]}>
              {contact.whatsappNumber}
            </Text>
          </View>
        </Pressable>
      ) : null}

      {contact.callEnabled && contact.phoneNumber ? (
        <Pressable
          accessibilityRole="button"
          style={({ pressed }) => [styles.row, { backgroundColor: pressed ? colors.surfaceElevated : colors.surface, borderColor: colors.border }]}
          onPress={() => openUrl(`tel:${contact.phoneNumber}`)}
        >
          <View style={[styles.icon, { backgroundColor: colors.primary + "14" }]}>
            <Ionicons name="call-outline" size={18} color={colors.primary} />
          </View>
          <View style={styles.textCol}>
            <Text style={[styles.title, { color: colors.text }]}>Call Support</Text>
            <Text style={[styles.sub, { color: colors.textSecondary }]}>
              {contact.phoneNumber}
            </Text>
          </View>
        </Pressable>
      ) : null}

      <Pressable
        accessibilityRole="button"
        style={({ pressed }) => [styles.row, { backgroundColor: pressed ? colors.surfaceElevated : colors.surface, borderColor: colors.border }]}
        onPress={() => navigation.navigate("SupportCreateTicket", { type: "CONTACT" })}
      >
        <View style={[styles.icon, { backgroundColor: colors.primary + "14" }]}>
          <Ionicons name="person-outline" size={18} color={colors.primary} />
        </View>
        <View style={styles.textCol}>
          <Text style={[styles.title, { color: colors.text }]}>Contact Admin</Text>
          <Text style={[styles.sub, { color: colors.textSecondary }]}>
            Approvals, payments, community issues
          </Text>
        </View>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: {
    width: "100%", maxWidth: 640, alignSelf: "center",
    paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.xxl
  },
  note: { fontSize: 13, lineHeight: 19, marginBottom: spacing.lg },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 54,
    padding: spacing.sm + 2,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: spacing.sm
  },
  icon: { width: 34, height: 34, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  textCol: { flex: 1, minWidth: 0 },
  title: { fontSize: 13, fontWeight: "700" },
  sub: { fontSize: 12, marginTop: 2 }
});
