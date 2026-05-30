"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { MessagesView } from "@/components/common/MessagesView";
import { useAppStore } from "@/lib/store/useAppStore";
import { getCurrentUserId } from "@/lib/auth-session";

export default function LearnerMessagesPage() {
  return (
    <AppShell role="learner" title="Messages">
      <div className="max-w-[1400px]">
        <Suspense fallback={null}>
          <LearnerMessages />
        </Suspense>
      </div>
    </AppShell>
  );
}

function LearnerMessages() {
  const searchParams = useSearchParams();
  const threadParam = searchParams.get("thread") ?? undefined;
  const storeUserId = useAppStore((s) => s.currentUserId);
  // Prefer the real authenticated user id when signed in; otherwise fall back to
  // the dev store value so the mock chat fixtures still render.
  const userId = getCurrentUserId() ?? storeUserId ?? "learner-1";
  return <MessagesView userId={userId} initialThreadId={threadParam} />;
}
