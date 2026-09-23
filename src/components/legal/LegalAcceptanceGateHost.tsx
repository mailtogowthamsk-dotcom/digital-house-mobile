import React, { useCallback, useEffect, useRef, useState } from "react";
import { LegalAcceptanceGate } from "./LegalAcceptanceGate";
import { useAuth } from "../../context/AuthContext";
import {
  getLegalStatus,
  type LegalAcceptanceStatus
} from "../../api/legal.api";

/**
 * Mounts the non-dismissible legal reacceptance overlay for APPROVED / home users
 * when Privacy/Terms (or other requiresReacceptance docs) have a newer version.
 */
export function LegalAcceptanceGateHost() {
  const { status, user, refreshSession } = useAuth();
  const [legal, setLegal] = useState<LegalAcceptanceStatus | null>(user?.legal ?? null);
  const userId = user?.id;
  const fetchGen = useRef(0);
  const lastNetworkFetchAt = useRef(0);

  const refreshLegal = useCallback(
    async (force = false) => {
      if (status === "loading" || status === "signedOut" || !userId) {
        setLegal(null);
        return;
      }

      // Prefer /auth/me legal payload — skip cold-start GET /legal/status entirely.
      if (!force && user?.legal) {
        setLegal(user.legal);
        // Treat me.legal as a fresh network-equivalent so we don't immediately re-fetch.
        if (lastNetworkFetchAt.current === 0) {
          lastNetworkFetchAt.current = Date.now();
        }
        if (Date.now() - lastNetworkFetchAt.current < 60_000) return;
      }

      const gen = ++fetchGen.current;
      try {
        const next = await getLegalStatus({ force });
        lastNetworkFetchAt.current = Date.now();
        if (gen !== fetchGen.current) return;
        setLegal(next);
      } catch {
        if (gen !== fetchGen.current) return;
        setLegal((prev) => prev ?? user?.legal ?? null);
      }
    },
    [status, userId, user?.legal]
  );

  useEffect(() => {
    if (user?.legal) setLegal(user.legal);
  }, [userId, user?.legal?.mustAccept]);

  useEffect(() => {
    void refreshLegal(false);
  }, [refreshLegal]);

  const visible =
    !!legal?.mustAccept &&
    (status === "home" || (status !== "signedOut" && status !== "loading" && user?.status === "APPROVED"));

  return (
    <LegalAcceptanceGate
      visible={visible}
      status={legal}
      onAccepted={async (next) => {
        setLegal(next);
        try {
          await refreshSession();
        } catch {
          /* ignore — local status already updated */
        }
      }}
    />
  );
}
