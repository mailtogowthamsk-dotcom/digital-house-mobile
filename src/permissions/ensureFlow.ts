import { appAlert } from "../utils/appAlert";
import { openAppSettings } from "./openAppSettings";
import type {
  DeniedGuidance,
  EnsurePermissionResult,
  PermissionOutcome,
  PermissionRationale
} from "./types";

export function isUsableOutcome(outcome: PermissionOutcome): boolean {
  return outcome === "granted" || outcome === "limited";
}

/** Promise-based confirm using the app alert sheet. */
export function confirmRationale(rationale: PermissionRationale): Promise<boolean> {
  return new Promise((resolve) => {
    appAlert(rationale.title, rationale.message, [
      {
        text: rationale.cancelLabel ?? "Not now",
        style: "cancel",
        onPress: () => resolve(false)
      },
      {
        text: rationale.confirmLabel ?? "Continue",
        onPress: () => resolve(true)
      }
    ]);
  });
}

export function showPermissionDeniedAlert(
  guidance: DeniedGuidance,
  outcome: PermissionOutcome
): void {
  const blocked = outcome === "blocked" || outcome === "restricted";
  const message = blocked
    ? guidance.blockedMessage ??
      `${guidance.message}\n\nOpen Settings to enable this permission for Digital House.`
    : guidance.message;

  appAlert(guidance.title, message, [
    { text: "Not now", style: "cancel" },
    {
      text: "Open Settings",
      onPress: () => {
        void openAppSettings();
      }
    }
  ]);
}

/**
 * Shared ensure flow:
 * 1) If already usable → ok
 * 2) If undetermined → in-app rationale → system request
 * 3) If soft-denied (canAskAgain) → rationale → system request
 * 4) If blocked/restricted → Settings guidance
 */
export async function runEnsureFlow(opts: {
  getStatus: () => Promise<{
    outcome: PermissionOutcome;
    canAskAgain: boolean;
  }>;
  request: () => Promise<{
    outcome: PermissionOutcome;
    canAskAgain: boolean;
  }>;
  rationale?: PermissionRationale;
  guidance: DeniedGuidance;
  /** When false, do not show deny UI (caller handles). Default true. */
  showDeniedUi?: boolean;
}): Promise<EnsurePermissionResult> {
  const showDeniedUi = opts.showDeniedUi !== false;
  const current = await opts.getStatus();

  if (isUsableOutcome(current.outcome)) {
    return { ok: true, outcome: current.outcome };
  }

  if (current.outcome === "unavailable") {
    if (showDeniedUi) {
      appAlert(opts.guidance.title, "This permission is not available on this device.");
    }
    return { ok: false, outcome: "unavailable" };
  }

  const permanentlyBlocked =
    current.outcome === "restricted" ||
    current.outcome === "blocked" ||
    (current.outcome === "denied" && !current.canAskAgain);

  if (permanentlyBlocked) {
    const outcome: PermissionOutcome =
      current.outcome === "restricted" ? "restricted" : "blocked";
    if (showDeniedUi) showPermissionDeniedAlert(opts.guidance, outcome);
    return { ok: false, outcome };
  }

  if (opts.rationale) {
    const accepted = await confirmRationale(opts.rationale);
    if (!accepted) {
      return { ok: false, outcome: current.outcome, cancelled: true };
    }
  }

  const requested = await opts.request();
  if (isUsableOutcome(requested.outcome)) {
    return { ok: true, outcome: requested.outcome };
  }

  const finalOutcome: PermissionOutcome =
    requested.outcome === "restricted"
      ? "restricted"
      : !requested.canAskAgain || requested.outcome === "blocked"
        ? "blocked"
        : requested.outcome;

  if (showDeniedUi) showPermissionDeniedAlert(opts.guidance, finalOutcome);
  return { ok: false, outcome: finalOutcome };
}
