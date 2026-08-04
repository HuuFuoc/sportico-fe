import { AdminCommunityPostDetailClient } from "./AdminCommunityPostDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminCommunityPostDetailPage({ params }: PageProps) {
  const { id } = await params;
  return <AdminCommunityPostDetailClient postId={id} />;
}
