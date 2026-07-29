import { useCallback } from "react";

import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { getMatrimonyHub } from "../api/matrimony.api";
import { appAlert } from "../utils/appAlert";

function browseBlockedMessage(hub: Awaited<ReturnType<typeof getMatrimonyHub>>): string {
  if (hub.can_browse) return "";
  if (hub.status === "PAUSED") {
    return "Your matrimony profile is paused. Matches and chats stay available from Matrimony Home.";
  }
  if (hub.status === "CLOSED") {
    return "Your matrimony profile is closed. Reactivate it to browse again. Matches and chats stay available.";
  }
  if (hub.status === "PENDING" || hub.status === "RESUBMITTED") {
    return "Your matrimony profile is under admin review. Browsing unlocks after approval.";
  }
  if (hub.status === "CHANGES_REQUESTED") {
    return "Admin requested changes. Complete the requested updates and resubmit before browsing.";
  }
  if (hub.status === "REJECTED") {
    return "Your matrimony application was rejected. Update your profile and submit again.";
  }
  if (hub.status === "APPROVED" && hub.completion_percentage < 100) {
    return `Complete your matrimony profile (${hub.completion_percentage}% done) before browsing.`;
  }
  if (hub.completion_percentage < 100) {
    return `Complete your matrimony profile (${hub.completion_percentage}% done) and submit for admin approval.`;
  }
  return "Complete matrimony setup and get admin approval before browsing profiles.";
}

/** Blocks explore screens when profile is incomplete or not admin-approved. */
export function useMatrimonyBrowseGuard() {
  const navigation = useNavigation<any>();

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void getMatrimonyHub()
        .then((hub) => {
          if (cancelled || hub.can_browse) return;
          const message = browseBlockedMessage(hub);
          appAlert("Complete matrimony profile", message, [
            {
              text: "Go to setup",
              onPress: () => {
                navigation.navigate("MatrimonySetup");
              }
            },
            {
              text: "Back",
              style: "cancel",
              onPress: () => {
                if (navigation.canGoBack()) navigation.goBack();
                else navigation.navigate("MatrimonyHome");
              }
            }
          ]);
        })
        .catch(() => {
          if (!cancelled && navigation.canGoBack()) navigation.goBack();
        });
      return () => {
        cancelled = true;
      };
    }, [navigation])
  );
}
