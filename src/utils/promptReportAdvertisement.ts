import { reportAdvertisement } from "../api/advertisement.api";
import { appAlert } from "./appAlert";

const REASONS: Array<{ code: string; label: string }> = [
  { code: "MISLEADING", label: "Misleading or false information" },
  { code: "INAPPROPRIATE", label: "Inappropriate content" },
  { code: "SPAM", label: "Spam" },
  { code: "SCAM", label: "Scam or suspicious" },
  { code: "OFFENSIVE", label: "Offensive content" },
  { code: "WRONG_CONTACT", label: "Wrong contact information" },
  { code: "OTHER", label: "Other" }
];

export function promptReportAdvertisement(advertisementId: number): void {
  if (!Number.isFinite(advertisementId) || advertisementId <= 0) return;

  appAlert(
    "Report Advertisement",
    "Why are you reporting this advertisement?",
    [
      { text: "Cancel", style: "cancel" },
      ...REASONS.map((reason) => ({
        text: reason.label,
        onPress: () => {
          void (async () => {
            try {
              const res = await reportAdvertisement(advertisementId, reason.code);
              appAlert(
                "Thanks for reporting this advertisement.",
                res.message || "Our team will review it."
              );
            } catch (e: unknown) {
              const err = e as { response?: { data?: { message?: string } }; message?: string };
              appAlert(
                "Could not report",
                err.response?.data?.message ?? err.message ?? "Failed to submit report."
              );
            }
          })();
        }
      }))
    ],
    { variant: "actionSheet" }
  );
}
