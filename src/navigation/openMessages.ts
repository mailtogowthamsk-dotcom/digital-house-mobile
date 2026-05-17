import { CommonActions } from "@react-navigation/native";

type NavState = {
  routes: { name: string; key?: string }[];
  index: number;
};

/**
 * Open the Messages inbox reliably: pops Chat off the stack if present,
 * or navigates to Messages when it is not in the stack yet.
 */
export function openMessagesInbox(navigation: {
  navigate: (name: string) => void;
  getState?: () => NavState | undefined;
  dispatch: (action: ReturnType<typeof CommonActions.reset>) => void;
}): void {
  const state = navigation.getState?.();
  if (!state?.routes?.length) {
    navigation.navigate("Messages");
    return;
  }

  const messagesIndex = state.routes.findIndex((r) => r.name === "Messages");
  if (messagesIndex < 0) {
    navigation.navigate("Messages");
    return;
  }

  const trimmedRoutes = state.routes.slice(0, messagesIndex + 1);
  if (trimmedRoutes.length === state.routes.length && state.index === messagesIndex) {
    return;
  }

  navigation.dispatch(
    CommonActions.reset({
      ...state,
      index: trimmedRoutes.length - 1,
      routes: trimmedRoutes
    })
  );
}
