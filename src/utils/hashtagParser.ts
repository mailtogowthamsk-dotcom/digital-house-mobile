/** Max length of a normalized hashtag (without #). */
export const HASHTAG_MAX_LEN = 64;

/** Max hashtags per post after merge + dedupe. */
export const HASHTAGS_PER_POST_MAX = 20;

const INLINE_HASHTAG_RE = /#([A-Za-z0-9_]{1,64})/g;

/**
 * Normalize a raw hashtag to storage form.
 * "#Temple" / "TEMPLE" → "temple"
 */
export function normalizeHashtag(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let s = String(raw).trim();
  if (!s) return null;
  if (s.startsWith("#")) s = s.slice(1);
  s = s.trim().toLowerCase();
  if (!s) return null;
  if (!/^[a-z0-9_]{1,64}$/.test(s)) return null;
  return s.slice(0, HASHTAG_MAX_LEN);
}

/** Extract unique normalized hashtags from free text. */
export function extractHashtagsFromText(text: string | null | undefined): string[] {
  if (!text) return [];
  const found: string[] = [];
  const seen = new Set<string>();
  INLINE_HASHTAG_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = INLINE_HASHTAG_RE.exec(text)) !== null) {
    const n = normalizeHashtag(m[1]);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    found.push(n);
  }
  return found;
}

export function normalizeHashtagList(list: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    const n = normalizeHashtag(item);
    if (!n || seen.has(n)) continue;
    seen.add(n);
    out.push(n);
    if (out.length >= HASHTAGS_PER_POST_MAX) break;
  }
  return out;
}

export function mergeHashtags(...sources: Array<string[] | null | undefined>): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const source of sources) {
    if (!source) continue;
    for (const tag of source) {
      const n = normalizeHashtag(tag);
      if (!n || seen.has(n)) continue;
      seen.add(n);
      out.push(n);
      if (out.length >= HASHTAGS_PER_POST_MAX) return out;
    }
  }
  return out;
}

export function formatHashtagDisplay(tag: string): string {
  const n = normalizeHashtag(tag);
  return n ? `#${n}` : "";
}

/**
 * Parse a hashtags field input like "#Temple #Community" or "temple, festival".
 */
export function parseHashtagFieldInput(raw: string): string[] {
  if (!raw.trim()) return [];
  const parts = raw.split(/[\s,]+/).filter(Boolean);
  return normalizeHashtagList(parts);
}
