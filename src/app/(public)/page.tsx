import { HeroSection } from "@/components/landing/HeroSection";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { CoachShowcaseSection } from "@/components/landing/CoachShowcaseSection";
import { MentalHealthSection } from "@/components/landing/MentalHealthSection";
import { CoachValueSection } from "@/components/landing/CoachValueSection";
import { FinalCTASection } from "@/components/landing/FinalCTASection";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { Footer } from "@/components/layout/Footer";
import { api } from "@/lib/api";

export default async function LandingPage() {
  const coaches = await api.fetchCoaches();
  const heroCoach = coaches[0];

  return (
    <>
      <PublicNavbar variant="transparent" />
      <main className="flex-1">
        {/* ===================== A — Hero ===================== */}
        <HeroSection coach={heroCoach} />

        {/* ===================== B — How it works ===================== */}
        <HowItWorksSection />

        {/* ===================== C — Coach showcase ===================== */}
        <CoachShowcaseSection />

        {/* ===================== D — Mental health / wellness ===================== */}
        <MentalHealthSection />

        {/* ===================== E — Coach value prop ===================== */}
        <CoachValueSection />

        {/* ===================== F — Final CTA ===================== */}
        <FinalCTASection />
      </main>
      <Footer />
    </>
  );
}
