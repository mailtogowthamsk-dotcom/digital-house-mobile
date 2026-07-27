# React Native Optimization Changelog — Prompt 8

| Field | Value |
|-------|--------|
| **Date** | 2026-07-27 |
| **Scope** | Critical + High findings from `REACT_NATIVE_PERFORMANCE_AUDIT.md` |
| **UI** | Unchanged (behavior preserved) |

---

## Optimizations (why each change)

### 1. Feed item prop stability (`FeedPostCardRow`)
**Why:** Home/Explore spread `post={{ ...item, isMediaActive }}` every render, defeating `React.memo` on `PostCard`.
**Change:** New `FeedPostCardRow` passes the **same post object reference** plus separate `isMediaActive` / `isMediaPreload`. Actions live in a **ref** so `renderItem` only depends on media ids.
**Impact:** Inactive cards skip re-render on scroll / viewability / likes elsewhere.

### 2. Stable double-tap handler (`PostCard`)
**Why:** Inline `onDoubleTapLike={() => ...}` broke `PostMedia` / `FeedVideoPlayer` memo.
**Change:** `useCallback` (`onMediaDoubleTapLike`) + custom `memo` compare on `PostCard`.
**Impact:** Less native video/UI tree work while scrolling.

### 3. Theme context memo (`ThemeContext`)
**Why:** `value={{ mode, setMode, colors }}` was a new object every provider render.
**Change:** `useMemo` for context value.
**Impact:** Fewer global theme-consumer re-renders.

### 4. Notification badge isolation (`Header`)
**Why:** Home subscribed to notification counts → entire FlatList re-rendered on badge ticks.
**Change:** Header reads `useNotificationsOptional()` itself; Home passes only `notificationCountFallback` from summary.
**Impact:** Badge updates no longer re-render the feed.

### 5. Soft Home resume refetch
**Why:** `refetchAll()` on every app foreground wasted network + JS work.
**Change:** Resume refreshes **summary only** (badges); pull-to-refresh still full.
**Impact:** Less cellular / CPU when returning from background.

### 6. Avatar + matrimony + profile grid → `expo-image`
**Why:** RN `Image` has no disk cache → repeated downloads.
**Change:** `AvatarImage`, `MatrimonyMatchCard`, `ProfilePostGridCard` use `cachePolicy="memory-disk"` (+ medium URL preference for grids).
**Impact:** Fewer image network hits; smoother lists.

### 7. Video players unmount off-screen (`FeedVideoPlayer`)
**Why:** Stack push kept native players mounted (pause only) → decoder memory.
**Change:** Mount player only when `(active || preload) && useIsFocused()`.
**Impact:** Memory freed on Messages/Profile; ids kept so resume remounts cleanly.

### 8. Explore header / search stability
**Why:** `useExploreSearch()` returned a new object; ListHeader remounted while typing.
**Change:** Memoized hook return; ListHeader deps narrowed; stable `keyExtractor` / content style; `extraData` for media.
**Impact:** Less jank while typing in Explore.

### 9. Messages hub callbacks
**Why:** Inline `onBack` / `onSearch` broke `ThreadListPanel` memo on every composer keystroke.
**Change:** `useCallback` for panel handlers; FlatList window/batch/clip tuning.
**Impact:** Thread list stays quieter while typing.

### 10. Matrimony browse list
**Why:** Untuned FlatList, unmemoized cards, refetch every focus.
**Change:** Memoized card + expo-image; stable `renderItem` / keys; virtualization props; **60s stale** focus reload.
**Impact:** Smoother browse + less API spam.

### 11. Profile / My Posts double-fetch
**Why:** Mount `useEffect` + every `useFocusEffect` both fetched.
**Change:** Skip first focus; soft refetch only if data older than 60s.
**Impact:** Half the requests on open; fewer on quick revisits.

### 12. Aspect-ratio cache bound
**Why:** Unbounded `Map` grew forever.
**Change:** Cap at 200 entries (LRU-ish drop oldest).
**Impact:** Lower memory on long sessions.

---

## Files touched (primary)

- `components/home/FeedPostCardRow.tsx` (new)
- `components/home/PostCard.tsx`, `Header.tsx`, `index.ts`
- `screens/home/HomeScreen.tsx`, `ProfileScreen.tsx`, `MyPostsScreen.tsx`
- `screens/explore/ExploreScreen.tsx`
- `screens/members/MemberPostsScreen.tsx`
- `screens/matrimony/MatrimonyBrowseScreen.tsx`
- `screens/messages/MessagesHubScreen.tsx`
- `components/media/FeedVideoPlayer.tsx`
- `components/ui/AvatarImage.tsx`
- `components/matrimony/MatrimonyMatchCard.tsx`
- `components/profile/ProfilePostGridCard.tsx`
- `components/messages/ThreadListPanel.tsx`
- `hooks/useExploreSearch.ts`
- `theme/ThemeContext.tsx`
- `utils/imageDimensions.ts`

---

## Intentionally not changed (UI / architecture)

- No React Query dependency (lightweight stale timers instead).
- No navigation redesign to tabs (would alter UX); video unmount-on-blur covers memory.
- Medium/Low audit items (CommentSheet separator, Reanimated unused, etc.) deferred.
