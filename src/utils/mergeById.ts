/**
 * Merge append pages without duplicate ids (infinite-scroll safety).
 */
export function mergeById<T extends { id: string | number }>(
  prev: T[],
  next: T[]
): T[] {
  if (!next.length) return prev;
  const ids = new Set(prev.map((p) => p.id));
  const unique = next.filter((p) => !ids.has(p.id));
  return unique.length ? [...prev, ...unique] : prev;
}
