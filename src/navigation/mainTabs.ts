/**
 * Shared main-tab navigation for Home / Explore / Messages / Profile / Create.
 * Presentation shell only — routes to existing screens.
 */

import type { TabId } from "../components/home/BottomTabBar";
import { openMessagesInbox } from "./openMessages";

type NavLike = {
  navigate: (name: string, params?: object) => void;
  getState?: () =>
    | {
        routes: { name: string; key?: string }[];
        index: number;
      }
    | undefined;
  dispatch: (action: unknown) => void;
};

/**
 * @param activeTab Current screen's tab highlight
 * @param onSameHomeTab Optional — e.g. scroll-to-top when already on Home feed
 */
export function handleMainTabPress(
  navigation: NavLike,
  activeTab: TabId,
  tab: TabId,
  onSameHomeTab?: () => void
): void {
  if (tab === "create") {
    navigation.navigate("CreatePost");
    return;
  }

  if (tab === "home") {
    if (activeTab === "home") {
      onSameHomeTab?.();
      return;
    }
    navigation.navigate("Home", { tab: "home" });
    return;
  }

  if (tab === "explore") {
    navigation.navigate("Home", { tab: "explore" });
    return;
  }

  if (tab === "profile") {
    if (activeTab === "profile") return;
    navigation.navigate("Profile");
    return;
  }

  if (tab === "messages") {
    if (activeTab === "messages") return;
    openMessagesInbox(navigation as Parameters<typeof openMessagesInbox>[0]);
  }
}
