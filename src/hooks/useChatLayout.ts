import { useEffect, useRef } from "react";
import { Platform, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useKeyboardHeight } from "./useKeyboardHeight";

/** Phone < 768 | Tablet split 768–1023 | Desktop split 1024+ */
const TABLET_MIN = 768;
const DESKTOP_MIN = 1024;

export function useChatLayout() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();

  const isPhone = width < TABLET_MIN;
  const isTablet = width >= TABLET_MIN && width < DESKTOP_MIN;
  const isDesktop = width >= DESKTOP_MIN;
  const isSplit = width >= TABLET_MIN;

  const sidebarWidth = Math.round(Math.min(Math.max(width * 0.34, 280), isDesktop ? 420 : 380));
  const bubbleMaxWidth = Math.min(width * (isPhone ? 0.84 : 0.72), 520);
  const horizontalPadding = isPhone ? 10 : 14;
  const fontSize = width < 360 ? 13 : 14;
  const titleSize = isPhone ? 17 : 18;

  const keyboardVisible = keyboardHeight > 0;
  const windowHeightBeforeKeyboardRef = useRef(height);

  useEffect(() => {
    if (!keyboardVisible) {
      windowHeightBeforeKeyboardRef.current = height;
    }
  }, [height, keyboardVisible]);

  /** How many px the root window already shrank when adjustResize is active. */
  const windowShrunkBy = keyboardVisible
    ? Math.max(0, windowHeightBeforeKeyboardRef.current - height)
    : 0;

  /**
   * Lift the composer above the keyboard without moving the header.
   * iOS: keyboard overlays the window.
   * Android: subtract any height adjustResize already reclaimed.
   */
  const chatKeyboardInset =
    Platform.OS === "ios"
      ? keyboardHeight
      : keyboardVisible
        ? Math.max(0, keyboardHeight - windowShrunkBy)
        : 0;

  const composerPaddingBottom = keyboardVisible
    ? 8
    : Math.max(insets.bottom, Platform.OS === "ios" ? 8 : 6);

  return {
    width,
    height,
    insets,
    keyboardHeight,
    keyboardVisible,
    isPhone,
    isTablet,
    isDesktop,
    isSplit,
    sidebarWidth,
    bubbleMaxWidth,
    horizontalPadding,
    fontSize,
    titleSize,
    chatKeyboardInset,
    composerPaddingBottom
  };
}
