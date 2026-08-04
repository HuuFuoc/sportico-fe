import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { Footer } from "@/components/layout/Footer";
import { MyPostsClient } from "./MyPostsClient";

export default function MyCommunityPostsPage() {
  return (
    <>
      <PublicNavbar variant="solid" />
      <main className="flex-1 bg-surface px-4 py-8 sm:px-6 lg:px-8">
        <MyPostsClient />
      </main>
      <Footer />
    </>
  );
}
