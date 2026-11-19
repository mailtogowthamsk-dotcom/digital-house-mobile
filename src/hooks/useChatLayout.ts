import { Platform, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useKeyboardHeight, useKeyboardScreenHeight } from "./useKeyboardHeight";

/** Phone < 768 | Tablet split 768–1023 | Desktop split 1024+ */
const TABLET_MIN = 768;
const DESKTOP_MIN = 1024;

export function useChatLayout() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  /** Visibility must use full IME signal — Android leftover is often 0 after resize. */
  const imeHeight = useKeyboardScreenHeight();

  const isPhone = width < TABLET_MIN;
  const isTablet = width >= TABLET_MIN && width < DESKTOP_MIN;
  const isDesktop = width >= DESKTOP_MIN;
  const isSplit = width >= TABLET_MIN;

  const sidebarWidth = Math.round(Math.min(Math.max(width * 0.34, 280), isDesktop ? 420 : 380));
  const bubbleMaxWidth = Math.min(width * (isPhone ? 0.78 : 0.68), 440);
  const horizontalPadding = isPhone ? 10 : 14;
  const fontSize = width < 360 ? 13 : 14;
  const titleSize = isPhone ? 17 : 18;

  const keyboardVisible = Platform.OS === "ios" ? keyboardHeight > 0 : imeHeight > 0;

  /**
   * Lift the composer above the keyboard without moving the header.
   *
   * Android: app.json has softwareKeyboardLayoutMode "resize". The window
   * already shrinks under the IME, so the composer at the bottom of the
   * flex column is already above the keyboard. Any marginBottom here
   * double-counts and creates the blank gap. Always 0 on Android.
   *
   * iOS: keyboard overlays — pad by full keyboard height.
   */
  const chatKeyboardInset = Platform.OS === "ios" ? keyboardHeight : 0;

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
