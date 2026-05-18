import type { Session } from "@/types";

function isoDay(offsetDays: number, hour = 10, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export const mockSessions: Session[] = [
  // ---------- Today / soon (Coach 1: Sarah's & Learner 1: Alex's view)
  {
    id: "sess-1",
    title: "Marathon Prep — Tempo + Strides",
    coachId: "coach-6",
    learnerId: "learner-2",
    start: isoDay(0, 10, 0),
    durationMinutes: 60,
    status: "scheduled",
    type: "1-on-1",
    location: "Boulder Reservoir",
    price: 70,
    aiPlan:
      "Warm-up 15m easy → 4×6m tempo @ marathon-effort → 8×100m strides.",
  },
  {
    id: "sess-2",
    title: "Core Strength Bench",
    coachId: "coach-9",
    learnerId: "learner-3",
    start: isoDay(0, 13, 30),
    durationMinutes: 45,
    status: "scheduled",
    type: "1-on-1",
    location: "Reformer Studio B",
    price: 70,
  },
  {
    id: "sess-3",
    title: "Sprint Analysis",
    coachId: "coach-4",
    learnerId: "learner-4",
    start: isoDay(0, 16, 0),
    durationMinutes: 60,
    status: "scheduled",
    type: "1-on-1",
    location: "Track 4",
    price: 75,
  },
  {
    id: "sess-4",
    title: "Recovery Yoga Flow",
    coachId: "coach-3",
    learnerId: "learner-1",
    start: isoDay(1, 8, 0),
    durationMinutes: 60,
    status: "scheduled",
    type: "1-on-1",
    location: "Online",
    price: 65,
  },
  {
    id: "sess-5",
    title: "Tactical Drills — Net Play",
    coachId: "coach-1",
    learnerId: "learner-7",
    start: isoDay(1, 11, 0),
    durationMinutes: 60,
    status: "scheduled",
    type: "1-on-1",
    location: "Court 3",
    price: 95,
  },
  {
    id: "sess-6",
    title: "AI-Guided Mobility",
    coachId: "coach-3",
    learnerId: "learner-1",
    start: isoDay(2, 7, 30),
    durationMinutes: 30,
    status: "scheduled",
    type: "AI-Guided",
    location: "Online",
    price: 0,
  },
  {
    id: "sess-7",
    title: "Squat Form Check",
    coachId: "coach-5",
    learnerId: "learner-9",
    start: isoDay(2, 17, 0),
    durationMinutes: 45,
    status: "scheduled",
    type: "1-on-1",
    location: "PR Gym",
    price: 90,
  },
  {
    id: "sess-8",
    title: "Group HIIT — Conditioning",
    coachId: "coach-4",
    learnerId: "learner-6",
    start: isoDay(3, 18, 0),
    durationMinutes: 45,
    status: "scheduled",
    type: "Group",
    location: "Vane Performance",
    price: 30,
  },
  {
    id: "sess-9",
    title: "Open Water Technique",
    coachId: "coach-7",
    learnerId: "learner-10",
    start: isoDay(4, 9, 0),
    durationMinutes: 60,
    status: "scheduled",
    type: "1-on-1",
    location: "Mission Bay",
    price: 85,
  },
  {
    id: "sess-10",
    title: "Pre-Match Visualization",
    coachId: "coach-14",
    learnerId: "learner-7",
    start: isoDay(4, 19, 0),
    durationMinutes: 30,
    status: "scheduled",
    type: "1-on-1",
    location: "Online",
    price: 85,
  },
  {
    id: "sess-11",
    title: "FTP Test Block",
    coachId: "coach-10",
    learnerId: "learner-13",
    start: isoDay(5, 7, 0),
    durationMinutes: 75,
    status: "scheduled",
    type: "1-on-1",
    location: "Online",
    price: 75,
  },
  {
    id: "sess-12",
    title: "Shooting Mechanics",
    coachId: "coach-11",
    learnerId: "learner-14",
    start: isoDay(6, 17, 30),
    durationMinutes: 60,
    status: "scheduled",
    type: "1-on-1",
    location: "Court 2",
    price: 80,
  },

  // ---------- Pending confirmations
  {
    id: "sess-13",
    title: "Vinyasa Flow — Inversions",
    coachId: "coach-17",
    learnerId: "learner-5",
    start: isoDay(2, 9, 0),
    durationMinutes: 60,
    status: "pending_confirmation",
    type: "1-on-1",
    location: "Online",
    price: 60,
  },
  {
    id: "sess-14",
    title: "Junior Soccer — Footwork",
    coachId: "coach-18",
    learnerId: "learner-14",
    start: isoDay(3, 16, 0),
    durationMinutes: 60,
    status: "pending_confirmation",
    type: "1-on-1",
    location: "Houston Park",
    price: 65,
  },

  // ---------- Past sessions (completed)
  {
    id: "sess-p1",
    title: "Forehand Footwork Drill",
    coachId: "coach-1",
    learnerId: "learner-7",
    start: isoDay(-2, 11, 0),
    durationMinutes: 60,
    status: "completed",
    type: "1-on-1",
    location: "Court 3",
    price: 95,
  },
  {
    id: "sess-p2",
    title: "Hatha Mobility Reset",
    coachId: "coach-3",
    learnerId: "learner-1",
    start: isoDay(-3, 8, 0),
    durationMinutes: 60,
    status: "completed",
    type: "1-on-1",
    location: "Online",
    price: 65,
  },
  {
    id: "sess-p3",
    title: "Deadlift Technique",
    coachId: "coach-5",
    learnerId: "learner-9",
    start: isoDay(-5, 17, 0),
    durationMinutes: 60,
    status: "completed",
    type: "1-on-1",
    location: "PR Gym",
    price: 90,
  },
  {
    id: "sess-p4",
    title: "Threshold Intervals",
    coachId: "coach-6",
    learnerId: "learner-11",
    start: isoDay(-1, 6, 30),
    durationMinutes: 60,
    status: "completed",
    type: "1-on-1",
    location: "Boulder Track",
    price: 70,
  },
  {
    id: "sess-p5",
    title: "Sparring Fundamentals",
    coachId: "coach-8",
    learnerId: "learner-6",
    start: isoDay(-4, 18, 0),
    durationMinutes: 60,
    status: "completed",
    type: "1-on-1",
    location: "Detroit Gym",
    price: 80,
  },
  {
    id: "sess-p6",
    title: "AI-Guided Recovery Walk",
    coachId: "coach-14",
    learnerId: "learner-1",
    start: isoDay(-6, 19, 0),
    durationMinutes: 30,
    status: "completed",
    type: "AI-Guided",
    location: "Online",
    price: 0,
  },

  // ---------- Cancelled
  {
    id: "sess-x1",
    title: "Pilates Reformer Intro",
    coachId: "coach-9",
    learnerId: "learner-15",
    start: isoDay(-7, 9, 0),
    durationMinutes: 45,
    status: "cancelled",
    type: "1-on-1",
    location: "Reformer Studio A",
    price: 70,
  },
];

export function getSessions() {
  return mockSessions;
}

export function getSessionById(id: string) {
  return mockSessions.find((s) => s.id === id);
}

export function getSessionsForCoach(coachId: string) {
  return mockSessions
    .filter((s) => s.coachId === coachId)
    .sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
    );
}

export function getSessionsForLearner(learnerId: string) {
  return mockSessions
    .filter((s) => s.learnerId === learnerId)
    .sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
    );
}

export function getUpcomingSessions(filter?: {
  coachId?: string;
  learnerId?: string;
}) {
  const now = Date.now();
  return mockSessions
    .filter((s) => {
      if (new Date(s.start).getTime() < now) return false;
      if (s.status === "completed" || s.status === "cancelled") return false;
      if (filter?.coachId && s.coachId !== filter.coachId) return false;
      if (filter?.learnerId && s.learnerId !== filter.learnerId) return false;
      return true;
    })
    .sort(
      (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime(),
    );
}
