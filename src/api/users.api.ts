import { api } from "./client";

export type DirectoryUser = {
  id: number;
  fullName: string;
  profileImage: string | null;
  online: boolean;
};

export async function listUsers(): Promise<DirectoryUser[]> {
  const res = await api.get<{ ok: true; users: DirectoryUser[] }>("/users");
  return res.data.users ?? [];
}

export async function searchUsers(q: string): Promise<DirectoryUser[]> {
  const res = await api.get<{ ok: true; users: DirectoryUser[] }>("/users/search", {
    params: { q }
  });
  return res.data.users ?? [];
}

