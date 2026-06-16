import { LearnerGuard } from "@/components/auth/LearnerGuard";

// All /learner/* routes are gated: unauthenticated users are redirected to /login.
// In mock mode (no NEXT_PUBLIC_API_BASE_URL) the guard is bypassed for SSG/demo.
//
// NOTE: the AI advisory FAB is mounted globally in the ROOT layout via
// <AdvisoryWidgetGate /> (gated to authenticated learners) so it also appears on
// the home/public pages — not just here. Do not re-mount it in this layout or it
// would render twice on /learner/* routes.
export default function LearnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LearnerGuard>{children}</LearnerGuard>;
}
