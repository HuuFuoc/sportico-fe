import type { ReactNode } from "react";
import Link from "next/link";
import { AuthBackground } from "@/components/auth/AuthBackground";
import { AuthHero } from "@/components/auth/AuthHero";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-50 text-slate-900">
      <AuthBackground />

      <div className="relative grid min-h-screen lg:grid-cols-2">
        {/* LEFT — hero panel, hidden on mobile */}
        <div className="relative hidden lg:block">
          <AuthHero />
        </div>

        {/* RIGHT — form panel */}
        <div className="relative flex min-h-screen items-center justify-center px-5 py-12 sm:px-8">
          {/* Mobile brand bar */}
          <div className="absolute inset-x-0 top-0 flex items-center justify-between px-5 py-5 lg:hidden">
            <Link href="/" aria-label="Sportico — home" className="inline-flex">
              <img
                src="/logo.png"
                alt="Sportico"
                className="h-8 w-auto rounded-[6px]"
              />
            </Link>
            <Link
              href="/"
              className="text-[12px] font-medium text-slate-500 hover:text-slate-900"
            >
              Back to site
            </Link>
          </div>

          {children}
        </div>
      </div>
    </div>
  );
}
