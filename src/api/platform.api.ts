import { Platform } from "react-native";
import Constants from "expo-constants";
import { api } from "./client";

export type PlatformBootstrap = {
  serverTime: string;
  maintenance: {
    enabled: boolean;
    title: string | null;
    description: string | null;
    expectedEndAt: string | null;
    contactInfo: string | null;
  };
  version: {
    platform: string;
    status: string;
    latestVersion: string | null;
    minSupportedVersion: string | null;
    releaseNotes: string | null;
    releaseDate: string | null;
    versionName?: string;
    storeUrl?: string | null;
    updateRequired: boolean;
    forceUpdate: boolean;
    softUpdate: boolean;
  } | null;
  features: Record<string, boolean>;
  menu: Array<{ code: string; label: string; sortOrder: number }>;
  announcements: Array<{
    id: number;
    title: string;
    description: string;
    bannerImage: string | null;
    publishAt: string;
    expiresAt: string | null;
    priority: number;
  }>;
  banners: Array<{
    id: number;
    message: string;
    backgroundColor: string | null;
    icon: string | null;
    clickAction: string | null;
    expiresAt: string | null;
    priority: number;
  }>;
  popups: Array<{
    id: number;
    title: string;
    body: string;
    imageUrl: string | null;
    popupType: string;
    acknowledgementRequired: boolean;
  }>;
  ads: Array<{
    id: number;
    kind: string;
    title: string;
    imageUrl: string | null;
    targetScreen: string | null;
    clickAction: string | null;
    priority: number;
  }>;
};

function resolveAppPlatform(): "ANDROID" | "IOS" {
  if (Platform.OS === "ios") return "IOS";
  return "ANDROID";
}

function resolveAppVersion(): string {
  try {
    return (
      Constants.expoConfig?.version ||
      (Constants as any).nativeAppVersion ||
      "1.0.0"
    );
  } catch {
    return "1.0.0";
  }
}

export async function fetchPlatformBootstrap(): Promise<PlatformBootstrap> {
  const platform = resolveAppPlatform();
  const appVersion = resolveAppVersion();
  const { data } = await api.get<PlatformBootstrap & { ok?: boolean }>("/platform/bootstrap", {
    params: { platform, appVersion }
  });
  return data;
}

export async function acknowledgePlatformPopup(popupId: number): Promise<void> {
  await api.post(`/platform/popups/${popupId}/ack`);
}

export async function trackPlatformAdEvent(
  adId: number,
  event: "view" | "click"
): Promise<void> {
  await api.post(`/platform/ads/${adId}/event`, { event });
}

/** Map menu action ids used in MenuScreen to platform menu / feature codes */
export const MENU_FEATURE_MAP: Record<string, string> = {
  jobs: "jobs",
  marketplace: "marketplace",
  matrimony: "matrimony",
  "helping-hand": "helping_hands",
  "prominent-people": "prominent_people",
  community: "community_feed",
  "search-members": "members",
  posts: "community_feed",
  advertisements: "advertisements"
};
