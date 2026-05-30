import { redirect } from "next/navigation";

// Legacy route. The coach offering flow is now Training Packages (the old
// "posts"/posting-package flow is retired). Redirect to the current page.
export default function CoachPackagesLegacyRedirect() {
  redirect("/coach/training-packages");
}
