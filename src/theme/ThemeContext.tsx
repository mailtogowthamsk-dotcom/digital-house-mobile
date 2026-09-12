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
  primary: "#16803C",
  primaryDark: "#146C34",
  secondary: "#146C34",
  accent: "#DC2626",
  background: "#F5F6F8",
  surface: "#FFFFFF",
  surfaceElevated: "#F3F4F6",
  border: "#E5E7EB",
  text: "#111827",
  textSecondary: "#6B7280",
  textMuted: "#9CA3AF",
  success: "#16803C",
  error: "#DC2626",
  warning: "#F59E0B",
  statusPending: "#F59E0B",
  statusApproved: "#16803C",
  statusRejected: "#DC2626",
  sensitive: "#6B7280",
  sensitiveBg: "rgba(107, 114, 128, 0.1)",
  messageSuccess: "#16803C",
  messageError: "#DC2626",
  overlay: "rgba(17, 24, 39, 0.45)",
  white: "#FFFFFF",
  black: "#000000",
  landingBg: "#0B1220",
  landingSurface: "#FFFFFF",
  landingText: "#FFFFFF",
  landingTextMuted: "rgba(255,255,255,0.72)",
  glass: "rgba(255, 255, 255, 0.92)",
  glassBorder: "rgba(229, 231, 235, 0.9)"
};

const darkColors: ThemeColors = {
  ...lightColors,
  background: "#0B1220",
  surface: "#141C2B",
  surfaceElevated: "#1E293B",
  border: "rgba(229, 231, 235, 0.12)",
  text: "#F8FAFC",
  textSecondary: "#9CA3AF",
  textMuted: "#6B7280",
  sensitive: "#9CA3AF",
  sensitiveBg: "rgba(156, 163, 175, 0.15)",
  landingBg: "#0B1220",
  landingSurface: "#141C2B",
  landingText: "#F8FAFC",
  landingTextMuted: "rgba(248,250,252,0.72)",
  glass: "rgba(20, 28, 43, 0.92)",
  glassBorder: "rgba(255, 255, 255, 0.1)",
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
