import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ActivityIndicator,
  Dimensions,
  Platform,
  StatusBar
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { getLandingContent } from "../../api/landing.api";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const STATUS_BAR = Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 44;

const LOGO = require("../../../assets/logo_digital_house.png");
const LANDING_GRADIENT = ["#0B1220", "#1a2744", "#0d1829"];

export function LandingScreen({ navigation }: any) {
  const [headline, setHeadline] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLandingContent()
      .then((res) => setHeadline(res.headline))
      .catch(() => setHeadline("Connecting Our Community"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <View style={s.background}>
      <LinearGradient colors={LANDING_GRADIENT} style={StyleSheet.absoluteFill} />
      <View style={s.overlay} />

      {/* Logo at top */}
      <View style={s.logoContainer}>
        <Image source={LOGO} style={s.logo} resizeMode="contain" />
      </View>

      {/* Content over the image: tagline, button, sign in */}
      <View style={s.content}>
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.35)"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={s.taglineRow}>
          <Text style={s.dash}>—</Text>
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={s.tagline} numberOfLines={2}>
              {headline ?? "Connecting Our Community"}
            </Text>
          )}
          <Text style={s.dash}>—</Text>
        </View>

        <Pressable
          style={({ pressed }) => [s.btnWrap, pressed && s.btnPressed]}
          onPress={() => navigation.navigate("Registration")}
        >
          <LinearGradient
            colors={["#E85D04", "#F48C06", "#FBBF24"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.getStartedBtn}
          >
            <Text style={s.getStartedText}>Get Started</Text>
          </LinearGradient>
        </Pressable>

        <Pressable
          style={({ pressed }) => [s.signInWrap, pressed && { opacity: 0.8 }]}
          onPress={() => navigation.navigate("Login")}
        >
          <Text style={s.signInText}>Already have an account? Sign in</Text>
        </Pressable>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  background: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: "space-between"
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.08)"
  },
  logoContainer: {
    paddingTop: STATUS_BAR + 16,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center"
  },
  logo: {
    width: Math.min(SCREEN_WIDTH * 0.55, 220),
    height: Math.min(SCREEN_HEIGHT * 0.2, 88)
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: Platform.OS === "ios" ? 40 : 32,
    alignItems: "center",
    position: "relative",
    overflow: "hidden"
  },
  taglineRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
    paddingHorizontal: 8
  },
  dash: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    marginHorizontal: 8
  },
  tagline: {
    fontSize: 17,
    color: "#fff",
    fontWeight: "600",
    textAlign: "center",
    maxWidth: 300
  },
  btnWrap: {
    width: "100%",
    maxWidth: 280,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6
  },
  btnPressed: { opacity: 0.9 },
  getStartedBtn: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center"
  },
  getStartedText: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF"
  },
  signInWrap: {
    alignItems: "center"
  },
  signInText: {
    fontSize: 15,
    color: "rgba(255,255,255,0.95)",
    fontWeight: "600"
  }
});
