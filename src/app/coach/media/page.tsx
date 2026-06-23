import { redirect } from "next/navigation";

/**
 * Media management was merged into the coach profile page. This route now
 * redirects so any old links / bookmarks land on the new combined page.
 */
export default function CoachMediaRedirect() {
  redirect("/coach/profile");
}
