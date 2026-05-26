import Link from "next/link";
import { MaterialIcon } from "@/components/icons/MaterialIcon";

const COLUMNS = [
  {
    title: "Sản phẩm",
    links: [
      { label: "Tìm HLV", href: "/learner/coaches" },
      { label: "Ghép nối AI", href: "/learner/ai-match" },
      { label: "Cách hoạt động", href: "/#how-it-works" },
      { label: "Bảng giá", href: "#" },
    ],
  },
  {
    title: "Dành cho HLV",
    links: [
      { label: "Trở thành HLV", href: "/coach/dashboard" },
      { label: "Thu nhập HLV", href: "/coach/earnings" },
      { label: "Tài nguyên", href: "#" },
      { label: "Câu chuyện thành công", href: "#" },
    ],
  },
  {
    title: "Công ty",
    links: [
      { label: "Giới thiệu", href: "#" },
      { label: "Tuyển dụng", href: "#" },
      { label: "Blog", href: "#" },
      { label: "Liên hệ", href: "#" },
    ],
  },
  {
    title: "Pháp lý",
    links: [
      { label: "Bảo mật", href: "#" },
      { label: "Điều khoản", href: "#" },
      { label: "An ninh", href: "#" },
      { label: "Cookies", href: "#" },
    ],
  },
];

const SOCIALS = [
  { icon: "alternate_email", label: "X / Twitter" },
  { icon: "photo_camera", label: "Instagram" },
  { icon: "smart_display", label: "YouTube" },
  { icon: "forum", label: "Cộng đồng" },
];

export function Footer() {
  return (
    <footer className="border-t border-[var(--color-border-soft)] bg-surface-container-lowest">
      <div className="mx-auto max-w-7xl px-6 py-12">
        {/* Top grid: brand + 4 link columns */}
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-6">
          <div className="col-span-2">
            <Link
              href="/"
              aria-label="Sportico — trang chủ"
              className="inline-flex items-center"
            >
              <img
                src="/logo.png"
                alt="Sportico"
                className="h-10 w-auto rounded-[8px]"
              />
            </Link>
            <p className="mt-3 max-w-[260px] text-body-sm text-on-surface-variant">
              Nền tảng huấn luyện AI kết nối vận động viên với HLV ưu tú — được
              xây dựng để mang lại tiến bộ đo lường được.
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-on-surface-variant">
                {col.title}
              </p>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-body-sm text-on-surface-variant transition-colors hover:text-primary"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom row: logo + copyright + social */}
        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-[var(--color-border-soft)] pt-6 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="Sportico"
              className="h-6 w-auto rounded-[4px]"
            />
            <p className="text-body-sm text-on-surface-variant">
              © 2026 Sportico. Bảo lưu mọi quyền.
            </p>
          </div>
          <div className="flex items-center gap-1">
            {SOCIALS.map((social) => (
              <a
                key={social.label}
                href="#"
                aria-label={social.label}
                className="flex h-9 w-9 items-center justify-center rounded-[6px] text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-primary"
              >
                <MaterialIcon name={social.icon} size={18} />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
