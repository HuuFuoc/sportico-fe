import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ScrollRestoration } from "@/components/common/ScrollRestoration";
import { ScrollToTopButton } from "@/components/common/ScrollToTopButton";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sportico — Nền tảng huấn luyện thông minh",
  description:
    "Nền tảng huấn luyện sử dụng AI để ghép nối học viên với HLV ưu tú.",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body className="min-h-full bg-surface text-on-surface font-sans">
        <ScrollRestoration />
        {children}
        <ScrollToTopButton />
      </body>
    </html>
  );
}
