import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { Footer } from "@/components/layout/Footer";
import { CommunityFeed } from "@/components/social/community/CommunityFeed";

/** Public community feed — no auth required, enriched for signed-in viewers. */
export default function CommunityPage() {
  return (
    <>
      <PublicNavbar variant="solid" />
      <main className="flex-1 bg-surface px-4 py-8 sm:px-6 lg:px-8">
        <CommunityFeed />
      </main>
      <Footer />
    </>
  );
}
