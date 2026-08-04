import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { MessagesShell } from "@/components/social/chat/MessagesShell";

export default function MessagesPage() {
  return (
    <>
      <PublicNavbar variant="solid" />
      <main className="flex-1 bg-surface px-4 py-4 sm:px-6">
        <MessagesShell />
      </main>
    </>
  );
}
