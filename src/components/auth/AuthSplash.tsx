import React from "react";
import { View, ActivityIndicator, StyleSheet, Image, Dimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../theme/ThemeContext";

const LOGO = require("../../../assets/logo_digital_house.png");
const GRADIENT = ["#000000", "#0B1220", "#111827"] as const;
const LOGO_SIZE = Math.min(Dimensions.get("window").width * 0.58, 260);

/** Shown while restoring session from secure storage — prevents login/landing flash. */
export function AuthSplash() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  return (
    <View style={styles.root}>
      <LinearGradient colors={GRADIENT} style={StyleSheet.absoluteFill} />
      <View style={[styles.content, { paddingTop: insets.top + 48, paddingBottom: insets.bottom + 48 }]}>
        <Image source={LOGO} style={styles.logo} resizeMode="contain" />
        <ActivityIndicator size="small" color={colors.primary} style={styles.spinner} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#000000" },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  logo: {
    width: LOGO_SIZE,
    height: LOGO_SIZE,
    marginBottom: 36
  },
  spinner: {
    marginTop: 8
  }
});
