/**
 * Track R2 URLs uploaded during a screen session.
 * On cancel / replace / leave-without-save, delete them so storage does not pile up.
 * Successfully published/attached URLs should be cleared via `release()` so they are kept.
 */

import { useCallback, useEffect, useRef } from "react";
import type { NavigationProp, ParamListBase } from "@react-navigation/native";
import { deleteMediaUrls } from "../api/media.api";

export type SessionUploadedMedia = {
  track: (...urls: Array<string | null | undefined>) => void;
  untrack: (...urls: Array<string | null | undefined>) => void;
  /** Delete these URLs from R2 if they were uploaded this session. */
  deleteTracked: (...urls: Array<string | null | undefined>) => void;
  /** Delete every remaining session upload (abandon screen). */
  deleteAllTracked: () => void;
  /** Keep remaining URLs (call after successful save/publish). */
  release: () => void;
  has: (url: string | null | undefined) => boolean;
};

function cleanUrls(urls: Array<string | null | undefined>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of urls) {
    const u = typeof raw === "string" ? raw.trim() : "";
    if (!u || !/^https?:\/\//i.test(u) || seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}

export function createSessionUploadedMedia(): SessionUploadedMedia {
  const set = new Set<string>();

  return {
    track(...urls) {
      for (const u of cleanUrls(urls)) set.add(u);
    },
    untrack(...urls) {
      for (const u of cleanUrls(urls)) set.delete(u);
    },
    deleteTracked(...urls) {
      const toDelete = cleanUrls(urls).filter((u) => set.has(u));
      if (!toDelete.length) return;
      for (const u of toDelete) set.delete(u);
      void deleteMediaUrls(toDelete).catch(() => {
        /* orphan job is the safety net */
      });
    },
    deleteAllTracked() {
      const abandoned = [...set];
      set.clear();
      if (!abandoned.length) return;
      void deleteMediaUrls(abandoned).catch(() => {
        /* orphan job is the safety net */
      });
    },
    release() {
      set.clear();
    },
    has(url) {
      return Boolean(url && set.has(url.trim()));
    }
  };
}

/**
 * Delete session R2 uploads when leaving a screen without committing.
 * Block leave while `isBusy()` so we do not orphan an in-flight PUT.
 */
export function useDeleteSessionMediaOnLeave(
  navigation: NavigationProp<ParamListBase>,
  session: SessionUploadedMedia,
  opts?: {
    /** True after successful save/publish — skip delete. */
    isCommitted?: () => boolean;
    /** True while upload/save is in flight — prevent leave. */
    isBusy?: () => boolean;
  }
): void {
  const sessionRef = useRef(session);
  sessionRef.current = session;
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    const unsub = navigation.addListener("beforeRemove", (e: { preventDefault: () => void }) => {
      if (optsRef.current?.isCommitted?.()) return;
      if (optsRef.current?.isBusy?.()) {
        e.preventDefault();
        return;
      }
      sessionRef.current.deleteAllTracked();
    });
    return unsub;
  }, [navigation]);
}

/** Fire-and-forget R2 delete (replace / failed upload cleanup). */
export function deleteRemoteMediaUrls(urls: Array<string | null | undefined>): void {
  const cleaned = cleanUrls(urls);
  if (!cleaned.length) return;
  void deleteMediaUrls(cleaned).catch(() => undefined);
}
