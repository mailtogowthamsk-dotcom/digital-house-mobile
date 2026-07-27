/**
 * Path-keyed on-disk video cache.
 * Downloads once to file://… so later playback ignores new signed query strings
 * (expo-video useCaching alone keys by full URI → duplicate GETs).
 */

import * as FileSystem from "expo-file-system/legacy";
import { stableMediaCacheKey } from "./imageDimensions";
import { stickySignedMediaUrl } from "./stickySignedUrlCache";
import { markVideoUriWarmed, isVideoUriWarmed } from "./videoUriWarmCache";

const DIR = `${FileSystem.cacheDirectory ?? ""}feed-video-cache/`;
const MAX_BYTES = 512 * 1024 * 1024;
const META = `${DIR}index.json`;

type MetaEntry = { file: string; bytes: number; at: number };
type MetaFile = Record<string, MetaEntry>;

const memory = new Map<string, string>(); // pathKey -> localUri
const inflight = new Map<string, Promise<string>>();

function hashKey(pathKey: string): string {
  let h = 2166136261;
  for (let i = 0; i < pathKey.length; i++) {
    h ^= pathKey.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

function extFromUri(uri: string): string {
  const path = uri.split("?")[0] ?? uri;
  const m = path.match(/\.(mp4|mov|m4v|webm)$/i);
  return m ? `.${m[1]!.toLowerCase()}` : ".mp4";
}

function localPathFor(pathKey: string, remoteUri: string): string {
  return `${DIR}${hashKey(pathKey)}${extFromUri(remoteUri)}`;
}

async function ensureDir(): Promise<void> {
  if (!FileSystem.cacheDirectory) return;
  const info = await FileSystem.getInfoAsync(DIR);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(DIR, { intermediates: true });
  }
}

async function readMeta(): Promise<MetaFile> {
  try {
    const info = await FileSystem.getInfoAsync(META);
    if (!info.exists) return {};
    const raw = await FileSystem.readAsStringAsync(META);
    return JSON.parse(raw) as MetaFile;
  } catch {
    return {};
  }
}

async function writeMeta(meta: MetaFile): Promise<void> {
  await FileSystem.writeAsStringAsync(META, JSON.stringify(meta));
}

async function evictIfNeeded(meta: MetaFile): Promise<MetaFile> {
  let total = Object.values(meta).reduce((s, e) => s + (e.bytes || 0), 0);
  if (total <= MAX_BYTES) return meta;
  const ordered = Object.entries(meta).sort((a, b) => a[1].at - b[1].at);
  for (const [k, e] of ordered) {
    if (total <= MAX_BYTES * 0.8) break;
    try {
      await FileSystem.deleteAsync(e.file, { idempotent: true });
    } catch {
      /* ignore */
    }
    total -= e.bytes || 0;
    delete meta[k];
    memory.delete(k);
  }
  await writeMeta(meta);
  return meta;
}

/** Fast path: memory or existing file — never downloads. */
export async function getLocalVideoUriIfExists(
  remoteUri: string | null | undefined
): Promise<string | null> {
  if (!remoteUri?.trim() || !FileSystem.cacheDirectory) return null;
  const sticky = stickySignedMediaUrl(remoteUri) ?? remoteUri;
  const pathKey = stableMediaCacheKey(sticky);
  if (!pathKey) return null;

  const mem = memory.get(pathKey);
  if (mem) return mem;

  await ensureDir();
  const file = localPathFor(pathKey, sticky);
  try {
    const info = await FileSystem.getInfoAsync(file);
    if (info.exists && !info.isDirectory && (info.size ?? 0) > 0) {
      memory.set(pathKey, file);
      markVideoUriWarmed(pathKey);
      return file;
    }
  } catch {
    /* miss */
  }
  return null;
}

/**
 * Ensure video bytes live under a stable file path. Downloads at most once per object.
 * Returns local file URI when possible, else sticky remote URL.
 */
export async function resolveCachedVideoUri(remoteUri: string): Promise<string> {
  const sticky = stickySignedMediaUrl(remoteUri) ?? remoteUri;
  const pathKey = stableMediaCacheKey(sticky);
  if (!pathKey || !FileSystem.cacheDirectory) return sticky;

  const existing = await getLocalVideoUriIfExists(sticky);
  if (existing) return existing;

  const pending = inflight.get(pathKey);
  if (pending) return pending;

  const job = (async () => {
    await ensureDir();
    const file = localPathFor(pathKey, sticky);
    try {
      const result = await FileSystem.downloadAsync(sticky, file);
      if (result.status >= 200 && result.status < 300) {
        const sizeInfo = await FileSystem.getInfoAsync(file);
        const bytes = sizeInfo.exists && !sizeInfo.isDirectory ? sizeInfo.size ?? 0 : 0;
        let meta = await readMeta();
        meta[pathKey] = { file, bytes, at: Date.now() };
        meta = await evictIfNeeded(meta);
        await writeMeta(meta);
        memory.set(pathKey, file);
        markVideoUriWarmed(pathKey);
        return file;
      }
    } catch {
      /* fall through */
    }
    return sticky;
  })();

  inflight.set(pathKey, job);
  try {
    return await job;
  } finally {
    inflight.delete(pathKey);
  }
}

export function peekCachedVideoUri(remoteUri: string | null | undefined): string | null {
  if (!remoteUri) return null;
  const pathKey = stableMediaCacheKey(remoteUri);
  return pathKey ? memory.get(pathKey) ?? null : null;
}

export function isVideoFileCached(remoteUri: string | null | undefined): boolean {
  if (!remoteUri) return false;
  const pathKey = stableMediaCacheKey(remoteUri);
  if (pathKey && memory.has(pathKey)) return true;
  return isVideoUriWarmed(remoteUri);
}
