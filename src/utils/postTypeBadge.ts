import Ionicons from "@expo/vector-icons/Ionicons";

export type PostTypeIconName = keyof typeof Ionicons.glyphMap;

export type PostTypeBadge = {
  icon: PostTypeIconName;
  color: string;
  label: string;
};

function normalizeType(postType?: string | null): string {
  return (postType || "")
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, "_");
}

/** Icon + color + a11y label for feed/profile post types. */
export function getPostTypeBadge(postType?: string | null): PostTypeBadge | null {
  const t = normalizeType(postType);
  if (!t) return null;

  if (t.includes("JOB")) {
    return { icon: "briefcase", color: "#0D9488", label: "Job" };
  }
  if (t.includes("MARKET")) {
    return { icon: "storefront", color: "#EA580C", label: "Marketplace" };
  }
  if (t.includes("ANNOUNCE")) {
    return { icon: "megaphone", color: "#2563EB", label: "Announcement" };
  }
  if (t.includes("ENTERTAIN")) {
    return { icon: "film", color: "#7C3AED", label: "Entertainment" };
  }
  if (t.includes("MEET")) {
    return { icon: "people", color: "#0284C7", label: "Meetup" };
  }
  if (t.includes("ACHIEVE")) {
    return { icon: "trophy", color: "#CA8A04", label: "Achievement" };
  }
  if (t.includes("HELP")) {
    return { icon: "hand-left", color: "#7C3AED", label: "Help request" };
  }
  if (t.includes("MATRIMONY") || t.includes("MATCH")) {
    return { icon: "heart", color: "#E11D48", label: "Matrimony" };
  }
  if (t === "GENERAL" || t === "POST" || t === "FEED" || t === "TEXT") {
    return null;
  }

  return {
    icon: "document-text",
    color: "#2563EB",
    label: (postType || "").trim() || "Post"
  };
}

export function postTypeVisual(postType?: string | null): PostTypeBadge {
  return (
    getPostTypeBadge(postType) ?? {
      icon: "document-text",
      color: "#2563EB",
      label: "Post"
    }
  );
}
