# Feed Video Flicker Audit

**Scope:** Home / Explore feed video scroll-back flicker only
**Constraint:** No business-logic / interaction changes

---

## Round 1 — player teardown

`FeedVideoPlayer` mounted the native player only when `isActive`, so scrolling away
destroyed the decoder and scrolling back rebuilt it.

**Fix:** mount the player for **active + retain** (previous item), pause instead of
unmounting, keep preload poster-only. Max ≈ 2 native players.

This removed the remount on ±1 scroll-back but did **not** remove the blink.

---

## Round 2 — the remaining blink (current root cause)

Round 1 also added "never re-show the poster on scroll-back", on the theory that the
poster was the flash. That inverted the problem:

```ts
const [posterMounted, setPosterMounted] = useState(!alreadyWarmed); // false when cached
const posterOpacity = useRef(new Animated.Value(alreadyWarmed ? 0 : 1)).current;
```

For a cached clip `alreadyWarmed` is `true`, so the player mounted with **no poster at
all**. A `VideoView` paints black until its decoder produces a first frame, and the
wrapper background is `#0B1220`, so every remount showed a **black rectangle** for the
duration of the attach + first decode.

That is the blink. It is not a re-download and not a thumbnail flash — it is an
uncovered video surface. It only appeared on *cached* clips, which is exactly the
reported symptom, because the cold path still had its poster.

Second contributor: `shouldMountPlayer` included `isScreenFocused`, so navigating away
from the feed and back destroyed and recreated the decoder even though the row never
moved.

---

## Fix applied

1. **Poster always covers a fresh mount**, cached or not, and cross-fades out once the
   player reports it can paint. The thumbnail is served from expo-image's memory/disk
   cache, so it paints in the same frame — no black, no loader, no re-download.
2. **One transition per mount.** `hasPaintedFrameRef` makes the fade fire exactly once;
   while the player stays mounted (active ↔ retain) the poster never returns, so pausing
   and resuming shows the last decoded frame rather than the thumbnail.
3. **Focus no longer gates mounting.** `usePlaybackAllowed` already gates playback, so
   blur now pauses instead of destroying the decoder.
4. **Paused glyph suppressed while the poster is up.** A warm remount reports `ready`
   before `playing`, which briefly flashed the play icon over the thumbnail. The error
   path still shows it so a failed source keeps a retry affordance.

Loader behaviour is unchanged: cold network load only, never for warm / file / painted.

---

## Unchanged (verified, no edit needed)

| Area | State |
|------|-------|
| `windowSize` / `maxToRenderPerBatch` / `initialNumToRender` | 5 / 3 / 3 |
| `removeClippedSubviews` | `false` — avoids blank media rows |
| `keyExtractor` | `item.id`, stable |
| `FeedPostCardRow`, `PostCard`, `PostMedia` | memoed, media flags compared explicitly |
| `ActiveFeedVideoPlayer` key | `stableBootKey(uri)` — signature-independent |
| Cache | `useCaching: true` + sticky signed URLs |
| Active-item switch | 180ms hysteresis, applied synchronously on first assignment |

Far-away rows still recycle and remount; that is the intended memory tradeoff, and the
poster now covers that remount too.
