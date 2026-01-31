/**
 * YouTube URL helpers for post media (e.g. announcements with video links).
 * Supports: youtu.be/VIDEO_ID, youtube.com/watch?v=VIDEO_ID, youtube.com/embed/VIDEO_ID
 */

export function isYouTubeUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string") return false;
  const u = url.trim().toLowerCase();
  return (
    u.includes("youtu.be/") ||
    u.includes("youtube.com/watch") ||
    u.includes("youtube.com/embed")
  );
}

/**
 * Extract YouTube video ID from sharing or watch URL.
 * e.g. https://youtu.be/lAPWukZ5XOU?si=... → lAPWukZ5XOU
 */
export function getYouTubeVideoId(url: string | null | undefined): string | null {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();
  const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch) return shortMatch[1];
  const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch) return watchMatch[1];
  const embedMatch = trimmed.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch) return embedMatch[1];
  return null;
}

/** Embed URL for WebView: https://www.youtube.com/embed/VIDEO_ID */
export function getYouTubeEmbedUrl(url: string | null | undefined): string | null {
  const id = getYouTubeVideoId(url);
  if (!id) return null;
  return `https://www.youtube.com/embed/${id}`;
}
