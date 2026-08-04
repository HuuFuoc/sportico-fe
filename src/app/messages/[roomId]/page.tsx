import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { MessagesShell } from "@/components/social/chat/MessagesShell";

interface PageProps {
  params: Promise<{ roomId: string }>;
}

export default async function MessageRoomPage({ params }: PageProps) {
  const { roomId } = await params;
  return (
    <>
      <PublicNavbar variant="solid" />
      <main className="flex-1 bg-surface px-4 py-4 sm:px-6">
        <MessagesShell activeRoomId={roomId} />
      </main>
    </>
  );
}
