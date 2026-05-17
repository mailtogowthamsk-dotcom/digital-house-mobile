import React from "react";
import { View, ActivityIndicator, StyleSheet, Image } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "../../theme/ThemeContext";

const LOGO = require("../../../assets/logo_digital_house.png");
const GRADIENT = ["#0B1220", "#0f172a", "#1e293b"] as const;

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
  root: { flex: 1 },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center"
  },
  logo: {
    width: 160,
    height: 64,
    marginBottom: 32
  },
  spinner: {
    marginTop: 8
  }
});
