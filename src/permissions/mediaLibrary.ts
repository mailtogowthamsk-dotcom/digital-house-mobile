import * as ImagePicker from "expo-image-picker";
import * as MediaLibrary from "expo-media-library";
import { runEnsureFlow } from "./ensureFlow";
import type { EnsurePermissionResult, PermissionOutcome } from "./types";

function mapImagePickerResponse(
  res: ImagePicker.MediaLibraryPermissionResponse
): { outcome: PermissionOutcome; canAskAgain: boolean } {
  const privileges = res.accessPrivileges;
  if (res.granted || privileges === "limited" || privileges === "all") {
    return {
      outcome: privileges === "limited" ? "limited" : "granted",
      canAskAgain: res.canAskAgain !== false
    };
  }
  if (res.status === "undetermined") {
    return { outcome: "undetermined", canAskAgain: true };
  }
  // denied
  return {
    outcome: res.canAskAgain === false ? "blocked" : "denied",
    canAskAgain: res.canAskAgain !== false
  };
}

function mapMediaLibraryResponse(
  res: MediaLibrary.PermissionResponse
): { outcome: PermissionOutcome; canAskAgain: boolean } {
  const privileges = (res as { accessPrivileges?: string }).accessPrivileges;
  if (res.granted || privileges === "limited" || privileges === "all") {
    return {
      outcome: privileges === "limited" ? "limited" : "granted",
      canAskAgain: res.canAskAgain !== false
    };
  }
  if (res.status === "undetermined") {
    return { outcome: "undetermined", canAskAgain: true };
  }
  return {
    outcome: res.canAskAgain === false ? "blocked" : "denied",
    canAskAgain: res.canAskAgain !== false
  };
}

const READ_RATIONALE = {
  title: "Allow photo access",
  message:
    "Digital House needs access to your photos and videos so you can add them to posts, your profile, and other uploads.",
  confirmLabel: "Allow access",
  cancelLabel: "Not now"
};

const READ_GUIDANCE = {
  title: "Photo access needed",
  message: "Allow photo library access to continue.",
  blockedMessage:
    "Photo access is turned off for Digital House. Open Settings → Digital House → Photos and enable access, then try again."
};

const WRITE_RATIONALE = {
  title: "Save to your gallery?",
  message:
    "Digital House needs permission to save images and videos to your device gallery.",
  confirmLabel: "Allow",
  cancelLabel: "Not now"
};

const WRITE_GUIDANCE = {
  title: "Gallery access needed",
  message: "Allow gallery access to save media to your device.",
  blockedMessage:
    "Saving to the gallery is blocked. Open Settings → Digital House and enable Photos access, then try again."
};

/** Ensure read access before launching the image/video library picker. */
export async function ensureMediaLibraryRead(opts?: {
  rationaleTitle?: string;
  rationaleMessage?: string;
  showDeniedUi?: boolean;
}): Promise<EnsurePermissionResult> {
  const rationale = {
    ...READ_RATIONALE,
    ...(opts?.rationaleTitle ? { title: opts.rationaleTitle } : null),
    ...(opts?.rationaleMessage ? { message: opts.rationaleMessage } : null)
  };

  return runEnsureFlow({
    getStatus: async () =>
      mapImagePickerResponse(await ImagePicker.getMediaLibraryPermissionsAsync()),
    request: async () =>
      mapImagePickerResponse(await ImagePicker.requestMediaLibraryPermissionsAsync()),
    rationale,
    guidance: READ_GUIDANCE,
    showDeniedUi: opts?.showDeniedUi
  });
}

/** Ensure write/add access before saving media into the device gallery. */
export async function ensureMediaLibraryWrite(opts?: {
  showDeniedUi?: boolean;
}): Promise<EnsurePermissionResult> {
  return runEnsureFlow({
    getStatus: async () =>
      mapMediaLibraryResponse(await MediaLibrary.getPermissionsAsync(true)),
    request: async () =>
      mapMediaLibraryResponse(await MediaLibrary.requestPermissionsAsync(true)),
    rationale: WRITE_RATIONALE,
    guidance: WRITE_GUIDANCE,
    showDeniedUi: opts?.showDeniedUi
  });
}
