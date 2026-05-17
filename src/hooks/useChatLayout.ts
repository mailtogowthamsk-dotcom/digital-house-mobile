import { Platform, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

/** Phone < 768 | Tablet split 768–1023 | Desktop split 1024+ */
const TABLET_MIN = 768;
const DESKTOP_MIN = 1024;

export function useChatLayout() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isPhone = width < TABLET_MIN;
  const isTablet = width >= TABLET_MIN && width < DESKTOP_MIN;
  const isDesktop = width >= DESKTOP_MIN;
  const isSplit = width >= TABLET_MIN;

  const sidebarWidth = Math.round(Math.min(Math.max(width * 0.34, 280), isDesktop ? 420 : 380));
  const bubbleMaxWidth = Math.min(width * (isPhone ? 0.84 : 0.72), 520);
  const horizontalPadding = isPhone ? 12 : 16;
  const fontSize = width < 360 ? 13 : 14;
  const titleSize = isPhone ? 17 : 18;

  const keyboardVerticalOffset = Platform.OS === "ios" ? insets.top : 0;
  const composerPaddingBottom = Math.max(insets.bottom, Platform.OS === "web" ? 12 : 8);

  return {
    width,
    height,
    insets,
    isPhone,
    isTablet,
    isDesktop,
    isSplit,
    sidebarWidth,
    bubbleMaxWidth,
    horizontalPadding,
    fontSize,
    titleSize,
    keyboardVerticalOffset,
    composerPaddingBottom
  };
}
