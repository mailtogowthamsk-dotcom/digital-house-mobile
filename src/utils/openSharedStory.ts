/**
 * Shared navigation helper for opening a story from chat / MessagesHub.
 */
import { getStory, type StoryGroup } from "../api/stories.api";
import { appAlert } from "./appAlert";

export type SharedStoryPeer = {
  name?: string | null;
  profileImage?: string | null;
};

export async function openSharedStoryInViewer(opts: {
  sharedStoryId: number;
  meId: number | null | undefined;
  peer?: SharedStoryPeer | null;
  navigation: { navigate: (name: string, params?: object) => void };
}): Promise<void> {
  const { sharedStoryId, meId, peer, navigation } = opts;
  try {
    const story = await getStory(sharedStoryId);
    const isOwn = meId != null && story.user_id === meId;
    const groups: StoryGroup[] = [
      {
        user: {
          id: story.user_id,
          name: isOwn ? "You" : peer?.name?.trim() || "Member",
          username: null,
          profile_image: isOwn ? null : peer?.profileImage ?? null
        },
        has_unseen: false,
        latest_at: story.created_at,
        is_own: isOwn,
        stories: [story]
      }
    ];
    navigation.navigate("StoryViewer", {
      groups,
      initialGroupIndex: 0,
      initialStoryIndex: 0
    });
  } catch {
    appAlert("Story unavailable", "This story may have expired or is no longer available.");
  }
}
