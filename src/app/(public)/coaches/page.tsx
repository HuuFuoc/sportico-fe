import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { Footer } from "@/components/layout/Footer";
import { CoachBrowser } from "@/components/learner/CoachBrowser";

/**
 * Public-facing coach directory. Same UI as `/learner/coaches` but rendered
 * inside the public layout (PublicNavbar + Footer) instead of the in-app
 * AppShell (sidebar + TopBar), so guests and signed-in learners can browse
 * coaches without entering the dashboard chrome.
 */
export default function PublicCoachesPage() {
  return (
    <>
      <PublicNavbar variant="solid" />
      <main className="flex-1 bg-surface px-4 py-8 sm:px-6 lg:px-8">
        <CoachBrowser />
      </main>
      <Footer />
    </>
  );
}
