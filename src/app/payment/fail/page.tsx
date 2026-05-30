import Link from "next/link";
import {
  XCircle,
  AlertTriangle,
  Home,
  RefreshCw,
  ClipboardList,
} from "lucide-react";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type FailScenario = "cancelled" | "failed" | "unknown";

interface ScenarioConfig {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  description: string;
  badgeBg: string;
  badgeText: string;
  badgeLabel: string;
}

function detectScenario(
  cancel?: string,
  status?: string,
): FailScenario {
  if (cancel === "true") return "cancelled";
  if (status && status !== "PAID") return "failed";
  return "unknown";
}

function getScenarioConfig(scenario: FailScenario): ScenarioConfig {
  if (scenario === "cancelled") {
    return {
      icon: <XCircle className="w-10 h-10 text-amber-600" />,
      iconBg: "bg-amber-50",
      title: "Thanh toán đã bị huỷ",
      description:
        "Bạn đã huỷ quá trình thanh toán. Không có khoản nào bị trừ từ tài khoản của bạn.",
      badgeBg: "bg-amber-50",
      badgeText: "text-amber-700",
      badgeLabel: "CANCELLED",
    };
  }

  if (scenario === "failed") {
    return {
      icon: <XCircle className="w-10 h-10 text-red-600" />,
      iconBg: "bg-red-50",
      title: "Thanh toán thất bại",
      description:
        "Giao dịch chưa hoàn tất. Vui lòng kiểm tra lại thông tin thanh toán và thử lại.",
      badgeBg: "bg-red-50",
      badgeText: "text-red-700",
      badgeLabel: "FAILED",
    };
  }

  return {
    icon: <AlertTriangle className="w-10 h-10 text-slate-500" />,
    iconBg: "bg-slate-100",
    title: "Không thể xác nhận thanh toán",
    description:
      "Chúng tôi không nhận được xác nhận thanh toán từ cổng thanh toán. Nếu bạn đã bị trừ tiền, vui lòng liên hệ hỗ trợ.",
    badgeBg: "bg-slate-100",
    badgeText: "text-slate-600",
    badgeLabel: "UNKNOWN",
  };
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function PaymentFailPage({ searchParams }: PageProps) {
  const raw = await searchParams;

  const cancel = typeof raw.cancel === "string" ? raw.cancel : undefined;
  const status = typeof raw.status === "string" ? raw.status : undefined;
  const orderCode =
    typeof raw.orderCode === "string" ? raw.orderCode : undefined;
  const id = typeof raw.id === "string" ? raw.id : undefined;

  const scenario = detectScenario(cancel, status);
  const config = getScenarioConfig(scenario);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 border-b border-slate-200 bg-white">
        <Link href="/" className="inline-flex items-center gap-2">
          <img src="/logo.png" alt="Sportico" className="h-7 w-auto" />
        </Link>
      </header>

      {/* Content */}
      <main className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_1px_2px_rgba(15,15,30,0.04),0_8px_24px_-12px_rgba(15,15,30,0.08)] overflow-hidden">
            {/* Status area */}
            <div className="px-8 py-8 text-center">
              <div
                className={`w-20 h-20 ${config.iconBg} rounded-full flex items-center justify-center mx-auto mb-5`}
              >
                {config.icon}
              </div>

              <h1 className="text-xl font-semibold text-slate-900 mb-2">
                {config.title}
              </h1>
              <p className="text-sm text-slate-500 leading-relaxed">
                {config.description}
              </p>

              <span
                className={`inline-flex items-center mt-4 px-3 py-1 rounded-full text-xs font-medium ${config.badgeBg} ${config.badgeText}`}
              >
                {config.badgeLabel}
              </span>
            </div>

            {/* Transaction reference if available */}
            {(orderCode || id) && (
              <div className="border-t border-slate-100 px-8 py-5 space-y-3">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">
                  Thông tin giao dịch
                </p>
                {orderCode && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500">Mã đơn hàng</span>
                    <span className="font-medium text-slate-800 tabular-nums">
                      {orderCode}
                    </span>
                  </div>
                )}
                {id && (
                  <div className="flex items-start justify-between gap-4 text-sm">
                    <span className="text-slate-500 shrink-0">Mã tham chiếu</span>
                    <span className="font-mono text-xs text-slate-600 text-right break-all">
                      {id}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="px-8 pb-8 pt-2 flex flex-col gap-3">
              <Link
                href="/learner/coaches"
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-[#3525cd] text-white rounded-lg text-sm font-medium hover:bg-[#2d20b8] transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Thử lại / Tìm gói tập khác
              </Link>

              <Link
                href="/learner/plan"
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                <ClipboardList className="w-4 h-4" />
                Xem lịch sử đơn hàng
              </Link>

              <Link
                href="/"
                className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                <Home className="w-4 h-4" />
                Về trang chủ
              </Link>
            </div>
          </div>

          {/* Support note */}
          <p className="text-center text-xs text-slate-400 mt-5 leading-relaxed px-4">
            Nếu bạn đã bị trừ tiền nhưng không nhận được xác nhận, vui lòng
            liên hệ đội hỗ trợ và cung cấp mã đơn hàng ở trên.
          </p>
        </div>
      </main>
    </div>
  );
}
