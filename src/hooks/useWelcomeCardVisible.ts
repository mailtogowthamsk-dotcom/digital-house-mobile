import { useEffect, useState } from "react";
import {
  shouldShowWelcomeCard,
  subscribeWelcomeSession
} from "../session/welcomeSession";

/** React state synced with in-memory welcome session (dismiss / new login). */
export function useWelcomeCardVisible(): boolean {
  const [visible, setVisible] = useState(shouldShowWelcomeCard);

  useEffect(() => subscribeWelcomeSession(() => setVisible(shouldShowWelcomeCard())), []);

  return visible;
}
