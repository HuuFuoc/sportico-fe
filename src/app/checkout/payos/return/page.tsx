import { Suspense } from "react";
import { PayOsReturnClient } from "./PayOsReturnClient";
import ClassicLoader from "@/components/ui/loader";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PayOsReturnPage({ searchParams }: PageProps) {
  const raw = await searchParams;
  const pick = (k: string) => (typeof raw[k] === "string" ? (raw[k] as string) : undefined);

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <ClassicLoader size="lg" />
        </div>
      }
    >
      <PayOsReturnClient
        orderCode={pick("orderCode")}
        cancel={pick("cancel")}
        status={pick("status")}
      />
    </Suspense>
  );
}
