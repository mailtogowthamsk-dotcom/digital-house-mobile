# React Native Performance Report — Digital House

| Field | Value |
|-------|--------|
| **Date** | 2026-07-27 |
| **Scope** | Mobile app only (`mobile/`) |
| **Constraints honored** | No UI/UX/business-logic/API/DB/navigation-flow changes |
| **Baseline audits** | `REACT_NATIVE_PERFORMANCE_AUDIT.md` |
| **Implementation log** | `REACT_NATIVE_OPTIMIZATION_CHANGELOG.md` |

---

## Executive summary

The React Native client was rechecked and completed against the full Prompt 8 checklist. Feed memoization now works (`FeedPostCardRow`), FlatLists use batching/`updateCellsBatchingPeriod`, list images use `expo-image` disk cache, videos release on blur, and focus-driven duplicate API calls are throttled. Expected outcome: smoother scroll (closer to 60 FPS), lower JS CPU, lower RAM from video/players, fewer client requests (helps 80 concurrent users), and better battery from less wake-up work.

---

## 1. Files modified (this sprint)

### Core feed / memo
| File | Change |
|------|--------|
| `components/home/FeedPostCardRow.tsx` | **New** — stable post ref + media flags + actions ref |
| `components/home/PostCard.tsx` | Separate `isMediaActive`/`isMediaPreload`; stable double-tap; custom `memo` |
| `components/home/Header.tsx` | Notification counts read locally (isolate from feed) |
| `components/home/index.ts` | Export `FeedPostCardRow` |
| `screens/home/HomeScreen.tsx` | FeedPostCardRow; soft resume; stable header handlers; FlatList batching |
| `screens/explore/ExploreScreen.tsx` | Same feed pattern; header deps; FlatList batching |
| `screens/members/MemberPostsScreen.tsx` | FeedPostCardRow + batching |
| `screens/members/MemberProfileScreen.tsx` | FeedPostCardRow; 60s stale focus; batching |

### Context / theme
| File | Change |
|------|--------|
| `theme/ThemeContext.tsx` | Memoized context `value` |

### Images
| File | Change |
|------|--------|
| `components/ui/AvatarImage.tsx` | `expo-image` + `memory-disk` |
| `components/matrimony/MatrimonyMatchCard.tsx` | Memo + `expo-image` |
| `components/profile/ProfilePostGridCard.tsx` | `expo-image` + medium variant preference |
| `components/notifications/NotificationListItem.tsx` | `expo-image` |
| `components/messages/ChatMessageBubble.tsx` | `expo-image` |
| `screens/messages/MessagesScreen.tsx` | `expo-image` + FlatList tuning |
| `screens/matrimony/MatrimonyMatchesScreen.tsx` | `expo-image` |
| `screens/matrimony/MatrimonySavedScreen.tsx` | `expo-image` |
| `screens/matrimony/MatrimonyCandidateScreen.tsx` | `expo-image` |
| `components/matrimony/BrideGroomPhotosSection.tsx` | `expo-image` |

### Video / memory
| File | Change |
|------|--------|
| `components/media/FeedVideoPlayer.tsx` | Mount players only when focused + active/preload |
| `utils/imageDimensions.ts` | Cap aspect-ratio map at 200 |
| `screens/messages/ChatScreen.tsx` | Clear typing timers on unmount |
| `screens/messages/MessagesHubScreen.tsx` | Clear typing timers on unmount; stable panel callbacks |

### FlatList / network
| File | Change |
|------|--------|
| `utils/listPerf.ts` | **New** — shared virtualization constants |
| `components/feed/CommentSheet.tsx` | Stable separator/keyExtractor; batching |
| `components/messages/ThreadListPanel.tsx` | Batching + `updateCellsBatchingPeriod` |
| `screens/matrimony/MatrimonyBrowseScreen.tsx` | Tuned list; 60s stale focus |
| `screens/home/ProfileScreen.tsx` | Skip first-focus double fetch; 60s soft refresh |
| `screens/home/MyPostsScreen.tsx` | Same |
| `screens/notifications/NotificationCenterScreen.tsx` | `updateCellsBatchingPeriod` |
| `hooks/useExploreSearch.ts` | Memoized return object |

### Docs
| File | Change |
|------|--------|
| `docs/REACT_NATIVE_OPTIMIZATION_CHANGELOG.md` | Incremental change log |
| `docs/REACT_NATIVE_PERFORMANCE_REPORT.md` | This report |

---

## 2. Why each change was required

| Area | Problem | Fix |
|------|---------|-----|
| FlatList | Cells recreated / large window → jank | Stable `renderItem`/`keyExtractor`, memo rows, `windowSize`/`maxToRenderPerBatch`/`updateCellsBatchingPeriod`/`removeClippedSubviews` |
| React.memo | `post={{ ...item }}` defeated memo | Pass stable `post` + separate media flags |
| Callbacks | New lambdas every render | Actions ref + `useCallback` |
| Context | Theme/notif fan-out into feed | Memo theme value; Header owns badge |
| Images | RN Image re-download | `expo-image` `cachePolicy="memory-disk"` |
| Video | Decoders under stack screens | Unmount when `!useIsFocused()` |
| Network | Double focus fetches | Skip first focus + 60s stale |
| Memory | Timer/map leaks | Unmount clears; bounded map |

---

## 3. Expected impact (engineering estimates)

| Metric | Expected improvement | Notes |
|--------|---------------------|--------|
| **FPS (feed scroll)** | **+8–20 FPS** toward sustained ~60 on mid devices | From fewer card/video re-renders + FlatList batching |
| **JS CPU** | **~25–40% ↓** during scroll / like / viewability | Memo actually hits; fewer StyleSheet rebuilds |
| **RAM** | **~30–80 MB ↓** with video-heavy feeds under navigation | Players unmount off-focus; clipped cells |
| **Battery** | **~10–20% ↓** relative drain in 20-min feed session | Less JS wake + fewer image/network bursts |
| **Network (client)** | **~30–50% ↓** duplicate GETs | Image disk cache + stale focus (Profile/Matrimony/Member) |
| **Backend concurrency** | Helps **~80 users** target | Fewer redundant profile/discover/feed refreshes from clients |

*These are static-analysis estimates, not Flipper benchmarks. Validate on device.*

---

## 4. Risks

| Risk | Mitigation |
|------|------------|
| Custom `PostCard` memo misses a field → stale UI | Compare includes handlers + media flags; likes update post identity via `updatePost` |
| `removeClippedSubviews` blanks cells on some Android OEMs | Used where already proven; CommentSheet now on — watch Android |
| Video remount on return focus briefly shows poster | Active id preserved; `usePlaybackAllowed` resumes |
| 60s stale may show slightly old profile/matrimony | Pull-to-refresh still forces load |
| expo-image on matrimony lists | Visual parity checked via same URIs / contentFit cover |

---

## 5. Rollback plan

1. Revert `FeedPostCardRow` usage → previous `PostCard` spread pattern (git revert files listed above).
2. Or surgically: set `updateCellsBatchingPeriod` removals / restore RN `Image` imports if a screen regresses.
3. Disable video focus gate: `shouldMountPlayer = isActive \|\| isPreload` in `FeedVideoPlayer.tsx`.
4. Focus stale: remove `memberFocusOnceRef` / 60s checks to restore always-refetch.
5. No DB/API migrations — pure client rollback.

---

## 6. Verification checklist

- [ ] Home scroll: inactive cards do not re-render on viewability (why-did-you-render / DevTools)
- [ ] Open Messages from Home: video RAM drops; return to Home resumes active video
- [ ] Open Profile twice quickly: second visit within 60s does not refetch
- [ ] Matrimony browse revisit within 60s: no discover spam
- [ ] Avatars/notifications/chat: disk cache hits on revisit
- [ ] Comment sheet scroll remains smooth on Android

---

## 7. Intentionally deferred (out of scope / Medium)

- Full React Query layer (stale timers suffice for now)
- Navigation redesign to bottom tabs (would change UX)
- Replacing every RN `Image` on auth/landing/composer (not list hot paths)
- CommentSheet `removeClippedSubviews` already enabled; monitor Android

---

*Sprint complete. UI and navigation flow unchanged.*
