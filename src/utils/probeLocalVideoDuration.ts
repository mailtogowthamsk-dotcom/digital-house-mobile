/**
 * Best-effort local video duration (seconds) when the picker omits asset.duration.
 */
export async function probeLocalVideoDurationSec(uri: string): Promise<number | null> {
  try {
    const { NativeModules } = await import("react-native");
    if (NativeModules.Compressor == null) return null;
    const { getVideoMetaData } = await import("react-native-compressor");
    const meta = await getVideoMetaData(uri);
    const d = Number(meta?.duration);
    if (!Number.isFinite(d) || d <= 0) return null;
    // Library returns seconds on most platforms; guard against ms.
    return d > 1000 ? d / 1000 : d;
  } catch {
    return null;
  }
}
