import type { Metadata, Viewport } from "next";
import { Suspense } from "react";
import { Inter } from "next/font/google";
import { Toaster } from "sonner";
import { Analytics } from "@vercel/analytics/next";
import { ScrollRestoration } from "@/components/common/ScrollRestoration";
import { ScrollToTopButton } from "@/components/common/ScrollToTopButton";
import { ServiceWorkerRegister } from "@/components/common/ServiceWorkerRegister";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";
import { AuthBootstrap } from "@/components/auth/AuthBootstrap";
import { AdvisoryWidgetGate } from "@/components/advisory/AdvisoryWidgetGate";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  // "vietnamese" subset ensures diacritics (ầ, ạ, ữ…) render in Inter instead
  // of falling back to the OS font — which was making text look inconsistent.
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sportico — Nền tảng huấn luyện thông minh",
  description:
    "Nền tảng huấn luyện sử dụng AI để ghép nối học viên với HLV ưu tú.",
  applicationName: "Sportico",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Sportico",
    statusBarStyle: "default",
  },
  icons: {
    icon: "/logo.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#3525cd",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${inter.variable} h-full antialiased`}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=block"
        />
      </head>
      <body className="min-h-full bg-surface text-on-surface font-sans">
        <ServiceWorkerRegister />
        <AuthBootstrap />
        <Suspense fallback={null}>
          <PageViewTracker />
        </Suspense>
        <ScrollRestoration />
        {children}
        <AdvisoryWidgetGate />
        <ScrollToTopButton />
        <Toaster
          position="top-right"
          richColors
          duration={4000}
          toastOptions={{ style: { fontFamily: "var(--font-inter, Inter, sans-serif)" } }}
        />
        <Analytics />
      </body>
    </html>
  );
}
