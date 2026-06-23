import { redirect } from "next/navigation";

/**
 * Profile preview was merged into /coach/profile as a tab. This route now
 * redirects so old links / bookmarks land on the preview tab.
 */
export default function CoachPreviewRedirect() {
  redirect("/coach/profile?tab=preview");
}
