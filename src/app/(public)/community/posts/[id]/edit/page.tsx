import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { Footer } from "@/components/layout/Footer";
import { EditPostClient } from "./EditPostClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditCommunityPostPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <>
      <PublicNavbar variant="solid" />
      <main className="flex-1 bg-surface px-4 py-8 sm:px-6 lg:px-8">
        <EditPostClient postId={id} />
      </main>
      <Footer />
    </>
  );
}
