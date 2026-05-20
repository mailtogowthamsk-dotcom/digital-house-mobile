import { Share, Platform } from "react-native";

const APP_SCHEME = "digitalhouse";

function webBaseUrl(): string {
  const api = process.env.EXPO_PUBLIC_API_URL ?? "";
  if (api.includes("/api")) {
    return api.replace(/\/api\/?$/, "");
  }
  const explicit = process.env.EXPO_PUBLIC_WEB_BASE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  return "https://www.infosensetechnologies.com/digitalhouse";
}

/** Public deep link — opens post in app when installed, else web path */
export function buildPostShareUrl(postId: number): string {
  return `${webBaseUrl()}/post/${postId}`;
}

export function buildPostAppLink(postId: number): string {
  return `${APP_SCHEME}://post/${postId}`;
}

export type SharePostPayload = {
  postId: number;
  title: string;
  authorName?: string;
  description?: string;
};

export async function sharePost(payload: SharePostPayload): Promise<boolean> {
  const url = buildPostShareUrl(payload.postId);
  const appLink = buildPostAppLink(payload.postId);
  const author = payload.authorName?.trim();
  const lines = [
    payload.title,
    author ? `— ${author} on Digital House` : "— Digital House",
    payload.description?.trim() ? payload.description.trim().slice(0, 200) : null,
    "",
    "Open in app:",
    appLink,
    "View online:",
    url
  ].filter(Boolean) as string[];

  try {
    const result = await Share.share(
      Platform.OS === "ios"
        ? { message: lines.join("\n"), url }
        : { message: lines.join("\n"), title: payload.title }
    );
    return result.action !== Share.dismissedAction;
  } catch {
    return false;
  }
}
