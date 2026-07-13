import type { NavigationProp } from "@react-navigation/native";
import type { NotificationItem } from "../api/notifications.api";

type Nav = NavigationProp<Record<string, object | undefined>>;

export function navigateFromNotification(navigation: Nav, item: NotificationItem) {
  if (!item.id || item.id <= 0) {
    navigation.navigate("Notifications");
    return;
  }

  const targetId = item.actionTargetId ? Number(item.actionTargetId) : null;
  const actorId = item.actorUserId ?? targetId;

  switch (item.actionType) {
    case "OPEN_POST":
    case "OPEN_POST_COMMENT":
      if (targetId) navigation.navigate("PostDetail", { postId: targetId });
      break;
    case "OPEN_CHAT":
      if (actorId) {
        navigation.navigate("Chat", {
          otherUserId: actorId,
          name: item.actorName ?? "Chat",
          profileImage: item.image
        });
      } else {
        navigation.navigate("Messages");
      }
      break;
    case "OPEN_MATRIMONY_HOME":
      navigation.navigate("MatrimonyHome");
      break;
    case "OPEN_MATRIMONY_INTERESTS":
      navigation.navigate("MatrimonyInterests");
      break;
    case "OPEN_MATRIMONY_MATCHES":
      navigation.navigate("MatrimonyMatches");
      break;
    case "OPEN_MATRIMONY_CANDIDATE":
      if (actorId) navigation.navigate("MatrimonyCandidate", { userId: actorId });
      else navigation.navigate("MatrimonyBrowse");
      break;
    case "OPEN_MATRIMONY_SETUP":
      navigation.navigate("MatrimonySetup");
      break;
    case "OPEN_MATRIMONY_PLANS":
      navigation.navigate("MatrimonyPlans");
      break;
    case "OPEN_MATRIMONY_MY_SUBSCRIPTION":
      navigation.navigate("MatrimonyMySubscription");
      break;
    case "OPEN_MATRIMONY_VIEWS":
      navigation.navigate("MatrimonyViews");
      break;
    case "OPEN_JOBS":
      navigation.navigate("JobsHome");
      break;
    case "OPEN_MARKETPLACE":
      navigation.navigate("MarketplaceHome");
      break;
    case "OPEN_HELPING_HANDS":
      navigation.navigate("HelpingHandsHome");
      break;
    case "OPEN_MESSAGES":
      navigation.navigate("Messages");
      break;
    case "OPEN_CONNECTION_REQUESTS":
      navigation.navigate("Connections");
      break;
    case "OPEN_MEMBER_PROFILE":
      if (actorId) {
        navigation.navigate("MemberProfile", { userId: actorId });
      } else {
        navigation.navigate("Connections");
      }
      break;
    default:
      if (item.category === "MATRIMONY") navigation.navigate("MatrimonyHome");
      else if (item.category === "MESSAGES") navigation.navigate("Messages");
      else if (targetId) navigation.navigate("PostDetail", { postId: targetId });
      break;
  }
}
