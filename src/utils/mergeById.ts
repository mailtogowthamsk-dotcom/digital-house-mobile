/**
 * Merge append pages without duplicate ids (infinite-scroll safety).
 * Resolves id from `id`, then `postId`, then `userId` when no getter is passed.
 */
export function mergeById<T>(
  prev: T[],
  next: T[],
  getId: (item: T) => string | number = (item) => {
    const anyItem = item as { id?: string | number; postId?: number; userId?: number };
    const value = anyItem.id ?? anyItem.postId ?? anyItem.userId;
    if (value == null) {
      throw new Error("mergeById: item is missing id");
    }
    return value;
  }
): T[] {
  if (!next.length) return prev;
  const ids = new Set(prev.map((p) => getId(p)));
  const unique = next.filter((p) => !ids.has(getId(p)));
  return unique.length ? [...prev, ...unique] : prev;
}
