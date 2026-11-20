import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Image,
  useWindowDimensions,
  Platform,
  StatusBar,
  BackHandler
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Image as ExpoImage } from "expo-image";
import { useFocusEffect } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { getLandingContact, getLandingContent, type LandingContact } from "../../api/landing.api";
import { LandingContactPopup } from "../../components/landing/LandingContactPopup";
import { fonts } from "../../theme/fonts";
import { appAlert } from "../../utils/appAlert";
import { consumeApprovalReauthMessage } from "../../auth/approvalReauth";

const H_PAD = 16;
const CARD_GAP = 10;
const BODY_MAX_WIDTH = 560;

const LOGO = require("../../../assets/logo_digital_house.png");
const SCENERY = require("../../../assets/landing_scenery.jpg");
const COMMUNITY_ART = require("../../../assets/landing_background.png");

function entranceStyle(progress: Animated.Value) {
  return {
    opacity: progress.interpolate({ inputRange: [0, 1], outputRange: [0.15, 1] }),
    transform: [
      { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }) }
    ]
  };
}

const GREEN = "#14563F";
const GREEN_BRIGHT = "#1C6C50";
const GREEN_DEEP = "#163E31";
const CARD_SHADOW = "#0B3D1E";

const FALLBACK_HEADLINE =
  "கல்வெட்டுகளில் நின்ற வீரம்... இனி கணிப்பொறி உலகிலும் வெல்லும்!";

function headlineLines(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  const ellipsis = normalized.includes("...") ? "..." : normalized.includes("…") ? "…" : null;
  if (ellipsis) {
    const split = normalized.indexOf(ellipsis) + ellipsis.length;
    const first = normalized.slice(0, split).trim();
    const second = normalized.slice(split).trim();
    if (first && second) return [first, second];
  }
  const midpoint = normalized.length / 2;
  const spaces = [...normalized.matchAll(/ /g)].map((match) => match.index);
  const split = spaces.reduce(
    (closest, space) => Math.abs(space - midpoint) < Math.abs(closest - midpoint) ? space : closest,
    0
  );
  return split ? [normalized.slice(0, split), normalized.slice(split + 1)] : [normalized];
}

const FEATURES: {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  color: string;
  tint: string;
  title: string;
  subtitle: string;
}[] = [
  { icon: "account-group", color: "#0E6B32", tint: "#DDF3E6", title: "Matrimony", subtitle: "Find your life partner" },
  { icon: "briefcase", color: "#0A4FA0", tint: "#DCEBFA", title: "Job Portal", subtitle: "Explore career opportunities" },
  { icon: "storefront", color: "#C44700", tint: "#FFE6D4", title: "Marketplace", subtitle: "Buy & Sell locally" },
  { icon: "handshake", color: "#5B2FB0", tint: "#EBE1FF", title: "Helping Hand", subtitle: "Get help, Offer help" },
  { icon: "bullhorn", color: "#D62828", tint: "#FCDDDA", title: "Community Updates", subtitle: "Stay informed" },
  { icon: "store", color: "#145C32", tint: "#DDF3E6", title: "Business Directory", subtitle: "Discover local business" }
];

export function LandingScreen({ navigation }: any) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [logoError, setLogoError] = useState(false);
  const [headline, setHeadline] = useState(FALLBACK_HEADLINE);
  const [contactOpen, setContactOpen] = useState(false);
  const [contactLoading, setContactLoading] = useState(false);
  const [contact, setContact] = useState<LandingContact | null>(null);
  const availableHeight = height - insets.top - insets.bottom;
  const tight = availableHeight < 720;
  const logoSize = Math.round(Math.min(width * 0.30, availableHeight * 0.14, tight ? 82 : 118));
  const artworkHeight = Math.round(Math.max(54, Math.min(120, availableHeight * (tight ? 0.10 : 0.15))));
  const cardWidth = Math.floor((Math.min(width, BODY_MAX_WIDTH) - H_PAD * 2 - CARD_GAP * 2) / 3);
  const topPad =
    Math.max(insets.top, Platform.OS === "android" ? (StatusBar.currentHeight ?? 0) : 0) + 4;
  const contactBtnTop = topPad;
  const popupTop = contactBtnTop + 52;
  const popupRight = H_PAD;
  const popupMaxWidth = Math.min(300, width - H_PAD * 2);

  const cardsProgress = useRef(new Animated.Value(1)).current;
  const actionsProgress = useRef(new Animated.Value(1)).current;

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const timing = {
        toValue: 1,
        duration: 460,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: Platform.OS !== "web"
      };
      const entrance = Animated.stagger(130, [
        Animated.timing(cardsProgress, timing),
        Animated.timing(actionsProgress, timing)
      ]);
      const showImmediately = () => {
        entrance.stop();
        cardsProgress.setValue(1);
        actionsProgress.setValue(1);
      };

      void AccessibilityInfo.isReduceMotionEnabled()
        .then((reducedMotion) => {
          if (!active || reducedMotion) return;
          cardsProgress.setValue(0);
          actionsProgress.setValue(0);
          entrance.start();
        })
        .catch(() => undefined);
      const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", (enabled) => {
        if (enabled) showImmediately();
      });

      return () => {
        active = false;
        subscription.remove();
        showImmediately();
      };
    }, [actionsProgress, cardsProgress])
  );

  const closeContact = useCallback(() => setContactOpen(false), []);

  const toggleContact = useCallback(() => {
    setContactOpen((open) => !open);
  }, []);

  useEffect(() => {
    const message = consumeApprovalReauthMessage();
    if (message) appAlert("Account approved", message);
  }, []);

  useEffect(() => {
    let cancelled = false;
    getLandingContent()
      .then((res) => {
        const next = res.headline?.trim();
        if (!cancelled && next) setHeadline(next);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  // Prefetch once on mount — cached; failures leave landing intact.
  useEffect(() => {
    let cancelled = false;
    setContactLoading(true);
    getLandingContact()
      .then((data) => {
        if (!cancelled) setContact(data);
      })
      .finally(() => {
        if (!cancelled) setContactLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!contactOpen) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      closeContact();
      return true;
    });
    const onKey =
      Platform.OS === "web"
        ? (e: KeyboardEvent) => {
            if (e.key === "Escape") closeContact();
          }
        : null;
    if (onKey && typeof window !== "undefined") {
      window.addEventListener("keydown", onKey);
    }
    return () => {
      sub.remove();
      if (onKey && typeof window !== "undefined") {
        window.removeEventListener("keydown", onKey);
      }
    };
  }, [contactOpen, closeContact]);

  return (
    <View style={s.root}>
      <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />
      <ExpoImage
        source={SCENERY}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        contentPosition="top center"
        accessible={false}
        pointerEvents="none"
      />
      <LinearGradient
        colors={[
          "rgba(255,248,233,0.04)",
          "rgba(255,252,245,0.70)",
          "rgba(255,252,245,0.70)",
          "rgba(228,240,229,0.28)"
        ]}
        locations={[0, 0.34, 0.54, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {contactOpen ? (
        <Pressable
          style={s.dismissOverlay}
          onPress={closeContact}
          accessibilityLabel="Dismiss contact popup"
        />
      ) : null}

      <Pressable
        style={[
          s.contactBtn,
          contactOpen && s.contactBtnActive,
          { top: contactBtnTop, right: H_PAD }
        ]}
        onPress={toggleContact}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel="Contact us"
        accessibilityState={{ expanded: contactOpen }}
      >
        <Ionicons
          name={contactOpen ? "headset" : "headset-outline"}
          size={20}
          color={contactOpen ? "#FFFFFF" : GREEN_DEEP}
        />
      </Pressable>

      <LandingContactPopup
        visible={contactOpen}
        contact={contact}
        loading={contactLoading}
        top={popupTop}
        right={popupRight}
        maxWidth={popupMaxWidth}
        onClose={closeContact}
      />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[
          s.body,
          {
            paddingTop: topPad,
            paddingBottom: Math.max(insets.bottom, 8) + 4
          }
        ]}
        showsVerticalScrollIndicator={false}
      >
        {!logoError ? (
          <Image
            source={LOGO}
            style={[s.logo, { width: logoSize, height: logoSize }]}
            resizeMode="contain"
            onError={() => setLogoError(true)}
          />
        ) : (
          <Text style={s.logoFallback}>Digital House</Text>
        )}

        <View style={s.intro}>
          <Text
            style={[s.titleSecond, tight && s.titleTight]}
            numberOfLines={1}
            adjustsFontSizeToFit
            allowFontScaling={false}
          >
            Digital House
          </Text>

          <View style={s.headlineBlock}>
            {headlineLines(headline).map((line, index) => (
              <Text
                key={index}
                style={[s.headline, tight && s.headlineTight]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.65}
              >
                {line}
              </Text>
            ))}
          </View>

          <Text style={s.subtitle} allowFontScaling={false}>
            Private community for verified members
          </Text>
          <Text style={[s.script, tight && s.scriptTight]} allowFontScaling={false}>
            Connect  •  Share  •  Grow Together
          </Text>
        </View>

        <View style={[s.artwork, { height: artworkHeight }]}>
          <ExpoImage
            source={COMMUNITY_ART}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            contentPosition={{ left: "50%", top: "59%" }}
            accessible={false}
          />
        </View>

        <Animated.View style={[s.grid, entranceStyle(cardsProgress)]}>
          {FEATURES.map((item) => (
            <View key={item.title} style={[s.card, { width: cardWidth }, tight && s.cardTight]}>
              <View style={[s.iconBubble, tight && s.iconTight, { backgroundColor: item.tint }]}>
                <MaterialCommunityIcons name={item.icon} size={tight ? 18 : 20} color={item.color} />
              </View>
              <Text style={s.cardTitle} numberOfLines={2} allowFontScaling={false}>
                {item.title}
              </Text>
              <Text style={s.cardSub} numberOfLines={2} allowFontScaling={false}>
                {item.subtitle}
              </Text>
            </View>
          ))}
        </Animated.View>

        <Animated.View style={[s.actions, entranceStyle(actionsProgress)]}>
          <Pressable
            style={({ pressed }) => [s.primaryBtnWrap, pressed && s.pressed]}
            onPress={() => navigation.navigate("Registration")}
            accessibilityRole="button"
            accessibilityLabel="Get Started"
          >
            <LinearGradient
              colors={[GREEN_BRIGHT, GREEN]}
              start={{ x: 0.5, y: 0 }}
              end={{ x: 0.5, y: 1 }}
              style={s.primaryBtn}
            >
              <Text style={s.primaryBtnText} allowFontScaling={false}>
                Get Started
              </Text>
              <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
            </LinearGradient>
          </Pressable>

          <Pressable
            style={({ pressed }) => [s.secondaryBtn, pressed && s.pressed]}
            onPress={() => navigation.navigate("Login")}
            accessibilityRole="button"
            accessibilityLabel="Sign in to your account"
          >
            <Ionicons name="person" size={16} color={GREEN_DEEP} />
            <Text style={s.secondaryBtnText} allowFontScaling={false}>
              Sign in to your account
            </Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#FCF8EF" },
  dismissOverlay: {
    ...StyleSheet.absoluteFill,
    zIndex: 30
  },
  contactBtn: {
    position: "absolute",
    zIndex: 35,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderWidth: 1,
    borderColor: "rgba(0,77,44,0.14)",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: CARD_SHADOW,
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3
  },
  contactBtnActive: {
    backgroundColor: GREEN_DEEP,
    borderColor: GREEN_DEEP,
    shadowOpacity: 0.28
  },
  scroll: { flex: 1 },
  body: {
    flexGrow: 1,
    alignSelf: "center",
    width: "100%",
    maxWidth: BODY_MAX_WIDTH,
    paddingHorizontal: H_PAD,
    alignItems: "center",
    justifyContent: "center"
  },
  logo: {
    marginTop: 0
  },
  logoFallback: {
    marginTop: 24,
    fontFamily: fonts.bold,
    fontSize: 20,
    color: GREEN_DEEP,
    fontWeight: "700"
  },
  intro: {
    width: "100%",
    maxWidth: 420,
    paddingHorizontal: 12,
    paddingTop: 2
  },
  titleSecond: {
    marginTop: 2,
    fontFamily: fonts.bold,
    fontSize: 30,
    lineHeight: 36,
    color: GREEN_DEEP,
    fontWeight: "700",
    textAlign: "center"
  },
  titleTight: { fontSize: 24, lineHeight: 30 },
  headlineBlock: { width: "100%", marginTop: 8, paddingHorizontal: 4 },
  headline: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    lineHeight: 21,
    color: GREEN_DEEP,
    textAlign: "center",
    fontWeight: "600"
  },
  headlineTight: { fontSize: 12, lineHeight: 18 },
  subtitle: {
    marginTop: 4,
    fontFamily: fonts.semiBold,
    fontSize: 13,
    color: "#263B34",
    textAlign: "center",
    fontWeight: "600"
  },
  script: {
    marginTop: 2,
    marginBottom: 4,
    fontFamily: fonts.semiBold,
    fontSize: 14,
    fontStyle: "italic",
    color: GREEN_DEEP,
    textAlign: "center",
    fontWeight: "600"
  },
  scriptTight: { fontSize: 12, marginBottom: 2 },
  artwork: {
    width: "100%",
    marginTop: 10,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#F5EBD7"
  },
  grid: {
    marginTop: 8,
    marginBottom: 10,
    width: "100%",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: CARD_GAP,
    justifyContent: "center"
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 4,
    alignItems: "center",
    shadowColor: CARD_SHADOW,
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(0,77,44,0.1)"
  },
  cardTight: { paddingVertical: 6 },
  iconBubble: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 5
  },
  iconTight: { width: 28, height: 28, marginBottom: 2 },
  cardTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    lineHeight: 15,
    color: "#0F172A",
    textAlign: "center",
    fontWeight: "700"
  },
  cardSub: {
    marginTop: 3,
    fontFamily: fonts.medium,
    fontSize: 10,
    lineHeight: 13,
    color: "#4B5563",
    textAlign: "center",
    fontWeight: "500"
  },
  actions: { width: "100%" },
  primaryBtnWrap: {
    width: "100%",
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: GREEN_DEEP,
    shadowOpacity: 0.32,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4
  },
  primaryBtn: {
    minHeight: 48,
    borderRadius: 28,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 18
  },
  primaryBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "700"
  },
  secondaryBtn: {
    width: "100%",
    minHeight: 44,
    marginTop: 6,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(0,77,44,0.25)",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8
  },
  secondaryBtnText: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    color: GREEN_DEEP,
    fontWeight: "700"
  },
  pressed: { opacity: 0.85 }
});
