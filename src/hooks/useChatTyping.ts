import { useCallback, useEffect, useRef, useState } from "react";
import { getSocketInstance } from "../realtime/socket";
import { emitTypingEvent } from "../realtime/sendChatMessage";

/**
 * Both sides of the typing indicator for one conversation.
 *
 * Sending is leading-edge: the first keystroke goes out immediately instead of
 * waiting for a pause, which is what made the indicator invisible for anyone
 * typing continuously. A keep-alive re-asserts it while typing continues so the
 * peer's expiry timer never fires mid-sentence, and an idle timer retracts it.
 */

/** Re-assert while the user keeps typing. Must stay below PEER_EXPIRY_MS. */
const KEEPALIVE_MS = 2_000;
/** Retract this long after the last keystroke. */
const IDLE_STOP_MS = 2_500;
/** Drop the peer's indicator if no keep-alive arrives (covers a silent drop). */
const PEER_EXPIRY_MS = 5_000;

export type ChatTyping = {
  /** True while the peer is typing. */
  peerTyping: boolean;
  /** Feed every composer change; handles start, keep-alive and retraction. */
  onInputChange: (text: string) => void;
  /** Retract immediately (on send, blur, or leaving the conversation). */
  stopTyping: () => void;
  /** Apply an inbound `typing` event for this conversation. */
  applyPeerTyping: (typing: boolean) => void;
};

export function useChatTyping(peerId: number | null, enabled: boolean): ChatTyping {
  const [peerTyping, setPeerTyping] = useState(false);

  const activeRef = useRef(false);
  const lastSentAtRef = useRef(0);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const peerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Read through refs so the callbacks stay stable across renders — they are
  // passed into a memoized composer on every keystroke.
  const peerIdRef = useRef(peerId);
  peerIdRef.current = peerId;
  const enabledRef = useRef(enabled);
  enabledRef.current = enabled;

  const emit = useCallback((typing: boolean) => {
    const target = peerIdRef.current;
    if (target == null) return;
    activeRef.current = typing;
    lastSentAtRef.current = typing ? Date.now() : 0;
    // Synchronous instance lookup: awaiting getSocket() would add connect
    // latency to a keystroke, and a dropped indicator is not worth blocking on.
    emitTypingEvent(getSocketInstance(), target, typing);
  }, []);

  const stopTyping = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current);
      idleTimerRef.current = null;
    }
    if (activeRef.current) emit(false);
  }, [emit]);

  const onInputChange = useCallback(
    (text: string) => {
      if (!enabledRef.current || peerIdRef.current == null) return;

      if (text.trim().length === 0) {
        stopTyping();
        return;
      }

      const now = Date.now();
      if (!activeRef.current || now - lastSentAtRef.current >= KEEPALIVE_MS) {
        emit(true);
      }

      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      idleTimerRef.current = setTimeout(() => {
        idleTimerRef.current = null;
        if (activeRef.current) emit(false);
      }, IDLE_STOP_MS);
    },
    [emit, stopTyping]
  );

  const applyPeerTyping = useCallback((typing: boolean) => {
    setPeerTyping(typing);
    if (peerTimerRef.current) clearTimeout(peerTimerRef.current);
    if (typing) {
      peerTimerRef.current = setTimeout(() => setPeerTyping(false), PEER_EXPIRY_MS);
    }
  }, []);

  // Switching conversation or unmounting must retract, or the peer is left
  // watching an indicator for a chat we already left.
  useEffect(() => {
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (peerTimerRef.current) clearTimeout(peerTimerRef.current);
      if (activeRef.current && peerIdRef.current != null) {
        emitTypingEvent(getSocketInstance(), peerIdRef.current, false);
        activeRef.current = false;
      }
    };
  }, [peerId]);

  useEffect(() => {
    setPeerTyping(false);
  }, [peerId]);

  return { peerTyping, onInputChange, stopTyping, applyPeerTyping };
}
