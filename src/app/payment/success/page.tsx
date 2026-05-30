import { PaymentSuccessUI } from "./PaymentSuccessUI";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PaymentSuccessPage({ searchParams }: PageProps) {
  const raw = await searchParams;

  const params = {
    code: typeof raw.code === "string" ? raw.code : undefined,
    id: typeof raw.id === "string" ? raw.id : undefined,
    cancel: typeof raw.cancel === "string" ? raw.cancel : undefined,
    status: typeof raw.status === "string" ? raw.status : undefined,
    orderCode: typeof raw.orderCode === "string" ? raw.orderCode : undefined,
  };

  return <PaymentSuccessUI params={params} />;
}
