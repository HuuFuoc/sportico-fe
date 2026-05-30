import { CoachGuard } from "@/components/coach/CoachGuard";

// All /coach routes are gated by the coach role (live mode). Onboarding is the
// one exception handled inside the guard (any authenticated user may onboard).
export default function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <CoachGuard>{children}</CoachGuard>;
}
