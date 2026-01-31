import React from "react";
import { View, Text, StyleSheet, Pressable, ImageBackground, Image, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { spacing } from "../../theme/spacing";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const LANDING_BACKGROUND = require("../../../assets/landing-background.png");
const LOGO = require("../../../assets/logo-digital-house.png");

export function PendingApprovalScreen({ navigation }: any) {
  return (
    <ImageBackground source={LANDING_BACKGROUND} style={s.background} resizeMode="cover">
      <View style={s.overlay} />
      <View style={s.content}>
        <Image source={LOGO} style={s.logo} resizeMode="contain" />
        <View style={s.card}>
          <Text style={s.title}>Verification in progress</Text>
          <Text style={s.subtitle}>
            Your registration is under admin verification (1–2 days). We’ll notify you once your
            account is approved. Thank you for joining our community!
          </Text>
          <Pressable
            style={({ pressed }) => [s.btnWrap, pressed && { opacity: 0.9 }]}
            onPress={() => navigation.navigate("Landing")}
          >
            <LinearGradient
              colors={["#2563EB", "#F97316"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.btn}
            >
              <Text style={s.btnText}>Back to home</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    </ImageBackground>
  );
}

const s = StyleSheet.create({
  background: { flex: 1 },
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.2)" },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: 60,
    alignItems: "center"
  },
  logo: {
    width: Math.min(SCREEN_WIDTH * 0.4, 160),
    height: 80,
    marginBottom: spacing.xl
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: spacing.xxl,
    width: "100%",
    maxWidth: 360,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6
  },
  title: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: spacing.lg,
    textAlign: "center"
  },
  subtitle: {
    fontSize: 15,
    color: "#6B7280",
    lineHeight: 22,
    textAlign: "center",
    marginBottom: spacing.xxl
  },
  btnWrap: { width: "100%" },
  btn: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  btnText: { fontSize: 17, fontWeight: "600", color: "#FFFFFF" }
});
