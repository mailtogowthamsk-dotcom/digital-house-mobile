import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  Animated,
  Dimensions,
  Platform
} from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const POPUP_MAX_WIDTH = Math.min(SCREEN_WIDTH - 32, 340);

// Digital House brand gradient
const BLUE = "#2563EB";
const ORANGE = "#F97316";
const BG_SOFT = "#F9FAFB";
const TEXT_PRIMARY = "#111827";
const TEXT_SECONDARY = "#6B7280";
const RESIGN_COLOR = "#EF4444";

type ResignationConfirmModalProps = {
  visible: boolean;
  onStay: () => void;
  onResign: () => void;
  onDismiss?: () => void;
};

export function ResignationConfirmModal({
  visible,
  onStay,
  onResign,
  onDismiss
}: ResignationConfirmModalProps) {
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(scale, {
          toValue: 1,
          useNativeDriver: true,
          friction: 8,
          tension: 100
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true
        })
      ]).start();
    } else {
      scale.setValue(0.9);
      opacity.setValue(0);
    }
  }, [visible, scale, opacity]);

  const handleBackdropPress = () => {
    onDismiss?.();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <Pressable style={s.backdrop} onPress={handleBackdropPress}>
        {Platform.OS === "ios" ? (
          <BlurView intensity={40} tint="light" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, s.backdropFallback]} />
        )}
        <Pressable style={s.centered} onPress={(e) => e.stopPropagation()}>
          <Animated.View
            style={[
              s.popup,
              {
                opacity,
                transform: [{ scale }]
              }
            ]}
          >
            {/* Optional soft icon – minimal house / community, gradient */}
            <View style={s.iconWrap}>
              <LinearGradient
                colors={[BLUE, ORANGE]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.iconGradient}
              >
                <Text style={s.iconText}>🏠</Text>
              </LinearGradient>
            </View>

            <Text style={s.title}>Are you sure you want to leave Digital House?</Text>
            <Text style={s.subtitle}>
              Your community connections, messages, and contributions are valuable to us. You can
              always come back anytime.
            </Text>

            <View style={s.buttons}>
              <Pressable
                style={({ pressed }) => [s.btnPrimaryWrap, pressed && s.btnPressed]}
                onPress={onStay}
              >
                <LinearGradient
                  colors={[BLUE, ORANGE]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={s.btnPrimary}
                >
                  <Text style={s.btnPrimaryText}>Stay with Digital House</Text>
                </LinearGradient>
              </Pressable>
              <Pressable
                style={({ pressed }) => [s.btnSecondary, pressed && s.btnPressed]}
                onPress={onResign}
              >
                <Text style={s.btnSecondaryText}>Resign</Text>
              </Pressable>
            </View>
          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  backdropFallback: {
    backgroundColor: "rgba(0,0,0,0.4)"
  },
  centered: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: 16
  },
  popup: {
    width: "100%",
    maxWidth: POPUP_MAX_WIDTH,
    backgroundColor: BG_SOFT,
    borderRadius: 18,
    paddingVertical: 24,
    paddingHorizontal: 22,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 24,
    elevation: 12
  },
  iconWrap: {
    marginBottom: 16
  },
  iconGradient: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center"
  },
  iconText: {
    fontSize: 24
  },
  title: {
    fontSize: 19,
    fontWeight: "600",
    color: TEXT_PRIMARY,
    textAlign: "center",
    marginBottom: 12,
    paddingHorizontal: 4
  },
  subtitle: {
    fontSize: 15,
    fontWeight: "400",
    color: TEXT_SECONDARY,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 4
  },
  buttons: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    width: "100%"
  },
  btnPrimaryWrap: {
    flex: 1,
    minWidth: 0
  },
  btnPrimary: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center"
  },
  btnPrimaryText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFFFFF"
  },
  btnSecondary: {
    paddingVertical: 14,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: RESIGN_COLOR,
    alignItems: "center",
    justifyContent: "center"
  },
  btnSecondaryText: {
    fontSize: 15,
    fontWeight: "600",
    color: RESIGN_COLOR
  },
  btnPressed: {
    opacity: 0.88
  }
});
