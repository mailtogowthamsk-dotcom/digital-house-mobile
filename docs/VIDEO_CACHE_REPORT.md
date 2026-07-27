# Feed Video Intelligent Cache — Implementation Report

**Project:** Digital House (Expo / expo-video / Cloudflare R2)  
**Date:** 2026-07-27  
**Goal:** Instagram Reels–style local reuse — scroll back to Video A without a full re-download.

---

## Audit findings (why Video A re-downloaded)

| # | Root cause | Impact |
|---|------------|--------|
| 1 | `expo-video` `VideoSource.useCaching` **defaults to `false`** | Native disk LRU never used; every remount re-fetched from R2 |
| 2 | Player unmounted when leaving viewport (`active`/`preload` only) | Decoder + in-memory buffers discarded; no “previous” retain |
| 3 | Warm-URI set keyed by **full signed URL** | Feed refresh → new `X-Amz-Signature` → treated as never seen → spinner + network |
| 4 | Session warm cache only (no disk) | Survived neither process kill nor true cache hits across remounts |
| 5 | `replaceAsync(null)` on unmount | Correct for memory; safe once disk cache is enabled |

R2 `Cache-Control: immutable` + server signed-URL cache already help CDN/signing CPU; they do **not** replace on-device player caching when `useCaching` is off.

---

## 1. Files modified

| File | Change |
|------|--------|
| `mobile/src/utils/videoSource.ts` | **New** — `buildFeedVideoSource()` with `useCaching: true` |
| `mobile/src/utils/videoUriWarmCache.ts` | Stable path keys + LRU (48) |
| `mobile/src/media/initVideoCache.ts` | **New** — `setVideoCacheSizeAsync(512MB)` at boot |
| `mobile/App.tsx` | Call `initFeedVideoDiskCache()` before players |
| `mobile/src/components/media/FeedVideoPlayer.tsx` | Cached `VideoSource`; retain mode; skip spinner on warm |
| `mobile/src/utils/feedVideoVisibility.ts` | Window = previous + current + next |
| `mobile/src/components/home/PostMedia.tsx` | Pass `isRetain` |
| `mobile/src/components/home/PostCard.tsx` | `isMediaRetain` prop |
| `mobile/src/components/home/FeedPostCardRow.tsx` | Wire retain flag |
| `mobile/src/screens/home/HomeScreen.tsx` | Track `retainMediaPostId` |
| `mobile/src/screens/explore/ExploreScreen.tsx` | Same window |
| `mobile/docs/VIDEO_CACHE_REPORT.md` | This report |

*(Existing `mergeFeedCardsPreservingMedia` in `useHome.ts` already keeps signed media URLs stable across feed refresh — required so disk cache keys match.)*

---

## 2. Why each modification was required

- **`useCaching: true`** — Turns on expo-video’s native LRU disk cache (the actual “download once” mechanism).
- **512MB cache size** — Persistent LRU budget for short feed MP4s; older clips evict first.
- **Stable warm keys** — Spinner / “already seen” must ignore signature query params.
- **Retain previous** — Keeps last clip mounted paused so A→B→A does not tear down A’s player.
- **Preload next** — Warms disk cache for B while watching A (no autoplay).

---

## 3. Cache implementation details

```
Signed R2 URL (stable across refresh when path unchanged)
        ↓
VideoSource { uri, useCaching: true, contentType: 'progressive' }
        ↓
expo-video native disk LRU (≤512MB, OS-managed eviction)
        ↓
Session warm map keyed by path-without-query (skip spinner)
```

- **Hit:** Remount / scroll-back with same object path → play from disk (no full GET body).
- **Miss:** First watch or evicted / expired / URL path changed → network.
- **Not supported by expo-video cache:** HLS on iOS, DRM (N/A for our progressive MP4s).

---

## 4. Player lifecycle

```
Previous (retain)     Current (active)      Next (preload)
   paused VideoView      playing               player only
   useCaching on         useCaching on         useCaching on
   no spinner if warm    autoplay              poster UI
```

Unmount only when outside that 3-wide window or Home loses focus (stack push) — frees decoders; **disk cache remains**.

---

## 5–7. Network / R2 / bandwidth (expected)

| Scenario | Before | After |
|----------|--------|-------|
| A → B → A (same session) | 2× full download of A | 1× A; return from disk / retained player |
| Watch A…E, back to C | Often re-fetch C | Disk hit if still in 512MB LRU |
| Feed refresh (new signatures, same path) | Remount treated as new URI | Preserved signed URL + path-stable warm key |

**Expected:** Large reduction in repeat R2 GETs for recently watched clips (often ~50–80% fewer bytes on heavy scroll-back sessions). First-watch bytes unchanged.

---

## 8. Scrolling smoothness

- No spinner on warm scroll-back.
- Retained previous player → near-instant resume.
- Preload next → fewer cold starts when advancing.

---

## 9. Memory impact

- Up to **3** native players in the feed window (was 2).
- Disk cache up to **512MB** (evicted LRU; not all in RAM).
- Leaving Home still unmounts players (focus gate).

---

## 10. Risks

| Risk | Mitigation |
|------|------------|
| Expo Go / old native binary without cache APIs | `setVideoCacheSizeAsync` / `useCaching` no-op or ignored; progressive playback still works |
| Signed URL expires while cached | Remount with fresh feed URL after expiry; path may re-download once |
| Low-storage devices | OS / LRU evicts; behavior degrades to network |
| 3 players on low-end phones | Window still capped; preload has no VideoView |

---

## 11. Rollback plan

1. Set `useCaching: false` in `buildFeedVideoSource`.
2. Remove `isRetain` / `retainMediaPostId` wiring (revert to active+preload only).
3. Remove `initFeedVideoDiskCache()` from `App.tsx`.

No DB / API contract / UI chrome changes to revert.

---

## Test scenarios (manual)

1. **A → B → A:** Instant A, no spinner, Charles/Proxyman should not show a second full body GET for A’s object.
2. **Feed → Messages → Feed:** Active clip resumes quickly from cache/retain.
3. **A…E → back to C:** Instant if still in LRU.
4. **Airplane mode after watching A:** A should still play from disk when returning (same process; cache persisted by native module).

---

## Session follow-up (post-cache audit)

Observed session metrics after first cache pass:

| Metric | Value | Meaning |
|--------|-------|---------|
| Videos | 1.05 GB | Dominant cost |
| Images | 180 MB | Too high for WebP feed |
| Duplicate video GETs | 18 | Signed-URL churn defeating URI caches |
| Duplicate image GETs | 42 | Same |
| Cache hit | 15% | expo-video keyed by full signed URI |
| Repeated signed URLs | YES | Root cause of misses |
| Bandwidth waste | ~820 MB | Re-fetches of already-seen media |

### Round-2 fixes

1. **Sticky signed URLs** (`stickySignedUrlCache.ts` + `getImageUrl`) — same object path keeps the same signature until near expiry.
2. **Path-keyed `file://` video cache** (`feedVideoFileCache.ts`) — download once; replay ignores new signatures entirely.
3. **Feed images prefer medium → thumb** (not full) on client + API.
4. **Signed GET default expiry** raised to **6h** on server to reduce minting churn across nodes.

Expected next session: cache hit ≫ 15%, duplicate video/image counts near 0 for scroll-back, images far below ~8 MB average when `_md` variants exist.
