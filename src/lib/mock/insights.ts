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
    coachAvatar: "",
    sport: "Pilates",
    submittedAt: "2026-05-12",
    status: "pending",
    documents: [
      { id: "d1", name: "Pilates Reformer 8 buổi", type: "training-package" },
    ],
    kind: "training-package",
    title: "Pilates Reformer 8 buổi",
    notes: "Lộ trình Pilates reformer cho người mới, tập trung core và tư thế.",
    price: 3_200_000,
    sessionCount: 8,
    durationDays: 30,
    level: "Cơ bản",
    goalType: "Cải thiện tư thế",
    isOnline: false,
    location: "Quận 1, TP.HCM",
  },
  {
    id: "ver-2",
    coachId: "coach-10",
    coachName: "Noah Park",
    coachAvatar: "",
    sport: "Cycling",
    submittedAt: "2026-05-14",
    status: "pending",
    documents: [
      { id: "d3", name: "Bài đăng: Khoá đạp xe sức bền", type: "post" },
    ],
    kind: "post",
    title: "Khoá đạp xe sức bền mùa hè",
    notes: "Bài đăng quảng bá khoá đạp xe nhóm, 3 buổi/tuần.",
    price: 1_800_000,
    isOnline: false,
    location: "Hà Nội",
  },
  {
    id: "ver-3",
    coachId: "coach-15",
    coachName: "Aiden Foster",
    coachAvatar: "",
    sport: "Strength",
    submittedAt: "2026-05-15",
    status: "pending",
    documents: [
      { id: "d5", name: "Strength Foundation 12 buổi", type: "training-package" },
    ],
    kind: "training-package",
    title: "Strength Foundation 12 buổi",
    notes: "Chương trình tăng sức mạnh nền tảng, có đánh giá đầu vào.",
    price: 5_400_000,
    sessionCount: 12,
    durationDays: 45,
    level: "Trung cấp",
    goalType: "Tăng sức mạnh",
    isOnline: true,
  },
  {
    id: "ver-4",
    coachId: "coach-16",
    coachName: "Riley Chen",
    coachAvatar: "",
    sport: "Running",
    submittedAt: "2026-05-16",
    status: "pending",
    documents: [
      { id: "d7", name: "Vietcombank • 0123456789", type: "payout-account" },
    ],
    kind: "payout-account",
    title: "Vietcombank • 0123456789",
    notes: "CHEN THI RILEY",
  },
];

export function getVerifications() {
  return mockVerifications;
}
