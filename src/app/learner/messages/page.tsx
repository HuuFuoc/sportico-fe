import { AppShell } from "@/components/layout/AppShell";
import { MessagesView } from "@/components/common/MessagesView";

export default function LearnerMessagesPage() {
  return (
    <AppShell role="learner" title="Messages">
      <div className="max-w-[1400px]">
        <MessagesView userId="learner-1" />
      </div>
    </AppShell>
  );
}
