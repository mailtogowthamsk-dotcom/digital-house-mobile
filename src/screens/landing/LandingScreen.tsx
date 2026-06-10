import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Image,
  ActivityIndicator,
  Dimensions,
  Platform,
  StatusBar,
  Animated,
  Easing
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import Ionicons from "@expo/vector-icons/Ionicons";
import { getLandingContent } from "../../api/landing.api";
import { spacing, radius } from "../../theme/spacing";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const STATUS_BAR = Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 44;

const LOGO = require("../../../assets/logo_digital_house.png");
const LANDING_BG = require("../../../assets/landing_background.png");
const LANDING_GRADIENT = ["#070B14", "#0B1220", "#111827", "#0B1220"] as const;

const FEATURES = [
  { icon: "people-outline" as const, label: "Verified community" },
  { icon: "heart-outline" as const, label: "Matrimony" },
  { icon: "chatbubbles-outline" as const, label: "Private messaging" }
];

function useLandingEntrance() {
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.9)).current;
  const logoY = useRef(new Animated.Value(-12)).current;
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heroY = useRef(new Animated.Value(28)).current;
  const actionsOpacity = useRef(new Animated.Value(0)).current;
  const actionsY = useRef(new Animated.Value(22)).current;
  const bgScale = useRef(new Animated.Value(1.06)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(bgScale, {
        toValue: 1,
        duration: 900,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.stagger(110, [
        Animated.parallel([
          Animated.timing(logoOpacity, {
            toValue: 1,
            duration: 520,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true
          }),
          Animated.spring(logoScale, {
            toValue: 1,
            friction: 7,
            tension: 90,
            useNativeDriver: true
          }),
          Animated.timing(logoY, {
            toValue: 0,
            duration: 520,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true
          })
        ]),
        Animated.parallel([
          Animated.timing(heroOpacity, {
            toValue: 1,
            duration: 480,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true
          }),
          Animated.timing(heroY, {
            toValue: 0,
            duration: 480,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true
          })
        ]),
        Animated.parallel([
          Animated.timing(actionsOpacity, {
            toValue: 1,
            duration: 420,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true
          }),
          Animated.timing(actionsY, {
            toValue: 0,
            duration: 420,
            easing: Easing.out(Easing.cubic),
            useNativeDriver: true
          })
        ])
      ])
    ]).start();
  }, [
    actionsOpacity,
    actionsY,
    bgScale,
    heroOpacity,
    heroY,
    logoOpacity,
    logoScale,
    logoY
  ]);

  return {
    logoOpacity,
    logoScale,
    logoY,
    heroOpacity,
    heroY,
    actionsOpacity,
    actionsY,
    bgScale
  };
}

export function LandingScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const [headline, setHeadline] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoError, setLogoError] = useState(false);
  const anim = useLandingEntrance();

  useEffect(() => {
    getLandingContent()
      .then((res) => setHeadline(res.headline))
      .catch(() => setHeadline("Connecting Our Community"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <View style={s.root}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <LinearGradient colors={LANDING_GRADIENT} style={StyleSheet.absoluteFill} />
      <Animated.View
        style={[StyleSheet.absoluteFill, { transform: [{ scale: anim.bgScale }] }]}
        pointerEvents="none"
      >
        <Image source={LANDING_BG} style={s.bgImage} resizeMode="cover" />
      </Animated.View>
      <LinearGradient
        colors={["rgba(7,11,20,0.55)", "rgba(7,11,20,0.2)", "rgba(7,11,20,0.92)"]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View
        style={[
          s.content,
          {
            paddingTop: Math.max(STATUS_BAR + 8, insets.top + 4),
            paddingBottom: insets.bottom + spacing.xl
          }
        ]}
      >
        <View style={s.upperBlock}>
          <Animated.View
            style={[
              s.brandBlock,
              {
                opacity: anim.logoOpacity,
                transform: [{ translateY: anim.logoY }, { scale: anim.logoScale }]
              }
            ]}
          >
            {!logoError ? (
              <Image
                source={LOGO}
                style={s.logo}
                resizeMode="contain"
                onError={() => setLogoError(true)}
              />
            ) : (
              <Text style={s.logoFallback}>Digital House</Text>
            )}
            <Text style={s.wordmark}>Digital House</Text>
            <Text style={s.tagline}>Private community for verified members</Text>
          </Animated.View>

          <Animated.View
            style={[
              s.heroCard,
              {
                opacity: anim.heroOpacity,
                transform: [{ translateY: anim.heroY }]
              }
            ]}
          >
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
              Share updates, connect with members, and explore matrimony — all in one trusted space.
            </Text>

            <View style={s.featureRow}>
              {FEATURES.map((f) => (
                <View key={f.label} style={s.featureChip}>
                  <Ionicons name={f.icon} size={14} color="#FBBF24" />
                  <Text style={s.featureText}>{f.label}</Text>
                </View>
              ))}
            </View>
          </Animated.View>
        </View>

        <Animated.View
          style={[
            s.actions,
            {
              opacity: anim.actionsOpacity,
              transform: [{ translateY: anim.actionsY }]
            }
          ]}
        >
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

          <Pressable
            style={({ pressed }) => [s.secondaryBtn, pressed && s.btnPressed]}
            onPress={() => navigation.navigate("Login")}
          >
            <Text style={s.secondaryBtnText}>Sign in to your account</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    width: SCREEN_WIDTH,
    minHeight: SCREEN_HEIGHT,
    backgroundColor: "#070B14"
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.42
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    justifyContent: "space-between"
  },
  upperBlock: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    maxWidth: 360,
    alignSelf: "center",
    paddingBottom: spacing.lg
  },
  brandBlock: {
    alignItems: "center",
    width: "100%"
  },
  logo: {
    width: Math.min(SCREEN_WIDTH * 0.72, 300),
    height: Math.min(SCREEN_HEIGHT * 0.2, 108),
    minWidth: 200,
    minHeight: 72
  },
  logoFallback: {
    fontSize: 20,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.4
  },
  wordmark: {
    marginTop: spacing.md,
    fontSize: 17,
    fontWeight: "700",
    color: "rgba(255,255,255,0.95)",
    letterSpacing: 2
  },
  tagline: {
    marginTop: spacing.xs,
    fontSize: 13,
    color: "rgba(255,255,255,0.62)",
    letterSpacing: 0.3,
    textAlign: "center"
  },
  heroCard: {
    alignItems: "center",
    marginTop: spacing.xl,
    width: "100%"
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255,255,255,0.55)",
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginBottom: spacing.sm
  },
  headlineBlock: {
    minHeight: 56,
    justifyContent: "center",
    marginBottom: spacing.sm
  },
  headline: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    textAlign: "center",
    lineHeight: 34,
    letterSpacing: 0.2,
    maxWidth: 320
  },
  subline: {
    fontSize: 15,
    color: "rgba(255,255,255,0.78)",
    textAlign: "center",
    lineHeight: 22,
    maxWidth: 300
  },
  featureRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: spacing.sm,
    marginTop: spacing.lg
  },
  featureChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)"
  },
  featureText: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.88)"
  },
  actions: {
    width: "100%",
    maxWidth: 360,
    alignSelf: "center",
    alignItems: "stretch",
    paddingTop: spacing.md
  },
  primaryBtnWrap: {
    borderRadius: radius.md,
    overflow: "hidden",
    shadowColor: "#EA580C",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8
  },
  btnPressed: { opacity: 0.92 },
  primaryBtn: {
    paddingVertical: 17,
    paddingHorizontal: spacing.xxxl,
    alignItems: "center",
    justifyContent: "center"
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.3
  },
  secondaryBtn: {
    marginTop: spacing.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    backgroundColor: "rgba(255,255,255,0.06)"
  },
  secondaryBtnText: {
    fontSize: 15,
    color: "rgba(255,255,255,0.95)",
    fontWeight: "700"
  }
});
