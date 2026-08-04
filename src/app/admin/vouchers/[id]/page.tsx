import { AdminVoucherDetailClient } from "./AdminVoucherDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminVoucherDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <AdminVoucherDetailClient campaignId={id} />;
}
