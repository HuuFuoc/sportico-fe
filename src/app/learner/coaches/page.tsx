import { AppShell } from "@/components/layout/AppShell";
import { CoachBrowser } from "@/components/learner/CoachBrowser";

export default function BrowseCoachesPage() {
  return (
    <AppShell role="learner" title="Tìm huấn luyện viên">
      <CoachBrowser />
    </AppShell>
  );
}
