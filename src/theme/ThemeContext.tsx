import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import { getStoredTheme, setStoredTheme, type ThemeMode } from "../storage/theme.storage";

export type ThemeColors = {
  primary: string;
  primaryDark: string;
  secondary: string;
  accent: string;
  background: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  success: string;
  error: string;
  warning: string;
  statusPending: string;
  statusApproved: string;
  statusRejected: string;
  sensitive: string;
  sensitiveBg: string;
  messageSuccess: string;
  messageError: string;
  overlay: string;
  white: string;
  black: string;
  landingBg: string;
  landingSurface: string;
  landingText: string;
  landingTextMuted: string;
  /** Soft glass / feed chrome */
  glass: string;
  glassBorder: string;
};

const lightColors: ThemeColors = {
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  secondary: "#6366F1",
  accent: "#EA580C",
  background: "#EEF0F4",
  surface: "#FFFFFF",
  surfaceElevated: "#E8EAF0",
  border: "rgba(15, 23, 42, 0.07)",
  text: "#0F172A",
  textSecondary: "#64748B",
  textMuted: "#94A3B8",
  success: "#22C55E",
  error: "#EF4444",
  warning: "#F59E0B",
  statusPending: "#F59E0B",
  statusApproved: "#22C55E",
  statusRejected: "#EF4444",
  sensitive: "#64748B",
  sensitiveBg: "rgba(100, 116, 139, 0.08)",
  messageSuccess: "#22C55E",
  messageError: "#EF4444",
  overlay: "rgba(15, 23, 42, 0.4)",
  white: "#FFFFFF",
  black: "#000000",
  landingBg: "#E0F2FE",
  landingSurface: "#FFFFFF",
  landingText: "#0C4A6E",
  landingTextMuted: "#0369A1",
  glass: "rgba(255, 255, 255, 0.78)",
  glassBorder: "rgba(255, 255, 255, 0.65)"
};

const darkColors: ThemeColors = {
  ...lightColors,
  background: "#0B1220",
  surface: "#141C2B",
  surfaceElevated: "#1E293B",
  border: "rgba(248, 250, 252, 0.08)",
  text: "#F8FAFC",
  textSecondary: "#94A3B8",
  textMuted: "#64748B",
  sensitive: "#94A3B8",
  sensitiveBg: "rgba(148, 163, 184, 0.15)",
  landingBg: "#0B1220",
  landingSurface: "#141C2B",
  landingText: "#F8FAFC",
  landingTextMuted: "#94A3B8",
  glass: "rgba(20, 28, 43, 0.78)",
  glassBorder: "rgba(255, 255, 255, 0.08)",
  overlay: "rgba(0, 0, 0, 0.55)"
};

type ThemeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  colors: ThemeColors;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("light");

  useEffect(() => {
    getStoredTheme().then((stored) => {
      if (stored) setModeState(stored);
    });
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    setStoredTheme(next);
  }, []);

  const colors = mode === "dark" ? darkColors : lightColors;

  const value = useMemo(
    () => ({ mode, setMode, colors }),
    [mode, setMode, colors]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
