import { reportPost } from "../api/posts.api";
import { appAlert } from "./appAlert";

/** Confirm and submit a post report (feed / card menus). */
export function promptReportPost(postId: number): void {
  if (!Number.isFinite(postId) || postId <= 0) return;

  appAlert("Report post", "Do you want to report this post for review?", [
    { text: "Cancel", style: "cancel" },
    {
      text: "Report",
      style: "destructive",
      onPress: () => {
        void (async () => {
          try {
            await reportPost(postId, "Reported by user");
            appAlert("Report submitted", "Thank you. We will review this post.");
          } catch (e: unknown) {
            const err = e as { response?: { data?: { message?: string } }; message?: string };
            appAlert(
              "Could not report",
              err.response?.data?.message ?? err.message ?? "Failed to submit report."
            );
          }
        })();
      }
    }
  ]);
}
