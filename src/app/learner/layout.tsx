import { LearnerGuard } from "@/components/auth/LearnerGuard";

// All /learner/* routes are gated: unauthenticated users are redirected to /login.
// In mock mode (no NEXT_PUBLIC_API_BASE_URL) the guard is bypassed for SSG/demo.
export default function LearnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LearnerGuard>{children}</LearnerGuard>;
}
