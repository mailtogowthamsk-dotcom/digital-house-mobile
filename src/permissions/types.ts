/**
 * Normalized OS permission outcomes used across the app.
 * Maps Expo ImagePicker / MediaLibrary / Notifications statuses.
 */
export type PermissionOutcome =
  | "granted"
  | "limited"
  | "denied"
  | "blocked"
  | "restricted"
  | "unavailable"
  | "undetermined";

export type EnsurePermissionResult = {
  /** True when the feature can proceed (full or limited access). */
  ok: boolean;
  outcome: PermissionOutcome;
  /** User cancelled a pre-prompt (not an OS denial). */
  cancelled?: boolean;
};

export type PermissionRationale = {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

export type DeniedGuidance = {
  title: string;
  message: string;
  /** Shown when the OS will not show the dialog again. */
  blockedMessage?: string;
};
