import type { ReactNode } from "react";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { Footer } from "@/components/layout/Footer";

/**
 * Layout for public (logged-out) routes. The landing page uses a clean white
 * hero — design-system minimalist, no dark image overlay — so the navbar
 * renders `solid`. Switch to `variant="transparent"` if a dark-image hero is
 * ever introduced; the navbar already handles the scroll-aware transition.
 */
export default function PublicLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-surface-container-lowest">
      <PublicNavbar />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
