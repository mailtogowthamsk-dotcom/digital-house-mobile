import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Linking,
  AccessibilityInfo,
  Platform,
  ActivityIndicator
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { fonts } from "../../theme/fonts";
import type { LandingContact } from "../../api/landing.api";
import { appAlert } from "../../utils/appAlert";

const GREEN_DEEP = "#004D2C";
const GREEN = "#117A3A";
const GREEN_SOFT = "#EAF7EF";

type Props = {
  visible: boolean;
  contact: LandingContact | null;
  loading: boolean;
  top: number;
  right: number;
  maxWidth: number;
  onClose: () => void;
};

function formatMobile(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) {
    return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  }
  if (digits.length === 12 && digits.startsWith("91")) {
    return `+91 ${digits.slice(2, 7)} ${digits.slice(7)}`;
  }
  return raw.trim();
}

export function LandingContactPopup({
  visible,
  contact,
  loading,
  top,
  right,
  maxWidth,
  onClose
}: Props) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-10)).current;
  const scale = useRef(new Animated.Value(0.96)).current;
  const reduceMotionRef = useRef(false);

  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      reduceMotionRef.current = v;
    });
    const sub = AccessibilityInfo.addEventListener?.("reduceMotionChanged", (v: boolean) => {
      reduceMotionRef.current = v;
    });
    return () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (sub as any)?.remove?.();
    };
  }, []);

  useEffect(() => {
    const duration = reduceMotionRef.current ? 0 : 240;
    if (visible) {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 0, duration, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration, useNativeDriver: true })
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -10, duration, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.96, duration, useNativeDriver: true })
      ]).start();
    }
  }, [visible, opacity, translateY, scale]);

  if (!visible) return null;

  const openMail = () => {
    if (!contact?.email) return;
    void Linking.openURL(`mailto:${contact.email}`);
  };

  const openWhatsApp = () => {
    if (!contact?.mobile) return;
    const digits = contact.mobile.replace(/\D/g, "");
    if (!digits) return;
    void Linking.openURL(`https://wa.me/${digits}`).catch(() => {
      void appAlert("WhatsApp", "Unable to open WhatsApp. Please try again.");
    });
  };

  return (
    <Animated.View
      style={[
        s.popup,
        {
          top,
          right,
          width: Math.min(maxWidth, 280),
          maxWidth,
          opacity,
          transform: [{ translateY }, { scale }]
        }
      ]}
      accessibilityViewIsModal
      accessibilityLabel="Contact details"
    >
      <View style={s.caretWrap} pointerEvents="none">
        <View style={s.caret} />
      </View>

      <View style={s.header}>
        <View style={s.headerLeft}>
          <View style={s.headerBadge}>
            <Ionicons name="headset" size={14} color={GREEN} />
          </View>
          <View>
            <Text style={s.headerTitle}>Contact us</Text>
            <Text style={s.headerSub}>We’re happy to help</Text>
          </View>
        </View>
        <Pressable
          onPress={onClose}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Close contact details"
          style={({ pressed }) => [s.closeBtn, pressed && { opacity: 0.7 }]}
        >
          <Ionicons name="close" size={16} color={GREEN_DEEP} />
        </Pressable>
      </View>

      <View style={s.divider} />

      {loading ? (
        <View style={s.loadingBox}>
          <ActivityIndicator size="small" color={GREEN} />
          <Text style={s.muted}>Fetching contact…</Text>
        </View>
      ) : !contact ? (
        <Text style={s.muted}>Contact details unavailable right now.</Text>
      ) : (
        <View style={s.rows}>
          <Pressable
            onPress={openMail}
            style={({ pressed }) => [s.row, pressed && s.rowPressed]}
            accessibilityRole="link"
            accessibilityLabel={`Email ${contact.email}`}
          >
            <View style={[s.iconWrap, { backgroundColor: GREEN_SOFT }]}>
              <Ionicons name="mail" size={17} color={GREEN} />
            </View>
            <View style={s.rowText}>
              <Text style={s.label}>Email</Text>
              <Text style={s.value} selectable numberOfLines={1}>
                {contact.email}
              </Text>
            </View>
            <Ionicons name="open-outline" size={15} color="#9CA3AF" />
          </Pressable>

          <Pressable
            onPress={openWhatsApp}
            style={({ pressed }) => [s.row, pressed && s.rowPressed]}
            accessibilityRole="link"
            accessibilityLabel={`Open WhatsApp chat with ${contact.mobile}`}
          >
            <View style={[s.iconWrap, { backgroundColor: "#E8F1FB" }]}>
              <Ionicons name="logo-whatsapp" size={17} color={GREEN} />
            </View>
            <View style={s.rowText}>
              <Text style={s.label}>WhatsApp</Text>
              <Text style={s.value} selectable numberOfLines={1}>
                {formatMobile(contact.mobile)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color="#9CA3AF" />
          </Pressable>
        </View>
      )}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  popup: {
    position: "absolute",
    zIndex: 40,
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(0,77,44,0.1)",
    shadowColor: "#004D2C",
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
    ...Platform.select({
      web: { boxShadow: "0 12px 28px rgba(0,77,44,0.16)" } as object,
      default: {}
    })
  },
  caretWrap: {
    position: "absolute",
    top: -7,
    right: 14,
    width: 14,
    height: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  caret: {
    width: 12,
    height: 12,
    backgroundColor: "#FFFFFF",
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: "rgba(0,77,44,0.1)",
    transform: [{ rotate: "45deg" }]
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    paddingHorizontal: 2
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
    minWidth: 0
  },
  headerBadge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: GREEN_SOFT,
    alignItems: "center",
    justifyContent: "center"
  },
  headerTitle: {
    fontFamily: fonts.semiBold,
    fontSize: 14,
    fontWeight: "700",
    color: GREEN_DEEP
  },
  headerSub: {
    marginTop: 1,
    fontFamily: fonts.regular,
    fontSize: 11,
    color: "#6B7280"
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GREEN_SOFT,
    borderWidth: 1,
    borderColor: "rgba(0,77,44,0.08)"
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(0,77,44,0.1)",
    marginBottom: 10
  },
  loadingBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 4
  },
  muted: {
    fontFamily: fonts.regular,
    fontSize: 12,
    color: "#6B7280",
    paddingVertical: 8,
    paddingHorizontal: 4
  },
  rows: { gap: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 14,
    backgroundColor: "#F8FAF9",
    borderWidth: 1,
    borderColor: "rgba(0,77,44,0.06)"
  },
  rowPressed: {
    backgroundColor: GREEN_SOFT,
    borderColor: "rgba(17,122,58,0.18)"
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center"
  },
  rowText: { flex: 1, minWidth: 0 },
  label: {
    fontFamily: fonts.medium,
    fontSize: 11,
    color: "#6B7280",
    marginBottom: 2,
    letterSpacing: 0.2
  },
  value: {
    fontFamily: fonts.semiBold,
    fontSize: 12,
    color: "#0F172A",
    fontWeight: "600"
  }
});
