import React, { useCallback, useEffect, useRef, useState } from "react";
import { getAdvertisementFeed, type FeedAdvertisement } from "../../api/advertisement.api";
import { AdvertisementCard } from "./AdvertisementCard";
import { useFeedAdSlotVisible } from "../../media/feedAdSlotVisibility";

type Props = {
  placement: "home" | "explore" | "browse";
  /** Increment on pull-to-refresh so the slot rotates across campaigns. */
  refreshKey?: number;
  slotVisible?: boolean;
};

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
    // Defer paid ads until after Home bootstrap / first paint (cold-start concurrency).
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { startupMark } = require("../../utils/startupTiming") as {
        startupMark: (n: string) => void;
      };
      startupMark("ads_deferred_start");
    } catch {
      /* metrics */
    }
    const t = setTimeout(() => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { startupMark } = require("../../utils/startupTiming") as {
          startupMark: (n: string) => void;
        };
        startupMark("ads_deferred_ready");
      } catch {
        /* metrics */
      }
      void load();
    }, 600);
    return () => clearTimeout(t);
  }, [load]);

  if (!ad) return null;
  return <AdvertisementCard key={ad.id} ad={ad} placement={placement} slotVisible={visible} />;
}
