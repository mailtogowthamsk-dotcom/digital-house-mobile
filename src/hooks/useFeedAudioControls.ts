import { useCallback, useSyncExternalStore } from "react";
import {
  getFeedAudioMuted,
  setFeedAudioMuted,
  subscribeFeedAudioMuted,
  toggleFeedAudioMuted
} from "../media/feedAudioState";

/**
 * Subscribe to the feed-wide mute preference.
 * Only components that call this re-render when mute changes (not the whole feed).
 */
export function useFeedAudioMuted(): boolean {
  return useSyncExternalStore(subscribeFeedAudioMuted, getFeedAudioMuted, getFeedAudioMuted);
}

/**
 * Mute preference + stable setters for feed video controls.
 */
export function useFeedAudioControls(): {
  muted: boolean;
  toggleMute: () => void;
  setMuted: (muted: boolean) => void;
} {
  const muted = useFeedAudioMuted();
  const toggleMute = useCallback(() => {
    toggleFeedAudioMuted();
  }, []);
  const setMuted = useCallback((next: boolean) => {
    setFeedAudioMuted(next);
  }, []);
  return { muted, toggleMute, setMuted };
}
