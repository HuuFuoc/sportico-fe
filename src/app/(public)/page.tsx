import { HeroSection } from "@/components/landing/HeroSection";
import { StatStrip } from "@/components/landing/StatStrip";
import { HowItWorksSection } from "@/components/landing/HowItWorksSection";
import { AIDeepDiveSection } from "@/components/landing/AIDeepDiveSection";
import { CoachShowcaseSection } from "@/components/landing/CoachShowcaseSection";
import { ProductPreviewSection } from "@/components/landing/ProductPreviewSection";
import { TestimonialsSection } from "@/components/landing/TestimonialsSection";
import { FinalCTASection } from "@/components/landing/FinalCTASection";
import { api } from "@/lib/api";

export default async function LandingPage() {
  const coaches = await api.fetchCoaches();
  const heroCoach = coaches[0];

  return (
    <>
      {/* ===================== A — Hero (GRIND-style dark) ===================== */}
      <HeroSection coach={heroCoach} />

      {/* ===================== B — Trust strip ===================== */}
      <StatStrip />

      {/* ===================== C — How it works ===================== */}
      <HowItWorksSection />

      {/* ===================== D — AI deep-dive (dark engine) ===================== */}
      <AIDeepDiveSection />

      {/* ===================== E — Coach showcase ===================== */}
      <CoachShowcaseSection />

      {/* ===================== F — Product preview ===================== */}
      <ProductPreviewSection />

      {/* ===================== G — Testimonials ===================== */}
      <TestimonialsSection />

      {/* ===================== H — Final CTA ===================== */}
      <FinalCTASection />
    </>
  );
}
