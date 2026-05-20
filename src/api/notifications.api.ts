import { api } from "./client";

export type NotificationItem = {
  id: number;
  title: string;
  body: string | null;
  readAt: string | null;
  createdAt: string;
};

export async function getNotifications(page = 1, limit = 30) {
  const { data } = await api.get<{
    ok: boolean;
    items: NotificationItem[];
    total: number;
    unread: number;
  }>("/notifications", { params: { page, limit } });
  if (!data?.ok) throw new Error("Failed to load notifications");
  return {
    items: data.items ?? [],
    total: data.total ?? 0,
    unread: data.unread ?? 0
  };
}

export async function markNotificationRead(id: number) {
  const { data } = await api.post<{ ok: boolean }>(`/notifications/${id}/read`);
  if (!data?.ok) throw new Error("Failed to mark read");
}

export async function markAllNotificationsRead() {
  const { data } = await api.post<{ ok: boolean }>("/notifications/read-all");
  if (!data?.ok) throw new Error("Failed to mark all read");
}
