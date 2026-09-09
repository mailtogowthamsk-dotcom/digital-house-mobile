import { useEffect } from "react";
import { AppState, Platform, StatusBar as RNStatusBar } from "react-native";
import { StatusBar, setStatusBarStyle } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useTheme } from "../theme/ThemeContext";
import { navigationRef } from "../navigation/rootNavigation";

/**
 * Keeps status-bar icon contrast + root window color in sync with in-app theme.
 *
 * Android light mode needs dark icons on a light canvas. Expo Go / edge-to-edge
 * often leaves light icons (or a dark BlurView under them), so we re-assert
 * after theme changes, app resume, and navigation.
 */
export function ThemeSystemBars() {
  const { mode, colors } = useTheme();
  const isDark = mode === "dark";
  const style = isDark ? "light" : "dark";

  useEffect(() => {
    const apply = () => {
      setStatusBarStyle(style);
      if (Platform.OS === "android") {
        RNStatusBar.setBarStyle(isDark ? "light-content" : "dark-content", false);
        // Best-effort on older Android; no-op on API 35+ edge-to-edge.
        try {
          RNStatusBar.setBackgroundColor(isDark ? colors.background : colors.surface, false);
          RNStatusBar.setTranslucent(true);
        } catch {
          /* ignore */
        }
      }
      void SystemUI.setBackgroundColorAsync(isDark ? colors.background : colors.surface);
    };

    apply();
    const t1 = setTimeout(apply, 32);
    const t2 = setTimeout(apply, 250);

    const appSub = AppState.addEventListener("change", (next) => {
      if (next === "active") apply();
    });

    let unsubNav: undefined | (() => void);
    let navPoll: ReturnType<typeof setInterval> | undefined;
    const attachNav = () => {
      if (unsubNav || !navigationRef.isReady()) return;
      unsubNav = navigationRef.addListener("state", apply);
      if (navPoll) clearInterval(navPoll);
    };
    navPoll = setInterval(attachNav, 400);
    attachNav();

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      if (navPoll) clearInterval(navPoll);
      appSub.remove();
      unsubNav?.();
    };
  }, [style, isDark, colors.background, colors.surface]);

  // Remount when theme flips so expo-status-bar pushes a fresh entry.
  return <StatusBar key={mode} style={style} />;
}
