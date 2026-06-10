import { api } from "./client";

export type RelationshipStatus =
  | "none"
  | "pending_sent"
  | "pending_received"
  | "connected"
  | "rejected";

export type ConnectionUser = {
  id: number;
  fullName: string;
  username: string;
  profileImage: string | null;
};

export type ConnectionItem = {
  id: number;
  user: ConnectionUser;
  createdAt: string;
};

export async function listConnectionRequests(): Promise<ConnectionItem[]> {
  const res = await api.get<{ ok: true; requests: ConnectionItem[] }>("/connections/requests");
  return res.data.requests ?? [];
}

export async function listConnections(): Promise<ConnectionItem[]> {
  const res = await api.get<{ ok: true; connections: ConnectionItem[] }>("/connections");
  return res.data.connections ?? [];
}

export async function getConnectionRequestCount(): Promise<number> {
  const res = await api.get<{ ok: true; count: number }>("/connections/requests/count");
  return res.data.count ?? 0;
}

export async function sendConnectionRequest(userId: number) {
  const res = await api.post<{
    ok: true;
    status: RelationshipStatus;
    autoAccepted: boolean;
  }>(`/connections/${userId}/request`);
  return res.data;
}

export async function acceptConnectionRequest(userId: number) {
  const res = await api.post<{ ok: true; status: RelationshipStatus }>(
    `/connections/${userId}/accept`
  );
  return res.data;
}

export async function rejectConnectionRequest(userId: number) {
  const res = await api.post<{ ok: true; status: RelationshipStatus }>(
    `/connections/${userId}/reject`
  );
  return res.data;
}

export async function cancelConnectionRequest(userId: number) {
  const res = await api.post<{ ok: true; status: RelationshipStatus }>(
    `/connections/${userId}/cancel`
  );
  return res.data;
}

export async function disconnectConnection(userId: number) {
  const res = await api.post<{ ok: true; status: RelationshipStatus }>(
    `/connections/${userId}/disconnect`
  );
  return res.data;
}
