import { useEffect, useCallback, useMemo, useState } from "react";
import * as Google from "expo-auth-session/providers/google";
import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { NativeModules, Platform, TurboModuleRegistry } from "react-native";

WebBrowser.maybeCompleteAuthSession();

const APP_SCHEME = (Constants.expoConfig?.scheme as string | undefined) ?? "digitalhouse";

/** Placeholder so Google.useIdTokenAuthRequest never throws on missing env in release builds. */
const SAFE_CLIENT_ID = "GOOGLE_AUTH_DISABLED.apps.googleusercontent.com";

export const IS_EXPO_GO =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** Google Sign-In requires a custom native build (not Expo Go). */
export const EXPO_GO_GOOGLE_MESSAGE =
  "Google Sign-In does not work in Expo Go. Use email OTP here, or install an EAS development/preview build.";

export const NATIVE_GOOGLE_MISSING_MESSAGE =
  "Google Sign-In native module is missing from this app binary. Rebuild with `npx expo run:ios` or an EAS build that includes @react-native-google-signin/google-signin. Use email OTP until then.";

export const ANDROID_GOOGLE_SETUP_HINT =
  "Ensure Android OAuth client has package com.thisisgowtham.digitalhouse and your EAS SHA-1 fingerprint.";

type GoogleNativeModule = {
  GoogleSignin: {
    configure: (opts: {
      webClientId: string;
      iosClientId?: string;
      offlineAccess?: boolean;
    }) => void;
    hasPlayServices: (opts?: { showPlayServicesUpdateDialog?: boolean }) => Promise<boolean>;
    signIn: () => Promise<unknown>;
    getTokens: () => Promise<{ idToken: string | null }>;
  };
  statusCodes: {
    SIGN_IN_CANCELLED: string;
    IN_PROGRESS: string;
    PLAY_SERVICES_NOT_AVAILABLE: string;
  };
  isErrorWithCode: (e: unknown) => e is { code: string };
  isSuccessResponse: (r: unknown) => r is { data: { idToken: string | null } };
};

function hasNativeGoogleSignIn(): boolean {
  try {
    const get = (TurboModuleRegistry as { get?: (name: string) => unknown } | undefined)?.get;
    if (typeof get === "function" && get("RNGoogleSignin")) return true;
  } catch {
    /* ignore */
  }
  try {
    if ((NativeModules as Record<string, unknown>).RNGoogleSignin) return true;
  } catch {
    /* ignore */
  }
  return false;
}

function loadGoogleNative(): GoogleNativeModule | null {
  if (IS_EXPO_GO || !hasNativeGoogleSignIn()) return null;
  try {
    // Lazy require so Expo Go / binaries without the module never evaluate the import.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("@react-native-google-signin/google-signin") as GoogleNativeModule;
  } catch {
    return null;
  }
}

function pickClientId(extraVal: unknown, envVal: string | undefined): string {
  const fromExtra = typeof extraVal === "string" ? extraVal.trim() : "";
  const fromEnv = (envVal ?? "").trim();
  return fromExtra || fromEnv;
}

function readClientIds() {
  const extra = Constants.expoConfig?.extra ?? {};
  return {
    webClientId: pickClientId(extra.googleWebClientId, process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID),
    iosClientId: pickClientId(extra.googleIosClientId, process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID),
    androidClientId: pickClientId(
      extra.googleAndroidClientId,
      process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID
    )
  };
}

/**
 * Always call with non-empty client IDs.
 * Missing androidClientId / iosClientId throws synchronously on release builds and
 * takes down Login via AppErrorBoundary ("Something went wrong").
 */
function useWebGoogleAuth(clientIds: {
  webClientId: string;
  iosClientId: string;
  androidClientId: string;
}) {
  const redirectUri = useMemo(
    () =>
      makeRedirectUri({
        scheme: APP_SCHEME,
        path: "oauthredirect",
        native: `${APP_SCHEME}://oauthredirect`
      }),
    []
  );

  const webClientId = clientIds.webClientId || SAFE_CLIENT_ID;
  const iosClientId = clientIds.iosClientId || webClientId;
  const androidClientId = clientIds.androidClientId || webClientId;

  const [request, , promptAsync] = Google.useIdTokenAuthRequest(
    {
      webClientId,
      iosClientId,
      androidClientId,
      redirectUri
    },
    { scheme: APP_SCHEME }
  );

  const signInWeb = useCallback(async (): Promise<string | null> => {
    if (!clientIds.webClientId) {
      throw new Error(
        "Google Sign-In is not configured in this build. Install the latest preview build from EAS."
      );
    }
    if (!request) {
      throw new Error("Google Sign-In is still loading. Try again in a moment.");
    }
    const result = await promptAsync();
    if (result.type === "cancel" || result.type === "dismiss") {
      return null;
    }
    if (result.type === "error") {
      const detail =
        (result as { params?: { error_description?: string; error?: string } }).params
          ?.error_description ||
        (result as { params?: { error?: string } }).params?.error ||
        (result as { error?: { message?: string } }).error?.message;
      throw new Error(detail ?? "Google sign-in failed.");
    }
    if (result.type !== "success") {
      throw new Error("Google sign-in was interrupted. Please try again.");
    }
    const idToken = result.params?.id_token;
    if (!idToken) {
      throw new Error("Google did not return a valid token. Please try again.");
    }
    return idToken;
  }, [clientIds.webClientId, promptAsync, request]);

  return { signInWeb, webReady: !!request && !!clientIds.webClientId };
}

export function useGoogleSignIn() {
  const clientIds = readClientIds();
  const { webClientId, iosClientId, androidClientId } = clientIds;
  const configured = !!webClientId;
  const nativeModule = useMemo(() => loadGoogleNative(), []);
  const nativePresent = !!nativeModule;
  const useNativeSignIn =
    (Platform.OS === "android" || Platform.OS === "ios") && nativePresent;
  const available = configured && !IS_EXPO_GO && (useNativeSignIn || Platform.OS === "web");
  const [nativeReady, setNativeReady] = useState(!useNativeSignIn);

  // Must always run (hooks rules). Safe IDs prevent Android/iOS release crashes.
  const { signInWeb, webReady } = useWebGoogleAuth({
    webClientId,
    iosClientId,
    androidClientId
  });

  useEffect(() => {
    if (!configured || IS_EXPO_GO || !useNativeSignIn || !nativeModule) {
      setNativeReady(false);
      return;
    }
    try {
      nativeModule.GoogleSignin.configure({
        webClientId,
        iosClientId: iosClientId || undefined,
        offlineAccess: false
      });
      setNativeReady(true);
    } catch (e) {
      console.warn("[Google Sign-In] configure failed", e);
      setNativeReady(false);
    }
  }, [configured, iosClientId, nativeModule, useNativeSignIn, webClientId]);

  const signInNative = useCallback(async (): Promise<string | null> => {
    if (!webClientId || !nativeModule) {
      throw new Error(NATIVE_GOOGLE_MISSING_MESSAGE);
    }
    const { GoogleSignin, statusCodes, isErrorWithCode, isSuccessResponse } = nativeModule;
    try {
      if (Platform.OS === "android") {
        await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      }
      const result = await GoogleSignin.signIn();
      if (!isSuccessResponse(result)) {
        return null;
      }
      let idToken = result.data.idToken;
      if (!idToken) {
        const tokens = await GoogleSignin.getTokens();
        idToken = tokens.idToken;
      }
      if (!idToken) {
        throw new Error("Google did not return a valid token. Please try again.");
      }
      return idToken;
    } catch (e) {
      if (isErrorWithCode(e)) {
        if (e.code === statusCodes.SIGN_IN_CANCELLED) {
          return null;
        }
        if (e.code === statusCodes.IN_PROGRESS) {
          throw new Error("Google sign-in is already in progress.");
        }
        if (e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          throw new Error("Google Play Services is not available on this device.");
        }
      }
      const message = e instanceof Error ? e.message : "Google sign-in failed.";
      throw new Error(
        Platform.OS === "android" ? `${message} ${ANDROID_GOOGLE_SETUP_HINT}` : message
      );
    }
  }, [nativeModule, webClientId]);

  const signIn = useCallback(async (): Promise<string | null> => {
    if (IS_EXPO_GO) {
      throw new Error(EXPO_GO_GOOGLE_MESSAGE);
    }
    if (!configured) {
      throw new Error(
        "Google Sign-In is not configured in this build. Install the latest preview build from EAS."
      );
    }
    if ((Platform.OS === "ios" || Platform.OS === "android") && !nativePresent) {
      // Standalone builds should use native module; web OAuth is fallback only.
      try {
        return await signInWeb();
      } catch {
        throw new Error(NATIVE_GOOGLE_MISSING_MESSAGE);
      }
    }
    if (useNativeSignIn) {
      return signInNative();
    }
    return signInWeb();
  }, [configured, nativePresent, signInNative, signInWeb, useNativeSignIn]);

  const ready =
    available && (useNativeSignIn ? nativeReady && !!webClientId : webReady);

  return {
    signIn,
    configured,
    available,
    isExpoGo: IS_EXPO_GO,
    nativePresent,
    ready
  };
}
