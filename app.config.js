/** Merges API URL into Expo extra (EAS + local .env). */
const DEFAULT_API = "https://www.infosensetechnologies.com/digitalhouse/backend/api";

/** Public OAuth client IDs — safe to embed; required in release APK (local .env is not used on EAS). */
const DEFAULT_GOOGLE = {
  web: "634671733122-hrqk0ndpif1jqccvrrahdsdkhg4jugpk.apps.googleusercontent.com",
  ios: "634671733122-af85dglc24jc415afv5o758sb8eqhj23.apps.googleusercontent.com",
  android: "634671733122-mkg5qdh9otdl42c3aet1ttlqau1tfao8.apps.googleusercontent.com"
};

function pickGoogleId(envVal, extraVal, fallback) {
  const fromEnv = String(envVal ?? "").trim();
  const fromExtra = typeof extraVal === "string" ? extraVal.trim() : "";
  return fromEnv || fromExtra || fallback;
}

function iosUrlSchemeFromClientId(iosClientId) {
  if (!iosClientId) return null;
  const prefix = iosClientId.replace(/\.apps\.googleusercontent\.com$/i, "");
  return prefix ? `com.googleusercontent.apps.${prefix}` : null;
}

function normalizeApiUrl(url) {
  const trimmed = String(url || "").trim().replace(/\/+$/, "");
  if (!trimmed) return DEFAULT_API;
  try {
    const u = new URL(trimmed);
    if (u.hostname === "infosensetechnologies.com") {
      u.hostname = "www.infosensetechnologies.com";
    }
    let out = u.toString().replace(/\/+$/, "");
    if (!out.endsWith("/api")) out = `${out}/api`;
    return out;
  } catch {
    return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
  }
}

module.exports = ({ config }) => {
  const owner = config.owner || "thisisgowtham";
  const slug = config.slug || "digital-house";
  const appScheme = config.scheme || "digitalhouse";
  const androidPackage = config.android?.package || "com.thisisgowtham.digitalhouse";
  const existingIntentFilters = config.android?.intentFilters ?? [];
  const oauthIntentFilters = [
    {
      action: "VIEW",
      autoVerify: false,
      data: [{ scheme: appScheme, pathPrefix: "/oauthredirect" }],
      category: ["BROWSABLE", "DEFAULT"]
    },
    {
      action: "VIEW",
      autoVerify: false,
      data: [{ scheme: androidPackage, pathPrefix: "/oauthredirect" }],
      category: ["BROWSABLE", "DEFAULT"]
    }
  ];
  const googleIosClientId = pickGoogleId(
    process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    config.extra?.googleIosClientId,
    DEFAULT_GOOGLE.ios
  );
  const iosUrlScheme = iosUrlSchemeFromClientId(googleIosClientId);
  const googleSignInPlugin = iosUrlScheme
    ? ["@react-native-google-signin/google-signin", { iosUrlScheme }]
    : "@react-native-google-signin/google-signin";
  const existingPlugins = config.plugins ?? [];
  const hasGoogleSignInPlugin = existingPlugins.some(
    (p) => p === "@react-native-google-signin/google-signin" || p?.[0] === "@react-native-google-signin/google-signin"
  );
  const hasExpoVideoPlugin = existingPlugins.some(
    (p) => p === "expo-video" || p?.[0] === "expo-video"
  );
  let plugins = hasGoogleSignInPlugin ? [...existingPlugins] : [...existingPlugins, googleSignInPlugin];
  if (!hasExpoVideoPlugin) plugins = [...plugins, "expo-video"];
  return {
    ...config,
    owner,
    plugins,
    android: {
      ...config.android,
      intentFilters: [...existingIntentFilters, ...oauthIntentFilters]
    },
    extra: {
      ...config.extra,
      apiUrl: normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL || DEFAULT_API),
      googleWebClientId: pickGoogleId(
        process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
        config.extra?.googleWebClientId,
        DEFAULT_GOOGLE.web
      ),
      googleIosClientId,
      googleAndroidClientId: pickGoogleId(
        process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
        config.extra?.googleAndroidClientId,
        DEFAULT_GOOGLE.android
      ),
      expoGoogleRedirectUri: `https://auth.expo.io/@${owner}/${slug}`
    }
  };
};
