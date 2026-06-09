import type { MetadataRoute } from "next";

// Native Next.js manifest route → served at /manifest.webmanifest.
// Keep icon filenames in sync with scripts/generate-pwa-icons.mjs.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Sportico — Nền tảng huấn luyện thông minh",
    short_name: "Sportico",
    description:
      "Nền tảng huấn luyện sử dụng AI để ghép nối học viên với HLV ưu tú.",
    id: "/",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#3525cd",
    lang: "vi",
    categories: ["sports", "health", "education"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Lịch tập",
        short_name: "Lịch",
        url: "/learner/schedule",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
      {
        name: "Tin nhắn",
        short_name: "Chat",
        url: "/learner/messages",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }],
      },
    ],
  };
}
