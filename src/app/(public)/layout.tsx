import type { ReactNode } from "react";
import { MiniChatDock } from "@/components/layout/navbar/MiniChatDock";

/**
 * Public (logged-out) route group wrapper. Pages render their own
 * `<PublicNavbar />` and `<Footer />` so each route can choose the right navbar
 * variant: landing uses `transparent` (overlays a dark hero), while content
 * pages like `/coaches` use `solid` for legibility on a light background.
 */
export default function PublicLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-surface-container-lowest">
      {children}
      <MiniChatDock />
    </div>
  );
}
