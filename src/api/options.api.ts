import { api } from "./client";

export type OptionItem = { id: number; name: string };

export type MasterDataItem = {
  id: number;
  type_code: string;
  code: string | null;
  label: string;
  parent_id: number | null;
  sort_order: number;
  is_active: boolean;
};

const memoryCache = new Map<string, { at: number; value: unknown }>();
const MEMORY_TTL_MS = 5 * 60 * 1000;

function memGet<T>(key: string): T | null {
  const hit = memoryCache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > MEMORY_TTL_MS) {
    memoryCache.delete(key);
    return null;
  }
  return hit.value as T;
}

function memSet(key: string, value: unknown) {
  memoryCache.set(key, { at: Date.now(), value });
}

/** Clear in-memory master data cache (e.g. after pull-to-refresh). */
export function clearMasterDataCache() {
  memoryCache.clear();
}

/** Legacy — districts from MDM (or locations fallback). */
export async function getLocations(): Promise<OptionItem[]> {
  const { data } = await api.get<{ ok: boolean; locations: OptionItem[] }>("/options/locations");
  if (!data.ok || !Array.isArray(data.locations)) return [];
  return data.locations;
}

/** Legacy — kulams from MDM. */
export async function getKulams(): Promise<OptionItem[]> {
  const { data } = await api.get<{ ok: boolean; kulams: OptionItem[] }>("/options/kulams");
  if (!data.ok || !Array.isArray(data.kulams)) return [];
  return data.kulams;
}

export async function getMasterItems(
  typeCode: string,
  opts?: { parentId?: number; q?: string }
): Promise<MasterDataItem[]> {
  const key = `items|${typeCode}|${opts?.parentId ?? ""}|${opts?.q ?? ""}`;
  const cached = memGet<MasterDataItem[]>(key);
  if (cached) return cached;

  const { data } = await api.get<{ ok: boolean; items: MasterDataItem[] }>(
    `/options/${encodeURIComponent(typeCode)}`,
    {
      params: {
        ...(opts?.parentId != null ? { parentId: opts.parentId } : {}),
        ...(opts?.q ? { q: opts.q } : {})
      }
    }
  );
  const items = data.ok && Array.isArray(data.items) ? data.items : [];
  memSet(key, items);
  return items;
}

export async function getMasterBundle(
  types?: string[]
): Promise<Record<string, MasterDataItem[]>> {
  const typeList =
    types ??
    [
      "DISTRICT",
      "KULAM",
      "EDUCATION",
      "OCCUPATION",
      "BLOOD_GROUP",
      "MARITAL_STATUS",
      "LANGUAGE",
      "MARKETPLACE_CATEGORY"
    ];
  const key = `bundle|${typeList.join(",")}`;
  const cached = memGet<Record<string, MasterDataItem[]>>(key);
  if (cached) return cached;

  const { data } = await api.get<{
    ok: boolean;
    bundle: Record<string, MasterDataItem[]>;
  }>("/options/bundle", { params: { types: typeList.join(",") } });

  const bundle = data.ok && data.bundle ? data.bundle : {};
  memSet(key, bundle);
  return bundle;
}

export function masterItemsToDropdown(
  items: MasterDataItem[]
): { label: string; value: string }[] {
  return items.map((i) => ({ label: i.label, value: i.label }));
}
