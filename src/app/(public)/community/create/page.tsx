import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { Footer } from "@/components/layout/Footer";
import { CreatePostClient } from "./CreatePostClient";

export default function CreateCommunityPostPage() {
  return (
    <>
      <PublicNavbar variant="solid" />
      <main className="flex-1 bg-surface px-4 py-8 sm:px-6 lg:px-8">
        <CreatePostClient />
      </main>
      <Footer />
    </>
  );
}
