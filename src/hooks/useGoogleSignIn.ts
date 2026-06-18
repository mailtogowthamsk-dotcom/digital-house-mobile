import { useEffect, useCallback, useMemo } from "react";
import * as Google from "expo-auth-session/providers/google";
import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import Constants, { ExecutionEnvironment } from "expo-constants";
import { Platform } from "react-native";

WebBrowser.maybeCompleteAuthSession();

const APP_SCHEME = (Constants.expoConfig?.scheme as string | undefined) ?? "digitalhouse";
export const IS_EXPO_GO =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** Google Sign-In is not supported in Expo Go (auth.expo.io proxy removed). */
export const EXPO_GO_GOOGLE_MESSAGE =
  "Google Sign-In does not work in Expo Go. Use email OTP here, or install your EAS preview APK to test Google login.";

export const ANDROID_GOOGLE_SETUP_HINT =
  "Register EAS SHA-1 on the Android OAuth client (package com.thisisgowtham.digitalhouse). Do not add digitalhouse:// to JavaScript origins — that field is https-only.";

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

export function useGoogleSignIn() {
  const { webClientId, iosClientId, androidClientId } = readClientIds();
  const configured = !!webClientId;
  const available = configured && !IS_EXPO_GO;

  /** App scheme redirect — must match app.config.js intentFilters and Google Web client redirect URIs. */
  const redirectUri = useMemo(
    () =>
      makeRedirectUri({
        scheme: APP_SCHEME,
        path: "oauthredirect",
        native: `${APP_SCHEME}://oauthredirect`
      }),
    []
  );

  const [request, response, promptAsync] = Google.useIdTokenAuthRequest(
    {
      webClientId,
      iosClientId: iosClientId || webClientId,
      androidClientId: androidClientId || webClientId,
      redirectUri
    },
    { scheme: APP_SCHEME }
  );

  useEffect(() => {
    if (configured && !IS_EXPO_GO) {
      console.info(`[Google Sign-In] redirectUri=${redirectUri}`);
      if (!webClientId) {
        console.warn("[Google Sign-In] webClientId missing — rebuild with EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID in EAS env.");
      }
    }
  }, [configured, redirectUri, webClientId]);

  const signIn = useCallback(async (): Promise<string | null> => {
    if (IS_EXPO_GO) {
      throw new Error(EXPO_GO_GOOGLE_MESSAGE);
    }
    if (!configured) {
      throw new Error(
        "Google Sign-In is not configured in this build. Rebuild the preview APK with EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID set in EAS."
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
      const suffix = Platform.OS === "android" ? ` ${ANDROID_GOOGLE_SETUP_HINT}` : "";
      throw new Error(detail ? `${detail}.${suffix}` : `Google sign-in failed.${suffix}`);
    }
    if (result.type !== "success") {
      throw new Error("Google sign-in was interrupted. Please try again.");
    }
    const idToken = result.params?.id_token;
    if (!idToken) {
      throw new Error(
        Platform.OS === "android"
          ? `Google did not return a token. Add ${redirectUri} to your Web OAuth client redirect URIs, then rebuild.${ANDROID_GOOGLE_SETUP_HINT}`
          : "Google did not return a valid token. Please try again."
      );
    }
    return idToken;
  }, [configured, promptAsync, request, redirectUri]);

  return {
    signIn,
    configured,
    available,
    isExpoGo: IS_EXPO_GO,
    ready: available && !!request,
    redirectUri
  };
}
