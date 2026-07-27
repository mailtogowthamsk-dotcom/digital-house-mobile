/**
 * Prefer feed-sized image URLs from the API.
 * Never rewrite object keys on the client — signed/CDN URLs must stay exact.
 */

export function preferFeedImageUrl(opts: {
  mediaUrl?: string | null;
  mediaUrlMedium?: string | null;
  mediaUrlFull?: string | null;
  mediaUrlThumb?: string | null;
  mediaType?: string | null;
}): string | null {
  const type = (opts.mediaType ?? "").toLowerCase();
  if (type === "video") {
    return opts.mediaUrl ?? opts.mediaUrlFull ?? null;
  }
  // Prefer medium, then thumb — never full as primary (session avg image was ~8MB waste).
  return opts.mediaUrlMedium || opts.mediaUrlThumb || opts.mediaUrl || opts.mediaUrlFull || null;
}

/** Ordered unique fallbacks after the primary preferFeedImageUrl pick. */
export function feedImageFallbackUrls(opts: {
  mediaUrl?: string | null;
  mediaUrlMedium?: string | null;
  mediaUrlFull?: string | null;
  mediaUrlThumb?: string | null;
  mediaType?: string | null;
}): string[] {
  const type = (opts.mediaType ?? "").toLowerCase();
  if (type === "video") return [];
  const primary = preferFeedImageUrl(opts);
  const ordered = [opts.mediaUrlMedium, opts.mediaUrlThumb, opts.mediaUrl, opts.mediaUrlFull];
  const out: string[] = [];
  for (const u of ordered) {
    const t = u?.trim();
    if (t && t !== primary && !out.includes(t)) out.push(t);
  }
  return out;
}

export function preferThumbUrl(opts: {
  thumbnailUrl?: string | null;
  mediaUrlThumb?: string | null;
  mediaUrl?: string | null;
}): string | null {
  return opts.thumbnailUrl || opts.mediaUrlThumb || null;
}
