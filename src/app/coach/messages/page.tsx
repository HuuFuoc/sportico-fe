import { AppShell } from "@/components/layout/AppShell";
import { MessagesView } from "@/components/common/MessagesView";

export default function CoachMessagesPage() {
  return (
    <AppShell role="coach" title="Messages">
      <div className="max-w-[1400px]">
        <MessagesView userId="coach-1" />
      </div>
    </AppShell>
  );
}
