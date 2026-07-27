# React Native Performance Audit — Digital House Mobile

> **Update (2026-07-27):** Critical + High fixes implemented — see [`REACT_NATIVE_OPTIMIZATION_CHANGELOG.md`](./REACT_NATIVE_OPTIMIZATION_CHANGELOG.md).
> This document remains the pre-change baseline.

| Field | Value |
|-------|--------|
| **Project** | Digital House (`mobile/`) |
| **Stack** | Expo + React Native + React Navigation (native stack) |
| **Scope** | FlatList, memoization, re-renders, media, navigation, leaks, timers, animations, network, caching |
| **Method** | Static code inspection (no profiling session / Flipper) |
| **Date** | 2026-07-27 |
| **Code modified** | **None** (audit only; see optimization changelog for implementation) |

---

## Executive summary

The feed media path (expo-image, active+next video, buffer caps) is in good shape after Prompt 6. The largest remaining performance cost is **memoization that does not work**: Home/Explore rebuild every `post` object and pass new callback props each render, so `React.memo` on `PostCard` / `PostMedia` / `FeedVideoPlayer` rarely skips work. Secondary hotspots: **RN `Image` for avatars/matrimony/profile grids**, **no API response cache** (refetch on focus/resume), and **notification/theme context** fan-out into the feed tree.

| Severity | Count |
|----------|------:|
| Critical | 2 |
| High | 10 |
| Medium | 14 |
| Low / Info | 12 |
| **Total findings** | **38** |

### Fix first (recommendations only — not implemented)

1. Stop spreading new `post={{ ...item, isMediaActive }}` — pass media flags as separate props (or stabilize with custom `memo` compare).
2. Stabilize feed `renderItem` handlers (`useCallback` + stable deps) so card memos can win.
3. Memoize `ThemeProvider` value; isolate notification badge from Home FlatList tree.
4. Migrate `AvatarImage` / matrimony / profile grid to `expo-image` with `cachePolicy="memory-disk"`.
5. Deduplicate focus fetches (Profile / My Posts / Matrimony browse) and avoid full Home refetch on every resume.

---

## 1. FlatList

### Inventory (priority surfaces)

| Location | Virtualization tuning | Stable `renderItem` | Notes |
|----------|----------------------|---------------------|-------|
| `HomeScreen.tsx` | Yes (`windowSize={7}`, `removeClippedSubviews`, batch caps) | Callback exists but deps force churn | Best-tuned list; memo defeated by props |
| `ExploreScreen.tsx` | Partial | Same pattern as Home | Inline `keyExtractor` / styles; header remounts on typing |
| `ChatMessageList.tsx` | Partial; `removeClippedSubviews={false}` | Stable | Intentional for inverted chat |
| `MessagesScreen.tsx` / hub threads | Missing window/batch/clip | Partial | Composer keystrokes re-render threads |
| Matrimony Browse / Matches / Saved / Interests / Views | Missing | Inline `renderItem` | Cards unmemoized |
| `CommentSheet.tsx` | Clip off | Stable + memo row | Inline separator recreates component type |
| `NotificationCenterScreen.tsx` | Reasonable | Inline section header | SectionList |

No FlashList usage found.

### Critical / High FlatList issues

| ID | Sev | Finding | Evidence |
|----|-----|---------|----------|
| F1 | Critical | Feed items get a **new `post` object** every parent render (`{ ...item, isMediaActive, isMediaPreload }`), defeating `memo(PostCard)` | `HomeScreen.tsx` ~299–353; `ExploreScreen.tsx` ~97–151 |
| F2 | High | `extraData` on Home forces list refresh on every active/preload change → all visible cells update | `HomeScreen.tsx` ~636 |
| F3 | High | Messages hub: composer `input` state re-renders thread FlatList; `ThreadListPanel` memo broken by inline `onBack` / `onSearch` | `MessagesHubScreen.tsx`; `ThreadListPanel.tsx` |
| F4 | High | Matrimony lists: inline `renderItem`, chips rebuilt per row, index in keys, no window/batch tuning | `MatrimonyBrowseScreen.tsx` ~208–241 |
| F5 | Medium | Nested horizontal `ScrollView` in Home `ListHeaderComponent` (highlights) | `HighlightSection.tsx` |
| F6 | Medium | No `getItemLayout` with variable-height media + `scrollToIndex` | `HomeScreen.tsx` |

---

## 2. Memoization (`React.memo` / `useMemo` / `useCallback`)

| ID | Sev | Finding | Evidence |
|----|-----|---------|----------|
| M1 | Critical | `PostCard` / `PostMedia` / `FeedVideoPlayer` are memoized but **unstable props** (new `post`, inline `onDoubleTapLike`, per-render handlers) make memo a no-op on the hot path | `PostCard.tsx` ~320–326, ~392 |
| M2 | High | `ThemeProvider` passes `value={{ mode, setMode, colors }}` **without `useMemo`** → any provider parent re-render fans out to all `useTheme()` consumers | `ThemeContext.tsx` ~115–118 |
| M3 | Medium | `Header` / `BottomTabBar` are memoized but receive inline handlers from Home | `HomeScreen.tsx` ~597–688 |
| M4 | Medium | `StyleSheet.create` inside `useMemo` per card when memo fails → CPU churn on scroll | `PostCard.tsx`, `PostMedia.tsx`, `FeedVideoPlayer.tsx` |
| M5 | Low | `PostCaption` rendered twice per card (title/caption split) | `PostCard.tsx` |
| M6 | Low (good) | Auth context value is `useMemo`d; AppAlert keeps stable consumer value | `AuthContext.tsx`, `AppAlertContext.tsx` |

**Pattern:** Widespread `memo` without prop stability = false confidence. Prefer fewer memos with stable props over many memos with new objects every frame.

---

## 3. Re-renders

| ID | Sev | Finding | Evidence |
|----|-----|---------|----------|
| R1 | High | Home reads notification `counts.total` → badge updates re-render entire Home (FlatList + cards) | `HomeScreen.tsx` + `NotificationContext.tsx` |
| R2 | High | Explore mounted as child of Home → Explore pays Home state updates when tab = explore | `HomeScreen.tsx` ~618–619 |
| R3 | High | Explore search: hook returns new object each call; `ListHeader` remounts while typing | `useExploreSearch.ts`; `ExploreScreen.tsx` |
| R4 | Medium | Viewability → `activeMediaPostId` / `preloadMediaPostId` state → feed remaps with new post objects | Home / Explore |

---

## 4. Image loading

| ID | Sev | Finding | Evidence |
|----|-----|---------|----------|
| I1 | High | `AvatarImage` uses RN `Image` — no disk cache / recycling | `AvatarImage.tsx` |
| I2 | High | Matrimony cards / candidate / matches use RN `Image` | `MatrimonyMatchCard.tsx`, etc. |
| I3 | Medium | Profile post grid: RN `Image` + full `mediaUrl` (not medium/thumb) | `ProfilePostGridCard.tsx` |
| I4 | Medium | Chat / notification avatars: RN `Image` | `ChatMessageBubble.tsx`, `NotificationListItem.tsx` |
| I5 | Medium | `Image.getSize` prefetch for every feed URI (aspect ratio) — extra network/CPU; not expo-image prefetch | `useHome.ts` → `imageDimensions.ts` |
| I6 | Low (good) | Feed photos + video posters: `expo-image` + `cachePolicy="memory-disk"` | `PostMedia.tsx`, `FeedVideoPlayer.tsx` |

---

## 5. Video loading

| ID | Sev | Finding | Evidence |
|----|-----|---------|----------|
| V1 | High | Native players **stay mounted** when stack-pushing Messages/Profile (pause only; keep active id) — decoder memory under other screens | `HomeScreen.tsx` ~183–188; `usePlaybackAllowed.ts` |
| V2 | Medium | Up to **2** `useVideoPlayer` instances per feed (active + preload); preload still constructs player | `FeedVideoPlayer.tsx`; `feedVideoVisibility.ts` |
| V3 | Medium | Multiple feed surfaces (Home, Explore, Member feeds) can each hold active/preload if mounted | Same pattern across screens |
| V4 | Medium | YouTube cells mount full `WebView` in the feed | `PostMedia.tsx` |
| V5 | Low (good) | `bufferOptions` ~5s; unmount `replaceAsync(null)`; warm URI cache (40); pause on blur / AppState | Prompt 6 path |

---

## 6. Navigation

| ID | Sev | Finding | Evidence |
|----|-----|---------|----------|
| N1 | High | Flat native stack (~40+ screens); Home remains under stack when opening Messages/Profile/Matrimony — no tab unmount | `App.tsx`; `mainTabs.ts` |
| N2 | Medium | Explore is not a route — conditional child of Home; tab switch remounts list trees | `HomeScreen.tsx` |
| N3 | Medium | No `unmountOnBlur` / freeze options on heavy screens | `App.tsx` `screenOptions` |
| N4 | Low (good) | Focus blur pauses videos; playback gated by focus + AppState | Home + `usePlaybackAllowed` |

---

## 7. Memory leaks

| ID | Sev | Finding | Evidence |
|----|-----|---------|----------|
| L1 | Medium | Chat typing debounce/idle timeouts not cleared on unmount | `ChatScreen.tsx`; `MessagesHubScreen.tsx` |
| L2 | Medium | `aspectRatioByUri` Map unbounded (session growth) | `imageDimensions.ts` |
| L3 | Low | `MemberProfileStatsRow` animation not stopped on unmount | `MemberProfileStatsRow.tsx` |
| L4 | Low (good) | Video listeners, player registry, sockets, most `Animated.loop`s clean up | Feed / shimmer / realtime hooks |

---

## 8. Background timers

| ID | Sev | Finding | Evidence |
|----|-----|---------|----------|
| T1 | Medium | `useAppResume` → full Home `refetchAll()` on every foreground | `HomeScreen.tsx`; `useAppResume.ts` |
| T2 | Medium | Messages hub soft-reloads threads on resume + every focus | `MessagesHubScreen.tsx` |
| T3 | Low | Analytics flush timer is module-global (OK; not cancelled on logout) | `feedAnalytics.ts` |
| T4 | Info | No long-lived list polling intervals on home/explore/matrimony | Intervals limited to trim/preview |

---

## 9. Animations

| ID | Sev | Finding | Evidence |
|----|-----|---------|----------|
| A1 | Low (good) | Most UI animations use `useNativeDriver: true` | PostCard, header hide, Shimmer |
| A2 | Low | Layout/value anims correctly use `useNativeDriver: false` | Welcome card height, stats counter |
| A3 | Info | `react-native-reanimated` in package.json but **unused** in app source | Dead weight until adopted |
| A4 | Low | Many simultaneous skeleton loops on profile loading | `ProfileSkeleton.tsx` |

---

## 10. Network requests

| ID | Sev | Finding | Evidence |
|----|-----|---------|----------|
| Q1 | High | No React Query / SWR / request dedupe layer | `package.json` |
| Q2 | High | Profile: mount `useEffect` + `useFocusEffect` both refetch | `useProfile.ts`; `ProfileScreen.tsx` |
| Q3 | High | My Posts same double-fetch | `useProfilePosts.ts`; `MyPostsScreen.tsx` |
| Q4 | High | Matrimony browse: every focus → hub + discover page 1 | `MatrimonyBrowseScreen.tsx` |
| Q5 | Medium | Member profile reload on every focus | `MemberProfileScreen.tsx` |
| Q6 | Medium | Chat open waterfall (access → blocked → threads → me + history) | `ChatScreen.tsx` |
| Q7 | Low (good) | Explore search generation token drops stale responses | `useExploreSearch.ts` |
| Q8 | Low | Profile API forces `Cache-Control: no-cache` | `profile.api.ts` |

---

## 11. Caching

| ID | Sev | Finding | Evidence |
|----|-----|---------|----------|
| C1 | High | No API response cache for feed/profile/messages/matrimony (React state only; lost on unmount) | Hooks |
| C2 | Medium | SecureStore for tokens/theme/recent searches — not feed payloads | token / explore storages |
| C3 | Low (good) | Master-data in-memory TTL (~5 min) | `options.api.ts` |
| C4 | Low (good) | Feed images: expo-image memory-disk; video warm set | Prompt 6 |
| C5 | Low | Aspect-ratio map unbounded | `imageDimensions.ts` |

---

## What’s already solid

- Home FlatList virtualization knobs (`windowSize`, clipping, batch sizes).
- Feed images / posters on `expo-image` with disk cache after Prompt 6.
- Video mount gated to active + next; buffer capped; pause on blur.
- Explore search stale-response guard.
- Auth context memoization; most Animated loops stopped on unmount.
- Socket / feed realtime subscriptions cleaned up.

---

## Recommended remediation order (no code in this audit)

| Priority | Work | Expected impact |
|----------|------|-----------------|
| P0 | Stabilize feed item props + handlers so `PostCard` memo works | Large ↓ JS thread during scroll / like / viewability |
| P0 | Memoize Theme context; split notification badge from feed tree | ↓ global re-render fan-out |
| P1 | `expo-image` for AvatarImage + matrimony + profile grid | ↓ repeated avatar/photo downloads |
| P1 | Fix double-fetch / focus refetch thrashing | ↓ API + battery |
| P2 | Tune Messages + Matrimony FlatLists; memo match cards | ↓ list jank |
| P2 | Optional: unmount or freeze Home under deep stacks; release video players when not focused | ↓ memory |
| P3 | Introduce lightweight query cache (React Query) for feed/profile | ↓ duplicate network |

---

## Measurement suggestions (for Prompt 8+)

- React DevTools / why-did-you-render on `PostCard` during scroll.
- Flipper / Expo performance monitor: JS FPS while scrolling Home with 2 videos in view.
- Network inspector: count of avatar GETs on 20-min session.
- Memory: open Home → Messages → back; check whether video players released.

---

## Risks of future fixes

| Risk | Note |
|------|------|
| Custom `memo` compare on PostCard | Easy to miss fields (like counts) → stale UI |
| Unmounting Home under stack | May reset scroll position / video warm state |
| React Query | Scope creep; start with Profile/Matrimony focus only |

---

*End of audit. No application code was modified.*
