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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { getLandingContent } from "../../api/landing.api";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const STATUS_BAR = Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 44;

const LOGO = require("../../../assets/logo_digital_house.png");
const LANDING_BG = require("../../../assets/landing_background.png");
const LANDING_GRADIENT = ["#0B1220", "#0f172a", "#1e293b", "#0f172a"] as const;

export function LandingScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [headline, setHeadline] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    getLandingContent()
      .then((res) => setHeadline(res.headline))
      .catch(() => setHeadline("Connecting Our Community"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <View style={s.background}>
      <LinearGradient colors={LANDING_GRADIENT} style={StyleSheet.absoluteFill} />
      <Image source={LANDING_BG} style={s.bgImage} resizeMode="cover" />
      <View style={s.overlay} />
      <LinearGradient
        colors={["rgba(17, 19, 48, 0.4)", "transparent", "rgba(7, 14, 19, 0.85)"]}
      />

      <View style={[s.logoContainer, { paddingTop: Math.max(STATUS_BAR + 20, insets.top + 16) }]}>
        <View style={s.logoCard}>
          {!logoError ? (
            <Image
              source={LOGO}
              style={s.logo}
              resizeMode="contain"
              onError={() => setLogoError(true)}
              onLoad={() => setLogoError(false)}
            />
          ) : (
            <Text style={s.logoFallback}>Digital House</Text>
          )}
        </View>
        {!logoError && <Text style={s.logoWordmark}>Digital House</Text>}
      </View>

      <View style={[s.contentCenter, { paddingBottom: insets.bottom + 100 }]}>
        <View style={s.content}>
          <Text style={s.label}>Welcome</Text>
          <View style={s.headlineBlock}>
            {loading ? (
              <ActivityIndicator size="small" color="rgba(255,255,255,0.9)" />
            ) : (
              <Text style={s.headline} numberOfLines={2}>
                {headline ?? "Connecting Our Community"}
              </Text>
            )}
          </View>
          <Text style={s.subline}>
            Join your community. Share, connect, and stay in touch.
          </Text>

          <View style={s.actions}>
            <Pressable
              style={({ pressed }) => [s.primaryBtnWrap, pressed && s.btnPressed]}
              onPress={() => navigation.navigate("Registration")}
            >
              <LinearGradient
                colors={["#EA580C", "#F59E0B", "#FBBF24"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.primaryBtn}
              >
                <Text style={s.primaryBtnText}>Get Started</Text>
              </LinearGradient>
            </Pressable>

            <View style={s.dividerRow}>
              <View style={s.dividerLine} />
              <Text style={s.dividerText}>or</Text>
              <View style={s.dividerLine} />
            </View>

            <Pressable
              style={({ pressed }) => [s.secondaryBtn, pressed && s.btnPressed]}
              onPress={() => navigation.navigate("Login")}
            >
              <Text style={s.secondaryBtnText}>Sign in to your account</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  background: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.5
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(15,23,42,0.25)"
  },
  logoContainer: {
    paddingHorizontal: 40,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 120
  },
  logoCard: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 20,
    paddingVertical: 24,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 4
  },
  logo: {
    width: Math.min(SCREEN_WIDTH * 0.42, 180),
    height: Math.min(SCREEN_HEIGHT * 0.14, 64),
    minWidth: 100,
    minHeight: 40
  },
  logoFallback: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.5
  },
  logoWordmark: {
    marginTop: 14,
    fontSize: 15,
    fontWeight: "600",
    color: "rgba(255,255,255,0.9)",
    letterSpacing: 1.8
  },
  contentCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28
  },
  content: {
    alignItems: "center",
    width: "100%",
    maxWidth: 340
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.6)",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    marginBottom: 12
  },
  headlineBlock: {
    minHeight: 52,
    justifyContent: "center",
    marginBottom: 12
  },
  headline: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 32,
    letterSpacing: 0.3,
    maxWidth: 300
  },
  subline: {
    fontSize: 15,
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 36,
    maxWidth: 280
  },
  actions: {
    width: "100%",
    alignItems: "center"
  },
  primaryBtnWrap: {
    width: "100%",
    maxWidth: 300,
    borderRadius: 14,
    overflow: "hidden",
    shadowColor: "#EA580C",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8
  },
  btnPressed: { opacity: 0.92 },
  primaryBtn: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center"
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 20,
    width: "100%",
    maxWidth: 260
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.2)"
  },
  dividerText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.5)",
    marginHorizontal: 14,
    fontWeight: "500"
  },
  secondaryBtn: {
    paddingVertical: 14,
    paddingHorizontal: 24
  },
  secondaryBtnText: {
    fontSize: 16,
    color: "rgba(255,255,255,0.95)",
    fontWeight: "600"
  }
});
