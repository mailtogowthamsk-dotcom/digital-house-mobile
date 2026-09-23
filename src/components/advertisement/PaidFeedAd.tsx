import React, { useCallback, useEffect, useRef, useState } from "react";
import { getAdvertisementFeed, type FeedAdvertisement } from "../../api/advertisement.api";
import { AdvertisementCard } from "./AdvertisementCard";
import { useFeedAdSlotVisible } from "../../media/feedAdSlotVisibility";
import {
  isHomeInteractive,
  onHomeInteractive,
  startupMark
} from "../../utils/startupTiming";

type Props = {
  placement: "home" | "explore" | "browse";
  /** Increment on pull-to-refresh so the slot rotates across campaigns. */
  refreshKey?: number;
  slotVisible?: boolean;
};

/**
 * Home Feed paid ad slot — separate from GET /home/feed (not embedded in feed DTO).
 * P4E: wait for Home interactive (bootstrap/feed settled) before GET /advertisements/feed
 * so P2 ads do not occupy scheduler/DB slots during cold-start P0 Home work.
 * Same ad UI/placement/eligibility; only request start timing changes on cold start.
 * Pull-to-refresh (refreshKey) loads immediately once Home is already interactive.
 */
export function PaidFeedAd({ placement, refreshKey = 0, slotVisible }: Props) {
  const [ad, setAd] = useState<FeedAdvertisement | null>(null);
  const shownId = useRef<number | undefined>(undefined);
  const fromStore = useFeedAdSlotVisible();
  const visible = slotVisible ?? fromStore;

  const load = useCallback(async () => {
    const excludeId = refreshKey > 0 ? shownId.current : undefined;
    try {
      let row = await getAdvertisementFeed(placement, excludeId);
      if (!row && excludeId) {
        row = await getAdvertisementFeed(placement);
      }
      shownId.current = row?.id;
      setAd(row);
    } catch {
      setAd(null);
    }
  }, [placement, refreshKey]);

  useEffect(() => {
    let cancelled = false;
    const startLoad = () => {
      if (cancelled) return;
      try {
        startupMark("ads_deferred_ready");
      } catch {
        /* metrics */
      }
      void load();
    };

    if (isHomeInteractive()) {
      startLoad();
      return () => {
        cancelled = true;
      };
    }

    try {
      startupMark("ads_deferred_start");
    } catch {
      /* metrics */
    }
    const unsub = onHomeInteractive(startLoad);
    return () => {
      cancelled = true;
      unsub();
    };
  }, [load]);

  if (!ad) return null;
  return <AdvertisementCard key={ad.id} ad={ad} placement={placement} slotVisible={visible} />;
}
