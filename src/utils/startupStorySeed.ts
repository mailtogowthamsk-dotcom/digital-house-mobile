/**
 * Seed story tray from GET /home/bootstrap into HomeScreen.
 */
import type { StoryGroup } from "../api/stories.api";

type Listener = (groups: StoryGroup[]) => void;

let seeded: StoryGroup[] | null = null;
const listeners = new Set<Listener>();

export function seedStartupStoryGroups(groups: StoryGroup[]): void {
  seeded = groups;
  listeners.forEach((l) => l(groups));
}

export function subscribeStartupStoryGroups(listener: Listener): () => void {
  listeners.add(listener);
  if (seeded) listener(seeded);
  return () => {
    listeners.delete(listener);
  };
}

export function takeStartupStoryGroups(): StoryGroup[] | null {
  const next = seeded;
  seeded = null;
  return next;
}
