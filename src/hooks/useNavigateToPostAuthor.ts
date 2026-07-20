import { useCallback } from "react";
import { useNavigation } from "@react-navigation/native";
import { useAuth } from "../context/AuthContext";

/** Navigate to own Profile tab or another member's profile by feed author identifiers. */
export function useNavigateToPostAuthor() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  return useCallback(
    (authorUserId?: number | null, authorUsername?: string | null) => {
      if (!authorUserId && !authorUsername) return;

      if (user?.id != null && authorUserId === user.id) {
        navigation.navigate("Profile");
        return;
      }

      navigation.navigate("MemberProfile", {
        userId: authorUserId ?? undefined,
        username: authorUsername ?? undefined
      });
    },
    [navigation, user?.id]
  );
}
