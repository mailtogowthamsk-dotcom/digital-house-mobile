/** Merges API URL into Expo extra (EAS + local .env). */
const DEFAULT_API = "https://www.infosensetechnologies.com/digitalhouse/backend/api";

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
  return {
    ...config,
    owner,
    android: {
      ...config.android,
      intentFilters: [...existingIntentFilters, ...oauthIntentFilters]
    },
    extra: {
      ...config.extra,
      apiUrl: normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL || DEFAULT_API),
      googleWebClientId:
        process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || config.extra?.googleWebClientId || "",
      googleIosClientId:
        process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID || config.extra?.googleIosClientId || "",
      googleAndroidClientId:
        process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID || config.extra?.googleAndroidClientId || "",
      expoGoogleRedirectUri: `https://auth.expo.io/@${owner}/${slug}`
    }
  };
};
