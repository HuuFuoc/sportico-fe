import { PaymentFailUI } from "../fail/PaymentFailUI";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// PayOS redirects cancelled checkouts here:
//   /payment/cancel?code=00&id=...&cancel=true&status=CANCELLED&orderCode=...
// Reuse PaymentFailUI — it already detects `cancel=true` / `status=CANCELLED`
// and fires a best-effort reconcile so the backend can settle the record.
export default async function PaymentCancelPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  return (
    <PaymentFailUI
      cancel={typeof raw.cancel === "string" ? raw.cancel : "true"}
      status={typeof raw.status === "string" ? raw.status : "CANCELLED"}
      orderCode={typeof raw.orderCode === "string" ? raw.orderCode : undefined}
      id={typeof raw.id === "string" ? raw.id : undefined}
    />
  );
}
