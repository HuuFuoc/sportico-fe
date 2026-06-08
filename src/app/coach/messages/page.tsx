"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { MessagesView } from "@/components/common/MessagesView";
import { useAppStore } from "@/lib/store/useAppStore";
import { getCurrentUserId } from "@/lib/auth-session";

export default function CoachMessagesPage() {
  return (
    <AppShell role="coach" title="Tin nhắn">
      <div className="max-w-[1400px]">
        <Suspense fallback={null}>
          <CoachMessages />
        </Suspense>
      </div>
    </AppShell>
  );
}

function CoachMessages() {
  const searchParams = useSearchParams();
  const threadParam = searchParams.get("thread") ?? undefined;
  const storeUserId = useAppStore((s) => s.currentUserId);
  const userId = getCurrentUserId() ?? storeUserId ?? "coach-1";
  return <MessagesView userId={userId} initialThreadId={threadParam} />;
}
