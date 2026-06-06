import { AdminGuard } from "@/components/auth/AdminGuard";

// All /admin/* routes are gated by the admin role (live mode): non-admins are
// routed to their own section and unauthenticated users to /login. In mock mode
// (no NEXT_PUBLIC_API_BASE_URL) the guard is bypassed for SSG/demo.
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminGuard>{children}</AdminGuard>;
}
