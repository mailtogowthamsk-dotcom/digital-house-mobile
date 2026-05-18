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

module.exports = ({ config }) => ({
  ...config,
  extra: {
    ...config.extra,
    apiUrl: normalizeApiUrl(process.env.EXPO_PUBLIC_API_URL || DEFAULT_API)
  }
});
