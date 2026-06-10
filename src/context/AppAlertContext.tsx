import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  Animated,
  Platform,
  Dimensions,
  ScrollView,
  Easing
} from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useTheme } from "../theme/ThemeContext";
import { spacing, radius } from "../theme/spacing";

const POPUP_MAX_WIDTH = Math.min(Dimensions.get("window").width - 32, 360);
const ACTION_SHEET_MAX_HEIGHT = Math.min(Dimensions.get("window").height * 0.72, 520);

export type AppAlertButtonStyle = "default" | "cancel" | "destructive";

export type AppAlertButton = {
  text: string;
  style?: AppAlertButtonStyle;
  onPress?: () => void;
};

export type AppAlertVariant =
  | "default"
  | "success"
  | "error"
  | "warning"
  | "destructive"
  | "actionSheet";

export type AppAlertOptions = {
  cancelable?: boolean;
  variant?: AppAlertVariant;
};

type AlertRequest = {
  id: number;
  title: string;
  message?: string;
  buttons: AppAlertButton[];
  cancelable: boolean;
  variant: AppAlertVariant;
};

type AppAlertContextValue = {
  alert: (
    title: string,
    message?: string,
    buttons?: AppAlertButton[],
    options?: AppAlertOptions
  ) => void;
};

const AppAlertContext = createContext<AppAlertContextValue | null>(null);

let alertDispatcher: AppAlertContextValue["alert"] | null = null;

/** Imperative API — works inside and outside React components. */
export function appAlert(
  title: string,
  message?: string,
  buttons?: AppAlertButton[],
  options?: AppAlertOptions
): void {
  if (alertDispatcher) {
    alertDispatcher(title, message, buttons, options);
    return;
  }
  console.warn("[appAlert] Provider not mounted:", title, message);
}

function normalizeButtons(buttons?: AppAlertButton[]): AppAlertButton[] {
  if (!buttons?.length) return [{ text: "OK", style: "default" }];
  return buttons;
}

function inferVariant(
  title: string,
  message: string | undefined,
  buttons: AppAlertButton[],
  explicit?: AppAlertVariant
): AppAlertVariant {
  if (explicit) return explicit;
  if (buttons.length > 2) return "actionSheet";

  const haystack = `${title} ${message ?? ""}`.toLowerCase();
  const hasDestructive = buttons.some((b) => b.style === "destructive");

  if (hasDestructive && buttons.length >= 2) return "destructive";
  if (
    /thank you|success|saved|done|submitted|activated|shared|sent|accepted|archived|complete|connected|marked|removed bookmark/.test(
      haystack
    )
  ) {
    return "success";
  }
  if (/error|failed|could not|cannot|invalid|denied|not available|offline/.test(haystack)) {
    return "error";
  }
  if (
    /are you sure|confirm|block|delete|leave|disconnect|decline|withdraw|resign|cancel request/.test(
      haystack
    )
  ) {
    return "warning";
  }
  return "default";
}

type IconSpec = {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
};

function iconForVariant(variant: AppAlertVariant, colors: {
  primary: string;
  success: string;
  error: string;
  warning: string;
}): IconSpec | null {
  switch (variant) {
    case "success":
      return { name: "checkmark-circle", color: colors.success, bg: `${colors.success}18` };
    case "error":
      return { name: "close-circle", color: colors.error, bg: `${colors.error}18` };
    case "warning":
      return { name: "alert-circle", color: colors.warning, bg: `${colors.warning}18` };
    case "destructive":
      return { name: "shield-outline", color: colors.error, bg: `${colors.error}14` };
    case "default":
      return { name: "information-circle", color: colors.primary, bg: `${colors.primary}14` };
    default:
      return null;
  }
}

function splitButtons(buttons: AppAlertButton[]) {
  const cancelButtons = buttons.filter((b) => b.style === "cancel");
  const actionButtons = buttons.filter((b) => b.style !== "cancel");
  const cancel = cancelButtons[cancelButtons.length - 1];
  return { actionButtons, cancel };
}

function AlertIcon({ spec }: { spec: IconSpec }) {
  return (
    <View style={[s.iconCircle, { backgroundColor: spec.bg }]}>
      <Ionicons name={spec.name} size={28} color={spec.color} />
    </View>
  );
}

function DialogAlert({
  request,
  onDismiss
}: {
  request: AlertRequest;
  onDismiss: (button?: AppAlertButton) => void;
}) {
  const { colors } = useTheme();
  const scale = useRef(new Animated.Value(0.94)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const icon = iconForVariant(request.variant, colors);

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
        tension: 120
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true
      })
    ]).start();
  }, [scale, opacity]);

  const isRow = request.buttons.length === 2;

  return (
    <Pressable style={s.centered} onPress={(e) => e.stopPropagation()}>
      <Animated.View
        style={[
          s.popup,
          {
            backgroundColor: colors.surface,
            opacity,
            transform: [{ scale }]
          }
        ]}
      >
        {icon ? <AlertIcon spec={icon} /> : null}
        <Text style={[s.title, { color: colors.text }]}>{request.title}</Text>
        {request.message ? (
          <Text style={[s.message, { color: colors.textSecondary }]}>{request.message}</Text>
        ) : null}

        <View style={isRow ? s.btnRow : s.btnStack}>
          {request.buttons.map((btn, idx) => {
            const isDestructive = btn.style === "destructive";
            const isCancel = btn.style === "cancel";
            const isPrimary =
              !isDestructive && !isCancel && (isRow ? idx === request.buttons.length - 1 : idx === 0 && request.buttons.length === 1);

            return (
              <AlertButton
                key={`${btn.text}-${idx}`}
                btn={btn}
                stacked={!isRow}
                isPrimary={isPrimary}
                isCancel={isCancel}
                isDestructive={isDestructive}
                onPress={() => onDismiss(btn)}
              />
            );
          })}
        </View>
      </Animated.View>
    </Pressable>
  );
}

function ActionSheetAlert({
  request,
  onDismiss
}: {
  request: AlertRequest;
  onDismiss: (button?: AppAlertButton) => void;
}) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(48)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const { actionButtons, cancel } = splitButtons(request.buttons);
  const options = actionButtons.length > 0 ? actionButtons : request.buttons;
  const scrollable = options.length > 5;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true
      })
    ]).start();
  }, [translateY, opacity]);

  const optionList = (
    <>
      {options.map((btn, idx) => {
        const isDestructive = btn.style === "destructive";
        return (
          <Pressable
            key={`${btn.text}-${idx}`}
            style={({ pressed }) => [
              s.sheetOption,
              idx > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
              pressed && { backgroundColor: colors.surfaceElevated }
            ]}
            onPress={() => onDismiss(btn)}
          >
            <Text
              style={[
                s.sheetOptionText,
                { color: isDestructive ? colors.error : colors.text }
              ]}
              numberOfLines={2}
            >
              {btn.text}
            </Text>
            {isDestructive ? (
              <Ionicons name="ban-outline" size={18} color={colors.error} />
            ) : (
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            )}
          </Pressable>
        );
      })}
    </>
  );

  return (
    <View style={s.sheetWrap}>
      <Animated.View
        style={[
          s.sheetCard,
          {
            backgroundColor: colors.surface,
            opacity,
            transform: [{ translateY }],
            paddingBottom: Math.max(insets.bottom, spacing.md)
          }
        ]}
      >
        <View style={[s.sheetHandle, { backgroundColor: colors.border }]} />
        <Text style={[s.sheetTitle, { color: colors.text }]}>{request.title}</Text>
        {request.message ? (
          <Text style={[s.sheetMessage, { color: colors.textSecondary }]}>{request.message}</Text>
        ) : null}

        <View style={[s.sheetOptions, { borderColor: colors.border }]}>
          {scrollable ? (
            <ScrollView style={{ maxHeight: ACTION_SHEET_MAX_HEIGHT - 160 }} bounces={false}>
              {optionList}
            </ScrollView>
          ) : (
            optionList
          )}
        </View>

        {cancel ? (
          <Pressable
            style={({ pressed }) => [
              s.sheetCancel,
              {
                backgroundColor: colors.surfaceElevated,
                borderColor: colors.border
              },
              pressed && { opacity: 0.88 }
            ]}
            onPress={() => onDismiss(cancel)}
          >
            <Text style={[s.sheetCancelText, { color: colors.text }]}>{cancel.text}</Text>
          </Pressable>
        ) : null}
      </Animated.View>
    </View>
  );
}

function AlertButton({
  btn,
  stacked,
  isPrimary,
  isCancel,
  isDestructive,
  onPress
}: {
  btn: AppAlertButton;
  stacked: boolean;
  isPrimary: boolean;
  isCancel: boolean;
  isDestructive: boolean;
  onPress: () => void;
}) {
  const { colors } = useTheme();

  return (
    <Pressable
      style={({ pressed }) => [
        stacked ? s.btnStackItem : s.btnRowItem,
        isPrimary && { backgroundColor: colors.primary },
        isCancel && {
          backgroundColor: colors.surfaceElevated,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border
        },
        isDestructive && {
          backgroundColor: "transparent",
          borderWidth: 1.5,
          borderColor: colors.error
        },
        !isPrimary && !isCancel && !isDestructive && {
          backgroundColor: colors.surfaceElevated,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: colors.border
        },
        pressed && { opacity: 0.88 }
      ]}
      onPress={onPress}
    >
      <Text
        style={[
          s.btnText,
          isPrimary && { color: colors.white },
          isCancel && { color: colors.text },
          isDestructive && { color: colors.error },
          !isPrimary && !isCancel && !isDestructive && { color: colors.text }
        ]}
        numberOfLines={2}
      >
        {btn.text}
      </Text>
    </Pressable>
  );
}

function AppAlertModal({
  request,
  onClose
}: {
  request: AlertRequest | null;
  onClose: (id: number) => void;
}) {
  const { colors } = useTheme();

  const dismiss = useCallback(
    (button?: AppAlertButton) => {
      if (!request) return;
      onClose(request.id);
      button?.onPress?.();
    },
    [onClose, request]
  );

  if (!request) return null;

  const isActionSheet = request.variant === "actionSheet";

  return (
    <Modal
      visible
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => {
        if (request.cancelable) dismiss();
      }}
    >
      <Pressable
        style={[s.backdrop, isActionSheet && s.backdropBottom]}
        onPress={() => {
          if (request.cancelable) dismiss();
        }}
      >
        {Platform.OS === "ios" ? (
          <BlurView intensity={36} tint="dark" style={StyleSheet.absoluteFill} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]} />
        )}

        {isActionSheet ? (
          <ActionSheetAlert request={request} onDismiss={dismiss} />
        ) : (
          <DialogAlert request={request} onDismiss={dismiss} />
        )}
      </Pressable>
    </Modal>
  );
}

export function AppAlertProvider({ children }: { children: React.ReactNode }) {
  const queueRef = useRef<AlertRequest[]>([]);
  const idRef = useRef(0);
  const [active, setActive] = useState<AlertRequest | null>(null);

  const pump = useCallback(() => {
    setActive((current) => {
      if (current) return current;
      return queueRef.current.shift() ?? null;
    });
  }, []);

  const alert = useCallback<AppAlertContextValue["alert"]>(
    (title, message, buttons, options) => {
      const normalized = normalizeButtons(buttons);
      const req: AlertRequest = {
        id: ++idRef.current,
        title,
        message: message?.trim() || undefined,
        buttons: normalized,
        cancelable: options?.cancelable !== false,
        variant: inferVariant(title, message?.trim(), normalized, options?.variant)
      };
      queueRef.current.push(req);
      pump();
    },
    [pump]
  );

  useEffect(() => {
    alertDispatcher = alert;
    return () => {
      alertDispatcher = null;
    };
  }, [alert]);

  const onClose = useCallback(
    (id: number) => {
      setActive((current) => {
        if (current?.id !== id) return current;
        return null;
      });
      requestAnimationFrame(() => pump());
    },
    [pump]
  );

  const value = useMemo(() => ({ alert }), [alert]);

  return (
    <AppAlertContext.Provider value={value}>
      {children}
      <AppAlertModal request={active} onClose={onClose} />
    </AppAlertContext.Provider>
  );
}

export function useAppAlert(): AppAlertContextValue {
  const ctx = useContext(AppAlertContext);
  if (!ctx) throw new Error("useAppAlert must be used within AppAlertProvider");
  return ctx;
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center"
  },
  backdropBottom: {
    justifyContent: "flex-end"
  },
  centered: {
    width: "100%",
    alignItems: "center",
    paddingHorizontal: spacing.lg
  },
  popup: {
    width: "100%",
    maxWidth: POPUP_MAX_WIDTH,
    borderRadius: radius.lg,
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.lg,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 28,
    elevation: 14
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    lineHeight: 24
  },
  message: {
    marginTop: spacing.sm,
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center"
  },
  btnRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.xl,
    width: "100%"
  },
  btnStack: {
    marginTop: spacing.lg,
    width: "100%",
    gap: spacing.sm
  },
  btnRowItem: {
    flex: 1,
    minHeight: 46,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm
  },
  btnStackItem: {
    minHeight: 46,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md
  },
  btnText: {
    fontSize: 15,
    fontWeight: "700",
    textAlign: "center"
  },
  sheetWrap: {
    width: "100%",
    paddingHorizontal: spacing.md
  },
  sheetCard: {
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg
  },
  sheetHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: spacing.md
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: spacing.xs
  },
  sheetMessage: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: spacing.md
  },
  sheetOptions: {
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    marginBottom: spacing.sm
  },
  sheetOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    minHeight: 52
  },
  sheetOptionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600"
  },
  sheetCancel: {
    minHeight: 50,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.xs
  },
  sheetCancelText: {
    fontSize: 16,
    fontWeight: "700"
  }
});
