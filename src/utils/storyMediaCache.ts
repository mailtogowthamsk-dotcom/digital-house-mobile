/**
 * On-disk cache for Stories media (image + video).
 * Keyed by story id so refreshed signed query strings do not re-download.
 */

import * as FileSystem from "expo-file-system/legacy";
import { getImageUrl } from "../api/client";
import type { StoryGroup, StoryItem } from "../api/stories.api";

const DIR = `${FileSystem.cacheDirectory ?? ""}story-media-cache/`;
const META = `${DIR}index.json`;
/** Stories live ≤24h; keep a small buffer then evict. */
const MAX_AGE_MS = 26 * 60 * 60 * 1000;
const MAX_BYTES = 256 * 1024 * 1024;

type MetaEntry = { file: string; bytes: number; at: number; expiresAt?: number };
type MetaFile = Record<string, MetaEntry>;

const memory = new Map<string, string>(); // cacheKey -> local file://
const inflight = new Map<string, Promise<string>>();

function cacheKeyForStory(storyId: number, kind: "file" | "thumbnail" = "file"): string {
  return `story-${storyId}-${kind}`;
}

function hashKey(key: string): string {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

function extFromUri(uri: string, mediaType?: "image" | "video"): string {
  const path = uri.split("?")[0] ?? uri;
  const m = path.match(/\.(mp4|mov|m4v|webm|webp|jpg|jpeg|png|gif)$/i);
  if (m) return `.${m[1]!.toLowerCase()}`;
  return mediaType === "video" ? ".mp4" : ".webp";
}

function localPathFor(key: string, remoteUri: string, mediaType?: "image" | "video"): string {
  return `${DIR}${hashKey(key)}${extFromUri(remoteUri, mediaType)}`;
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
    return JSON.parse(await FileSystem.readAsStringAsync(META)) as MetaFile;
  } catch {
    return {};
  }
}

async function writeMeta(meta: MetaFile): Promise<void> {
  await FileSystem.writeAsStringAsync(META, JSON.stringify(meta));
}

async function evictStale(meta: MetaFile): Promise<MetaFile> {
  const now = Date.now();
  let changed = false;
  for (const [k, e] of Object.entries(meta)) {
    const expiredByAge = now - (e.at || 0) > MAX_AGE_MS;
    const expiredByStory = e.expiresAt != null && e.expiresAt <= now;
    if (!expiredByAge && !expiredByStory) continue;
    try {
      await FileSystem.deleteAsync(e.file, { idempotent: true });
    } catch {
      /* ignore */
    }
    delete meta[k];
    memory.delete(k);
    changed = true;
  }
  if (changed) await writeMeta(meta);
  return meta;
}

async function evictIfNeeded(meta: MetaFile): Promise<MetaFile> {
  meta = await evictStale(meta);
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

/** Memory / existing file only — never downloads. */
export async function getCachedStoryMediaUriIfExists(
  storyId: number,
  kind: "file" | "thumbnail" = "file"
): Promise<string | null> {
  if (!FileSystem.cacheDirectory) return null;
  const key = cacheKeyForStory(storyId, kind);
  const mem = memory.get(key);
  if (mem) return mem;

  await ensureDir();
  let meta = await readMeta();
  meta = await evictStale(meta);
  const entry = meta[key];
  if (!entry?.file) return null;
  try {
    const info = await FileSystem.getInfoAsync(entry.file);
    if (info.exists && !info.isDirectory && (info.size ?? 0) > 0) {
      memory.set(key, entry.file);
      return entry.file;
    }
  } catch {
    /* miss */
  }
  return null;
}

export type ResolveStoryMediaOpts = {
  mediaType?: "image" | "video";
  kind?: "file" | "thumbnail";
  /** Story expires_at ISO — used for cache eviction. */
  expiresAt?: string | null;
};

/**
 * Download once to disk, then always return file:// for that story id.
 * Falls back to remote URL if download fails.
 */
export async function resolveCachedStoryMediaUri(
  storyId: number,
  remoteUri: string,
  opts: ResolveStoryMediaOpts = {}
): Promise<string> {
  const kind = opts.kind ?? "file";
  const key = cacheKeyForStory(storyId, kind);
  if (!remoteUri?.trim() || !FileSystem.cacheDirectory) return remoteUri;

  const existing = await getCachedStoryMediaUriIfExists(storyId, kind);
  if (existing) return existing;

  const pending = inflight.get(key);
  if (pending) return pending;

  const job = (async () => {
    await ensureDir();
    const file = localPathFor(key, remoteUri, opts.mediaType);
    try {
      // Replace partial/corrupt leftovers.
      await FileSystem.deleteAsync(file, { idempotent: true });
      const result = await FileSystem.downloadAsync(remoteUri, file);
      if (result.status >= 200 && result.status < 300) {
        const sizeInfo = await FileSystem.getInfoAsync(file);
        const bytes =
          sizeInfo.exists && !sizeInfo.isDirectory ? sizeInfo.size ?? 0 : 0;
        if (bytes > 0) {
          let meta = await readMeta();
          meta[key] = {
            file,
            bytes,
            at: Date.now(),
            expiresAt: opts.expiresAt ? Date.parse(opts.expiresAt) || undefined : undefined
          };
          meta = await evictIfNeeded(meta);
          await writeMeta(meta);
          memory.set(key, file);
          return file;
        }
      }
    } catch {
      /* fall through */
    }
    return remoteUri;
  })();

  inflight.set(key, job);
  try {
    return await job;
  } finally {
    inflight.delete(key);
  }
}

/** Warm cache for a single story (fire-and-forget). */
export function prefetchStoryMedia(story: StoryItem | null | undefined): void {
  if (!story?.media_url || story.media_type === "text") return;
  const remote = getImageUrl(story.media_url);
  if (!remote) return;
  void resolveCachedStoryMediaUri(story.id, remote, {
    mediaType: story.media_type === "video" ? "video" : "image",
    expiresAt: story.expires_at
  }).catch(() => undefined);
}

/** Prefetch tray groups after home load — bounded count + concurrency (not entire tray). */
export function prefetchStoryGroups(
  groups: StoryGroup[] | null | undefined,
  opts?: { maxItems?: number; concurrency?: number; signal?: { cancelled?: boolean } }
): void {
  if (!groups?.length) return;
  const maxItems = Math.max(0, opts?.maxItems ?? 3);
  const concurrency = Math.max(1, opts?.concurrency ?? 2);
  if (maxItems === 0) return;

  const queue: StoryItem[] = [];
  outer: for (const g of groups) {
    for (const s of g.stories) {
      if (!s?.media_url || s.media_type === "text") continue;
      // Skip clearly expired items if expires_at is present.
      if (s.expires_at) {
        const exp = Date.parse(s.expires_at);
        if (Number.isFinite(exp) && exp <= Date.now()) continue;
      }
      queue.push(s);
      if (queue.length >= maxItems) break outer;
    }
  }
  if (!queue.length) return;

  let next = 0;
  const workers = Math.min(concurrency, queue.length);
  const runOne = async (): Promise<void> => {
    while (next < queue.length) {
      if (opts?.signal?.cancelled) return;
      const idx = next;
      next += 1;
      const story = queue[idx]!;
      const remote = getImageUrl(story.media_url);
      if (!remote) continue;
      try {
        await resolveCachedStoryMediaUri(story.id, remote, {
          mediaType: story.media_type === "video" ? "video" : "image",
          expiresAt: story.expires_at
        });
      } catch {
        /* ignore prefetch failures */
      }
    }
  };
  void Promise.all(Array.from({ length: workers }, () => runOne()));
}

/**
 * Prefetch upcoming stories while viewer is open.
 * Starts at the story AFTER the current one — current is already loaded by the viewer.
 * `ahead` = how many subsequent items to warm (use 1 for next-only).
 */
export function prefetchNearbyStories(
  groups: StoryGroup[],
  groupIndex: number,
  storyIndex: number,
  ahead = 1
): void {
  let remaining = Math.max(0, ahead);
  if (remaining === 0 || !groups.length) return;

  for (let gi = groupIndex; gi < groups.length && remaining > 0; gi++) {
    const g = groups[gi]!;
    // Same group: start after current; later groups: from first story.
    const start = gi === groupIndex ? storyIndex + 1 : 0;
    for (let si = start; si < g.stories.length && remaining > 0; si++) {
      prefetchStoryMedia(g.stories[si]);
      remaining -= 1;
    }
  }
}

/** Drop a story's cached bytes (e.g. after owner deletes). */
export async function invalidateStoryMediaCache(storyId: number): Promise<void> {
  for (const kind of ["file", "thumbnail"] as const) {
    const key = cacheKeyForStory(storyId, kind);
    memory.delete(key);
    try {
      let meta = await readMeta();
      const entry = meta[key];
      if (entry?.file) {
        await FileSystem.deleteAsync(entry.file, { idempotent: true });
      }
      if (meta[key]) {
        delete meta[key];
        await writeMeta(meta);
      }
    } catch {
      /* ignore */
    }
  }
}
