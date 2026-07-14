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
      <Text style={[styles.hero, { color: colors.text }]}>Need help?</Text>
      {contact.supportNote ? (
        <Text style={[styles.note, { color: colors.textSecondary }]}>{contact.supportNote}</Text>
      ) : null}

      {contact.emailEnabled && contact.email ? (
        <Pressable
          style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => openUrl(`mailto:${contact.email}`)}
        >
          <Ionicons name="mail-outline" size={22} color={colors.primary} />
          <View style={styles.textCol}>
            <Text style={[styles.title, { color: colors.text }]}>Email</Text>
            <Text style={[styles.sub, { color: colors.textSecondary }]}>{contact.email}</Text>
          </View>
        </Pressable>
      ) : null}

      {contact.chatEnabled ? (
        <Pressable
          style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => navigation.navigate("SupportCreateTicket", { type: "CONTACT" })}
        >
          <Ionicons name="chatbubbles-outline" size={22} color={colors.primary} />
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
          style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => {
            const n = contact.whatsappNumber!.replace(/[^\d+]/g, "");
            openUrl(`https://wa.me/${n.replace(/^\+/, "")}`);
          }}
        >
          <Ionicons name="logo-whatsapp" size={22} color="#25D366" />
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
          style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
          onPress={() => openUrl(`tel:${contact.phoneNumber}`)}
        >
          <Ionicons name="call-outline" size={22} color={colors.primary} />
          <View style={styles.textCol}>
            <Text style={[styles.title, { color: colors.text }]}>Call Support</Text>
            <Text style={[styles.sub, { color: colors.textSecondary }]}>
              {contact.phoneNumber}
            </Text>
          </View>
        </Pressable>
      ) : null}

      <Pressable
        style={[styles.row, { backgroundColor: colors.surface, borderColor: colors.border }]}
        onPress={() => navigation.navigate("SupportCreateTicket", { type: "CONTACT" })}
      >
        <Ionicons name="person-outline" size={22} color={colors.primary} />
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
  content: { padding: spacing.lg, paddingBottom: spacing.xxxl },
  hero: { fontSize: 22, fontWeight: "800", marginBottom: 8 },
  note: { fontSize: 14, lineHeight: 20, marginBottom: spacing.lg },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 10
  },
  textCol: { flex: 1, minWidth: 0 },
  title: { fontSize: 16, fontWeight: "700" },
  sub: { fontSize: 13, marginTop: 2 }
});
