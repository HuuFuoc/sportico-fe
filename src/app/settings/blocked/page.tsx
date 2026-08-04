import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { Footer } from "@/components/layout/Footer";
import { BlockedUsersClient } from "./BlockedUsersClient";

export default function BlockedUsersPage() {
  return (
    <>
      <PublicNavbar variant="solid" />
      <main className="flex-1 bg-surface px-4 py-8 sm:px-6 lg:px-8">
        <BlockedUsersClient />
      </main>
      <Footer />
    </>
  );
}
