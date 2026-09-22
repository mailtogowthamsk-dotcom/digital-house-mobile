import { DeviceEventEmitter } from "react-native";

export const STORIES_CHANGED_EVENT = "dh:stories:changed";

export type StoriesChangedPayload = {
  deletedId?: number;
  reason?: "deleted" | "created" | "refresh";
};

export function emitStoriesChanged(payload: StoriesChangedPayload = {}): void {
  DeviceEventEmitter.emit(STORIES_CHANGED_EVENT, payload);
}

export function subscribeStoriesChanged(
  handler: (payload: StoriesChangedPayload) => void
): { remove: () => void } {
  const sub = DeviceEventEmitter.addListener(STORIES_CHANGED_EVENT, handler);
  return { remove: () => sub.remove() };
}
