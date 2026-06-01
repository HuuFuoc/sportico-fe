import { PaymentFailUI } from "./PaymentFailUI";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PaymentFailPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  return (
    <PaymentFailUI
      cancel={typeof raw.cancel === "string" ? raw.cancel : undefined}
      status={typeof raw.status === "string" ? raw.status : undefined}
      orderCode={typeof raw.orderCode === "string" ? raw.orderCode : undefined}
      id={typeof raw.id === "string" ? raw.id : undefined}
    />
  );
}
