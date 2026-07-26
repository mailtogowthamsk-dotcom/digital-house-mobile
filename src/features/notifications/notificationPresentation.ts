import type { NotificationItem, NotificationCategory, UnreadCounts } from "../../api/notifications.api";

export type NotificationVisual = {
  icon: string;
  accent: string;
  accentSoft: string;
};

const MATRIMONY_PRIORITY_TYPES = new Set([
  "MATRIMONY_INTEREST_RECEIVED",
  "MATRIMONY_INTEREST_ACCEPTED",
  "MATRIMONY_INTEREST_DECLINED",
  "MATRIMONY_MATCH",
  "MATRIMONY_MATCH_REMOVED",
  "MATRIMONY_PROFILE_APPROVED",
  "MATRIMONY_APPLICATION_SUBMITTED",
  "MATRIMONY_CHANGES_REQUESTED",
  "MATRIMONY_CONTACT_UNLOCKED",
  "MATRIMONY_PAYMENT_SUCCESS",
  "MATRIMONY_SUBSCRIPTION_ACTIVATED",
  "MATRIMONY_SUBSCRIPTION_EXPIRED"
]);

export function isMatrimonyHighlight(item: NotificationItem): boolean {
  return (
    item.priority > 0 ||
    MATRIMONY_PRIORITY_TYPES.has(item.type) ||
    (item.category === "MATRIMONY" &&
      (item.type.includes("INTEREST") ||
        item.type.includes("MATCH") ||
        item.type.includes("APPROVED") ||
        item.type.includes("CHANGES")))
  );
}

export function getNotificationVisual(type: string, category: NotificationCategory): NotificationVisual {
  switch (type) {
    case "MESSAGE_NEW":
    case "MESSAGE_REQUEST":
    case "MESSAGE_MEDIA":
      return { icon: "chatbubble-ellipses", accent: "#2563EB", accentSoft: "rgba(37, 99, 235, 0.12)" };
    case "MATRIMONY_INTEREST_RECEIVED":
      return { icon: "heart", accent: "#7C3AED", accentSoft: "rgba(124, 58, 237, 0.14)" };
    case "MATRIMONY_INTEREST_ACCEPTED":
      return { icon: "heart-circle", accent: "#7C3AED", accentSoft: "rgba(124, 58, 237, 0.14)" };
    case "MATRIMONY_INTEREST_DECLINED":
      return { icon: "heart-dislike", accent: "#64748B", accentSoft: "rgba(100, 116, 139, 0.12)" };
    case "MATRIMONY_MATCH":
      return { icon: "sparkles", accent: "#DB2777", accentSoft: "rgba(219, 39, 119, 0.12)" };
    case "MATRIMONY_MATCH_REMOVED":
      return { icon: "heart-dislike", accent: "#64748B", accentSoft: "rgba(100, 116, 139, 0.12)" };
    case "MATRIMONY_PROFILE_APPROVED":
    case "ACCOUNT_VERIFIED":
      return { icon: "shield-checkmark", accent: "#059669", accentSoft: "rgba(5, 150, 105, 0.12)" };
    case "MATRIMONY_PROFILE_REJECTED":
    case "ACCOUNT_REJECTED":
      return { icon: "close-circle", accent: "#DC2626", accentSoft: "rgba(220, 38, 38, 0.1)" };
    case "MATRIMONY_CHANGES_REQUESTED":
    case "ACCOUNT_REVIEW":
      return { icon: "create", accent: "#D97706", accentSoft: "rgba(217, 119, 6, 0.12)" };
    case "MATRIMONY_PROFILE_VIEWED":
      return { icon: "eye", accent: "#7C3AED", accentSoft: "rgba(124, 58, 237, 0.1)" };
    case "MATRIMONY_APPLICATION_SUBMITTED":
      return { icon: "document-text", accent: "#2563EB", accentSoft: "rgba(37, 99, 235, 0.12)" };
    case "MATRIMONY_CONTACT_UNLOCKED":
      return { icon: "call", accent: "#059669", accentSoft: "rgba(5, 150, 105, 0.12)" };
    case "MATRIMONY_PAYMENT_SUCCESS":
    case "MATRIMONY_SUBSCRIPTION_ACTIVATED":
      return { icon: "checkmark-circle", accent: "#059669", accentSoft: "rgba(5, 150, 105, 0.12)" };
    case "MATRIMONY_PAYMENT_FAILED":
      return { icon: "close-circle", accent: "#DC2626", accentSoft: "rgba(220, 38, 38, 0.1)" };
    case "MATRIMONY_PREMIUM_EXPIRING":
      return { icon: "time", accent: "#D97706", accentSoft: "rgba(217, 119, 6, 0.12)" };
    case "MATRIMONY_SUBSCRIPTION_EXPIRED":
      return { icon: "alert-circle", accent: "#64748B", accentSoft: "rgba(100, 116, 139, 0.12)" };
    case "POST_LIKE":
      return { icon: "heart", accent: "#E11D48", accentSoft: "rgba(225, 29, 72, 0.1)" };
    case "POST_COMMENT":
    case "COMMENT_REPLY":
      return { icon: "chatbubble", accent: "#0EA5E9", accentSoft: "rgba(14, 165, 233, 0.12)" };
    case "POST_MENTION":
      return { icon: "at", accent: "#2563EB", accentSoft: "rgba(37, 99, 235, 0.12)" };
    case "POST_SHARE":
      return { icon: "paper-plane", accent: "#6366F1", accentSoft: "rgba(99, 102, 241, 0.12)" };
    case "USER_FOLLOW":
      return { icon: "person-add", accent: "#2563EB", accentSoft: "rgba(37, 99, 235, 0.12)" };
    case "COMMUNITY_ANNOUNCEMENT":
    case "ADMIN_BROADCAST":
      return { icon: "megaphone", accent: "#EA580C", accentSoft: "rgba(234, 88, 12, 0.12)" };
    case "COMMUNITY_EVENT":
      return { icon: "calendar", accent: "#EA580C", accentSoft: "rgba(234, 88, 12, 0.12)" };
    case "COMMUNITY_UPDATE":
      return { icon: "newspaper", accent: "#EA580C", accentSoft: "rgba(234, 88, 12, 0.12)" };
    default:
      if (category === "MESSAGES") {
        return { icon: "chatbubble-outline", accent: "#2563EB", accentSoft: "rgba(37, 99, 235, 0.12)" };
      }
      if (category === "MATRIMONY") {
        return { icon: "heart-outline", accent: "#7C3AED", accentSoft: "rgba(124, 58, 237, 0.12)" };
      }
      if (category === "SOCIAL") {
        return { icon: "people", accent: "#2563EB", accentSoft: "rgba(37, 99, 235, 0.12)" };
      }
      if (category === "COMMUNITY") {
        return { icon: "megaphone-outline", accent: "#EA580C", accentSoft: "rgba(234, 88, 12, 0.12)" };
      }
      return { icon: "notifications", accent: "#64748B", accentSoft: "rgba(100, 116, 139, 0.12)" };
  }
}

export function formatNotificationTime(iso: string, now = Date.now()): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";

  const diffSec = Math.max(0, Math.floor((now - then) / 1000));
  if (diffSec < 60) return "Now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;

  const thenDate = new Date(then);
  const nowDate = new Date(now);
  const startOfToday = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()).getTime();
  const startOfThen = new Date(
    thenDate.getFullYear(),
    thenDate.getMonth(),
    thenDate.getDate()
  ).getTime();
  const dayDiff = Math.floor((startOfToday - startOfThen) / 86400000);

  if (dayDiff === 1) return "Yesterday";
  if (dayDiff < 7) return `${dayDiff} days ago`;
  return thenDate.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export type DateGroupKey = "today" | "yesterday" | "week" | "older";

export function getDateGroupKey(iso: string, now = Date.now()): DateGroupKey {
  const then = new Date(iso).getTime();
  const nowDate = new Date(now);
  const thenDate = new Date(then);
  const startOfToday = new Date(nowDate.getFullYear(), nowDate.getMonth(), nowDate.getDate()).getTime();
  const startOfThen = new Date(
    thenDate.getFullYear(),
    thenDate.getMonth(),
    thenDate.getDate()
  ).getTime();
  const dayDiff = Math.floor((startOfToday - startOfThen) / 86400000);

  if (dayDiff <= 0) return "today";
  if (dayDiff === 1) return "yesterday";
  if (dayDiff < 7) return "week";
  return "older";
}

export const DATE_GROUP_LABELS: Record<DateGroupKey, string> = {
  today: "Today",
  yesterday: "Yesterday",
  week: "Earlier This Week",
  older: "Older"
};

const GROUP_ORDER: DateGroupKey[] = ["today", "yesterday", "week", "older"];

export type NotificationSection = {
  title: string;
  key: string;
  data: NotificationItem[];
};

export function groupNotificationsByDate(items: NotificationItem[]): NotificationSection[] {
  const buckets: Record<DateGroupKey, NotificationItem[]> = {
    today: [],
    yesterday: [],
    week: [],
    older: []
  };
  for (const item of items) {
    buckets[getDateGroupKey(item.createdAt)].push(item);
  }
  return GROUP_ORDER.filter((k) => buckets[k].length > 0).map((k) => ({
    key: k,
    title: DATE_GROUP_LABELS[k],
    data: buckets[k]
  }));
}

export type SummaryLine = { label: string; count: number; category: NotificationCategory };

export function buildActivitySummary(counts: UnreadCounts): SummaryLine[] {
  const lines: SummaryLine[] = [];
  if (counts.messages > 0) {
    lines.push({
      label: counts.messages === 1 ? "Unread Message" : "Unread Messages",
      count: counts.messages,
      category: "MESSAGES"
    });
  }
  if (counts.matrimony > 0) {
    lines.push({
      label: counts.matrimony === 1 ? "Matrimony Update" : "Matrimony Updates",
      count: counts.matrimony,
      category: "MATRIMONY"
    });
  }
  if (counts.social > 0) {
    lines.push({
      label: counts.social === 1 ? "Social Activity" : "Social Activities",
      count: counts.social,
      category: "SOCIAL"
    });
  }
  if (counts.community > 0) {
    lines.push({
      label: counts.community === 1 ? "Community Announcement" : "Community Updates",
      count: counts.community,
      category: "COMMUNITY"
    });
  }
  if (counts.system > 0) {
    lines.push({
      label: counts.system === 1 ? "System Notice" : "System Notices",
      count: counts.system,
      category: "SYSTEM"
    });
  }
  return lines;
}

export const FILTER_TABS: { id: NotificationCategory; label: string }[] = [
  { id: "ALL", label: "All" },
  { id: "MESSAGES", label: "Messages" },
  { id: "MATRIMONY", label: "Matrimony" },
  { id: "SOCIAL", label: "Social" },
  { id: "COMMUNITY", label: "Community" },
  { id: "SYSTEM", label: "System" }
];
