import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { Footer } from "@/components/layout/Footer";
import { ApplicationsManagerClient } from "./ApplicationsManagerClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CommunityApplicationsPage({ params }: PageProps) {
  const { id } = await params;
  return (
    <>
      <PublicNavbar variant="solid" />
      <main className="flex-1 bg-surface px-4 py-8 sm:px-6 lg:px-8">
        <ApplicationsManagerClient postId={id} />
      </main>
      <Footer />
    </>
  );
}
