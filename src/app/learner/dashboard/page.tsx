import { redirect } from "next/navigation";

// The learner dashboard was removed. Keep the old URL working by redirecting to
// the learner's in-app home (training schedule) so stale links/bookmarks and any
// `?redirect=/learner/dashboard` from the auth flow don't 404.
export default function LearnerDashboardPage() {
  redirect("/learner/schedule");
}
