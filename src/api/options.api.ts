import { api } from "./client";

export type OptionItem = { id: number; name: string };

export async function getLocations(): Promise<OptionItem[]> {
  const { data } = await api.get<{ ok: boolean; locations: OptionItem[] }>("/options/locations");
  if (!data.ok || !Array.isArray(data.locations)) return [];
  return data.locations;
}

export async function getKulams(): Promise<OptionItem[]> {
  const { data } = await api.get<{ ok: boolean; kulams: OptionItem[] }>("/options/kulams");
  if (!data.ok || !Array.isArray(data.kulams)) return [];
  return data.kulams;
}
