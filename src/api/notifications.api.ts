import { api } from "./client";

export type NotificationCategory =
  | "ALL"
  | "SOCIAL"
  | "MATRIMONY"
  | "MESSAGES"
  | "COMMUNITY"
  | "SYSTEM";

export type NotificationItem = {
  id: number;
  type: string;
  category: NotificationCategory;
  title: string;
  body: string | null;
  image: string | null;
  actionType: string | null;
  actionTargetId: string | null;
  actorUserId: number | null;
  actorName: string | null;
  groupCount: number;
  priority: number;
  isRead: boolean;
  readAt: string | null;
  createdAt: string;
};

export type UnreadCounts = {
  total: number;
  social: number;
  matrimony: number;
  messages: number;
  community: number;
  system: number;
};

export type NotificationPreferences = {
  socialEnabled: boolean;
  matrimonyEnabled: boolean;
  messagesEnabled: boolean;
  communityEnabled: boolean;
  systemEnabled: boolean;
  pushEnabled: boolean;
};

export async function getNotificationCounts(): Promise<UnreadCounts> {
  const { data } = await api.get<{ ok: boolean } & UnreadCounts>("/notifications/counts");
  if (!data?.ok) throw new Error("Failed to load counts");
  return {
    total: data.total ?? 0,
    social: data.social ?? 0,
    matrimony: data.matrimony ?? 0,
    messages: data.messages ?? 0,
    community: data.community ?? 0,
    system: data.system ?? 0
  };
}

export async function getNotifications(
  page = 1,
  limit = 25,
  category: NotificationCategory = "ALL"
) {
  const { data } = await api.get<{
    ok: boolean;
    items: NotificationItem[];
    total: number;
    counts: UnreadCounts;
  }>("/notifications", { params: { page, limit, category } });
  if (!data?.ok) throw new Error("Failed to load notifications");
  return {
    items: data.items ?? [],
    total: data.total ?? 0,
    counts: data.counts
  };
}

export async function markNotificationRead(id: number) {
  const { data } = await api.post<{ ok: boolean; counts: UnreadCounts }>(
    `/notifications/${id}/read`
  );
  if (!data?.ok) throw new Error("Failed to mark read");
  return data.counts;
}

export async function markAllNotificationsRead(category: NotificationCategory = "ALL") {
  const { data } = await api.post<{ ok: boolean; counts: UnreadCounts }>(
    "/notifications/read-all",
    null,
    { params: category !== "ALL" ? { category } : {} }
  );
  if (!data?.ok) throw new Error("Failed to mark all read");
  return data.counts;
}

export async function deleteNotification(id: number) {
  const { data } = await api.delete<{ ok: boolean; counts: UnreadCounts }>(
    `/notifications/${id}`
  );
  if (!data?.ok) throw new Error("Failed to delete");
  return data.counts;
}

export async function deleteAllNotifications(category: NotificationCategory = "ALL") {
  const { data } = await api.post<{ ok: boolean; counts: UnreadCounts }>(
    "/notifications/clear-all",
    null,
    { params: category !== "ALL" ? { category } : {} }
  );
  if (!data?.ok) throw new Error("Failed to clear notifications");
  return data.counts;
}

export async function deleteNotificationsBulk(ids: number[]) {
  const { data } = await api.post<{ ok: boolean; counts: UnreadCounts }>(
    "/notifications/bulk-delete",
    { ids }
  );
  if (!data?.ok) throw new Error("Failed to delete");
  return data.counts;
}

export async function getNotificationPreferences(): Promise<NotificationPreferences> {
  const { data } = await api.get<{ ok: boolean } & NotificationPreferences>(
    "/notifications/preferences"
  );
  if (!data?.ok) throw new Error("Failed to load preferences");
  return normalizePreferences(data);
}

export async function updateNotificationPreferences(
  patch: Partial<NotificationPreferences>
): Promise<NotificationPreferences> {
  const { data } = await api.patch<{ ok: boolean } & NotificationPreferences>(
    "/notifications/preferences",
    patch
  );
  if (!data?.ok) throw new Error("Failed to update preferences");
  return normalizePreferences(data);
}

function normalizePreferences(
  data: Partial<NotificationPreferences> & { ok?: boolean }
): NotificationPreferences {
  return {
    socialEnabled: !!data.socialEnabled,
    matrimonyEnabled: !!data.matrimonyEnabled,
    messagesEnabled: !!data.messagesEnabled,
    communityEnabled: !!data.communityEnabled,
    systemEnabled: !!data.systemEnabled,
    pushEnabled: !!data.pushEnabled
  };
}

export async function registerPushToken(input: {
  token: string;
  platform: "ios" | "android" | "web";
  deviceId?: string | null;
  appVersion?: string | null;
}) {
  const { data } = await api.post<{ ok: boolean }>("/notifications/push-token", input, {
    timeout: 12_000
  });
  if (!data?.ok) throw new Error("Failed to register push token");
}
