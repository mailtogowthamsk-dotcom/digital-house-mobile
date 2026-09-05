import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";
import { getImageUrl } from "../api/client";
import { ensureMediaLibraryWrite } from "../permissions";

export type DownloadMediaInput = {
  url: string;
  mediaType: "image" | "video";
  fileName?: string;
};

export type DownloadMediaResult =
  | { ok: true; message: string }
  | { ok: false; message: string; permissionDenied?: boolean };

type MediaLibraryModule = typeof import("expo-media-library/legacy");
type MediaAsset = Awaited<ReturnType<MediaLibraryModule["createAssetAsync"]>>;

function extensionFor(mediaType: "image" | "video", url: string): string {
  const match = url.split("?")[0].match(/\.(jpe?g|png|gif|webp|heic|mp4|mov)$/i);
  if (match) return match[1].toLowerCase();
  return mediaType === "video" ? "mp4" : "jpg";
}

async function loadMediaLibrary(): Promise<MediaLibraryModule> {
  // Lazy-load so Expo Go's media-library warning does not fire on app start.
  return import("expo-media-library/legacy");
}

async function addToDigitalHouseAlbum(
  MediaLibrary: MediaLibraryModule,
  asset: MediaAsset
): Promise<void> {
  if (Platform.OS !== "android") return;
  const albumName = "Digital House";
  try {
    const album = await MediaLibrary.getAlbumAsync(albumName);
    if (album) {
      await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
    } else {
      await MediaLibrary.createAlbumAsync(albumName, asset, false);
    }
  } catch {
    // Asset is already in gallery; album grouping is best-effort.
  }
}

/**
 * Download post media to the device gallery (private save — no external share sheet).
 * Uses expo-file-system/legacy — the default import throws at runtime on SDK 54+.
 */
export async function downloadPostMedia(input: DownloadMediaInput): Promise<DownloadMediaResult> {
  const url = getImageUrl(input.url)?.trim();
  if (!url) {
    return { ok: false, message: "This post has no media to download." };
  }

  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    return { ok: false, message: "Storage is unavailable on this device." };
  }

  const permission = await ensureMediaLibraryWrite({ showDeniedUi: false });
  if (!permission.ok) {
    if (permission.cancelled) {
      return { ok: false, message: "Save cancelled." };
    }
    return {
      ok: false,
      message:
        permission.outcome === "blocked" || permission.outcome === "restricted"
          ? "Gallery access is blocked. Open Settings to allow Digital House to save photos."
          : "Gallery permission is required to save media.",
      permissionDenied: true
    };
  }

  const MediaLibrary = await loadMediaLibrary();

  const ext = extensionFor(input.mediaType, url);
  const base =
    input.fileName?.replace(/[^\w.-]+/g, "_").slice(0, 40) ||
    `digitalhouse_${Date.now()}`;
  const localUri = `${cacheDir}${base}_${Date.now()}.${ext}`;

  try {
    const download = await FileSystem.downloadAsync(url, localUri);
    if (download.status !== 200) {
      await FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => undefined);
      return { ok: false, message: "Download failed. Please try again." };
    }

    const asset = await MediaLibrary.createAssetAsync(download.uri);
    await addToDigitalHouseAlbum(MediaLibrary, asset);

    // Delay cleanup so the OS can finish copying into the gallery.
    setTimeout(() => {
      void FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => undefined);
    }, 2000);

    return {
      ok: true,
      message:
        input.mediaType === "video"
          ? "Video saved to your gallery."
          : "Image saved to your gallery."
    };
  } catch (e) {
    await FileSystem.deleteAsync(localUri, { idempotent: true }).catch(() => undefined);
    return {
      ok: false,
      message: e instanceof Error ? e.message : "Could not save media."
    };
  }
}
