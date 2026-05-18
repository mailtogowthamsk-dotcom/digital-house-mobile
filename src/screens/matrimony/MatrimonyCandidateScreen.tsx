import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Linking
} from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getMatrimonyCandidate,
  sendMatrimonyInterest,
  respondMatrimonyInterest,
  getMatrimonyHoroscope,
  revealMatrimonyContact,
  type CandidateDetail
} from "../../api/matrimony.api";
import { getImageUrl } from "../../api/client";
import { useTheme } from "../../theme/ThemeContext";
import { spacing, radius } from "../../theme/spacing";
import { PrimaryButton } from "../../components/ui/PrimaryButton";

export function MatrimonyCandidateScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const userId = route.params?.userId as number;
  const routeInterestId = route.params?.interestId as number | undefined;
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [profile, setProfile] = useState<CandidateDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMatrimonyCandidate(userId);
      setProfile(data);
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed to load");
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  }, [userId, navigation]);

  React.useEffect(() => {
    load();
  }, [load]);

  const onSendInterest = async () => {
    setActing(true);
    try {
      const res = await sendMatrimonyInterest(userId);
      Alert.alert(
        res.mutualMatch ? "Mutual match!" : "Interest sent",
        res.mutualMatch
          ? "You are now matched. Chat and horoscope exchange are unlocked."
          : "They can accept or decline your interest."
      );
      load();
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed");
    } finally {
      setActing(false);
    }
  };

  const onRespond = async (action: "ACCEPT" | "DECLINE") => {
    const interestId = routeInterestId ?? profile?.pendingInterestId;
    if (!interestId) return;
    setActing(true);
    try {
      const res = await respondMatrimonyInterest(interestId, action);
      Alert.alert(
        action === "ACCEPT" ? (res.mutualMatch ? "Mutual match!" : "Accepted") : "Declined",
        res.mutualMatch
          ? "Both interests accepted — chat unlocked."
          : action === "ACCEPT"
            ? "Send interest back when ready for a mutual match."
            : undefined
      );
      load();
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "Failed");
    } finally {
      setActing(false);
    }
  };

  const openHoroscope = async () => {
    try {
      const { url } = await getMatrimonyHoroscope(userId);
      if (url) await Linking.openURL(url);
      else Alert.alert("Horoscope", "Document not available.");
    } catch (e) {
      Alert.alert("Horoscope", e instanceof Error ? e.message : "Available after mutual match only.");
    }
  };

  const showContact = async () => {
    try {
      const { mobile } = await revealMatrimonyContact(userId);
      Alert.alert("Contact", mobile ? `Mobile: ${mobile}` : "No mobile on file.");
    } catch (e) {
      Alert.alert("Contact", e instanceof Error ? e.message : "Available after mutual match.");
    }
  };

  if (loading || !profile) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const uri = profile.photoUrl ? getImageUrl(profile.photoUrl) ?? profile.photoUrl : null;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}
      contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxxl }}
    >
      {uri ? (
        <Image source={{ uri }} style={styles.hero} />
      ) : null}
      <Text style={[styles.name, { color: colors.text }]}>
        {profile.name}
        {profile.age != null ? `, ${profile.age}` : ""}
      </Text>
      {profile.familyManaged && (
        <Text style={[styles.familyTag, { color: colors.textSecondary }]}>Family managed profile</Text>
      )}
      <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
        {[profile.district, profile.occupation, profile.education].filter(Boolean).join(" · ")}
      </Text>
      {profile.horoscopeAvailable && !profile.horoscopeVisible && (
        <Text style={styles.horoscopeBadge}>Horoscope available</Text>
      )}
      {profile.aboutMe ? (
        <Text style={[styles.about, { color: colors.text }]}>{profile.aboutMe}</Text>
      ) : null}

      {profile.canRespondInterest && (routeInterestId ?? profile.pendingInterestId) ? (
        <View style={styles.actions}>
          <PrimaryButton title="Accept interest" onPress={() => onRespond("ACCEPT")} loading={acting} />
          <PrimaryButton
            title="Decline"
            variant="outline"
            onPress={() => onRespond("DECLINE")}
            disabled={acting}
            style={{ marginTop: 8 }}
          />
        </View>
      ) : null}

      {profile.canSendInterest ? (
        <PrimaryButton title="Send interest" onPress={onSendInterest} loading={acting} style={{ marginTop: spacing.md }} />
      ) : null}

      {profile.mutualMatch && (
        <View style={styles.matchBox}>
          <Text style={{ fontWeight: "800", color: "#14532D" }}>Mutual match</Text>
          {profile.chatEnabled && (
            <PrimaryButton
              title="Open chat"
              style={{ marginTop: 8 }}
              onPress={() =>
                navigation.navigate("Chat", {
                  otherUserId: userId,
                  name: profile.name,
                  profileImage: profile.photoUrl
                })
              }
            />
          )}
          {profile.horoscopeVisible && (
            <PrimaryButton title="View horoscope" variant="outline" onPress={openHoroscope} style={{ marginTop: 8 }} />
          )}
          <PrimaryButton title="Reveal contact" variant="outline" onPress={showContact} style={{ marginTop: 8 }} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hero: { width: "100%", height: 280, borderRadius: radius.lg, marginBottom: spacing.md },
  name: { fontSize: 22, fontWeight: "800" },
  familyTag: { fontSize: 12, fontStyle: "italic", marginTop: 4 },
  horoscopeBadge: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "700",
    color: "#7C3AED"
  },
  about: { marginTop: spacing.md, lineHeight: 22, fontSize: 15 },
  actions: { marginTop: spacing.lg },
  matchBox: {
    marginTop: spacing.lg,
    padding: spacing.md,
    backgroundColor: "#DCFCE7",
    borderRadius: radius.md
  }
});
