import { useEffect, useCallback } from "react";
import * as Application from "expo-application";
import * as Google from "expo-auth-session/providers/google";
import { makeRedirectUri } from "expo-auth-session";
import * as WebBrowser from "expo-web-browser";
import Constants, { ExecutionEnvironment } from "expo-constants";

WebBrowser.maybeCompleteAuthSession();

const APP_SCHEME = (Constants.expoConfig?.scheme as string | undefined) ?? "digitalhouse";
export const IS_EXPO_GO =
  Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/** Google Sign-In is not supported in Expo Go (auth.expo.io proxy removed). */
export const EXPO_GO_GOOGLE_MESSAGE =
  "Google Sign-In does not work in Expo Go. Use email OTP here, or install your EAS preview APK to test Google login.";

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

  const nativeRedirect =
    Application.applicationId != null
      ? `${Application.applicationId}:/oauthredirect`
      : `${APP_SCHEME}://oauthredirect`;

  const redirectUri = makeRedirectUri({
    scheme: APP_SCHEME,
    path: "oauthredirect",
    native: nativeRedirect
  });

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
    if (__DEV__ && configured && !IS_EXPO_GO) {
      console.info(`[Google Sign-In] redirectUri=${redirectUri}`);
    }
  }, [configured, redirectUri]);

  useEffect(() => {
    if (response?.type === "cancel" || response?.type === "dismiss") {
      return;
    }
  }, [response]);

  const signIn = useCallback(async (): Promise<string | null> => {
    if (IS_EXPO_GO) {
      throw new Error(EXPO_GO_GOOGLE_MESSAGE);
    }
    if (!configured) {
      throw new Error("Google Sign-In is not configured. Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID to mobile/.env");
    }
    if (!request) {
      throw new Error("Google Sign-In is still loading. Try again in a moment.");
    }
    const result = await promptAsync();
    if (result.type === "cancel" || result.type === "dismiss") {
      return null;
    }
    if (result.type !== "success") {
      throw new Error("Google sign-in was interrupted. Please try again.");
    }
    const idToken = result.params?.id_token;
    if (!idToken) {
      throw new Error("Google did not return a valid token. Please try again.");
    }
    return idToken;
  }, [configured, promptAsync, request]);

  return {
    signIn,
    configured,
    available,
    isExpoGo: IS_EXPO_GO,
    ready: available && !!request
  };
}
