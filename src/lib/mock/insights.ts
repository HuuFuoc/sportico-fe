import type { AIInsight, NotificationItem, VerificationRequest } from "@/types";
import { NOW } from "./clock";

export const mockInsights: AIInsight[] = [
  {
    id: "ins-l-1",
    audience: "learner",
    title: "AI INSIGHT",
    body: "Consistency is key! AI suggests a 15-minute mobility flow today.",
    cta: { label: "Start Mobility Flow", href: "/learner/schedule" },
    severity: "info",
    createdAt: NOW.toISOString(),
  },
  {
    id: "ins-l-2",
    audience: "learner",
    title: "AI INSIGHT",
    body: "Your HRV trend dropped 6% — consider an easy day before your next strength block.",
    cta: { label: "View Recovery Plan", href: "/learner/progress" },
    severity: "warning",
    createdAt: NOW.toISOString(),
  },
  {
    id: "ins-c-1",
    audience: "coach",
    title: "Performance Insight",
    body: "3 of your learners haven't booked in 2 weeks — consider sending a check-in message.",
    cta: { label: "Draft Message", href: "/coach/messages" },
    severity: "warning",
    createdAt: NOW.toISOString(),
  },
  {
    id: "ins-c-2",
    audience: "coach",
    title: "Performance Insight",
    body: "Your average response time improved by 18% this week — keep it up.",
    severity: "success",
    createdAt: NOW.toISOString(),
  },
  {
    id: "ins-a-1",
    audience: "admin",
    title: "System Insight",
    body: "AI matching accuracy is at 94.2% (+1.1% w/w). 4 coaches awaiting verification.",
    cta: { label: "Review Verifications", href: "/admin/verifications" },
    severity: "info",
    createdAt: NOW.toISOString(),
  },
];

export function getInsightsForRole(audience: AIInsight["audience"]) {
  return mockInsights.filter((i) => i.audience === audience);
}

// ============================================================================
// Notifications (TopBar dropdown)
// ============================================================================

export const mockNotifications: NotificationItem[] = [
  {
    id: "n-1",
    title: "New AI match",
    body: "Sarah Jenkins is a 99% match for your tennis goals.",
    createdAt: new Date(NOW.getTime() - 1000 * 60 * 15).toISOString(),
    read: false,
    icon: "auto_awesome",
    href: "/coaches/coach-1",
  },
  {
    id: "n-2",
    title: "Session confirmed",
    body: "Your 8am yoga session with Elena is confirmed.",
    createdAt: new Date(NOW.getTime() - 1000 * 60 * 60 * 3).toISOString(),
    read: false,
    icon: "event_available",
    href: "/learner/schedule",
  },
  {
    id: "n-3",
    title: "Payment received",
    body: "Your monthly payout of $4,250 has been processed.",
    createdAt: new Date(NOW.getTime() - 1000 * 60 * 60 * 24).toISOString(),
    read: true,
    icon: "payments",
    href: "/coach/earnings",
  },
];

export function getNotifications() {
  return mockNotifications;
}

// ============================================================================
// Verification queue (admin)
// ============================================================================

export const mockVerifications: VerificationRequest[] = [
  {
    id: "ver-1",
    coachId: "coach-9",
    coachName: "Sofia Romano",
    coachAvatar: "https://i.pravatar.cc/200?u=coach-9",
    sport: "Pilates",
    submittedAt: "2026-05-12",
    status: "pending",
    documents: [
      { id: "d1", name: "BASI Certification.pdf", type: "credential" },
      { id: "d2", name: "Liability Insurance.pdf", type: "insurance" },
    ],
  },
  {
    id: "ver-2",
    coachId: "coach-10",
    coachName: "Noah Park",
    coachAvatar: "https://i.pravatar.cc/200?u=coach-10",
    sport: "Cycling",
    submittedAt: "2026-05-14",
    status: "pending",
    documents: [
      { id: "d3", name: "USAC License.pdf", type: "credential" },
      { id: "d4", name: "Government ID.jpg", type: "identity" },
    ],
  },
  {
    id: "ver-3",
    coachId: "coach-15",
    coachName: "Aiden Foster",
    coachAvatar: "https://i.pravatar.cc/200?u=coach-15",
    sport: "Strength",
    submittedAt: "2026-05-15",
    status: "pending",
    documents: [
      { id: "d5", name: "FRC Certificate.pdf", type: "credential" },
    ],
  },
  {
    id: "ver-4",
    coachId: "coach-16",
    coachName: "Riley Chen",
    coachAvatar: "https://i.pravatar.cc/200?u=coach-16",
    sport: "Running",
    submittedAt: "2026-05-16",
    status: "pending",
    documents: [
      { id: "d6", name: "Race Results.pdf", type: "credential" },
      { id: "d7", name: "First-Aid Cert.pdf", type: "credential" },
    ],
  },
];

export function getVerifications() {
  return mockVerifications;
}
