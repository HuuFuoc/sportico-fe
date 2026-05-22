import type { Message, MessageThread } from "@/types";
import { NOW } from "./clock";

function isoMinutesAgo(min: number) {
  const d = new Date(NOW);
  d.setMinutes(d.getMinutes() - min);
  return d.toISOString();
}

export const mockThreads: MessageThread[] = [
  {
    id: "thread-ai-1",
    participantIds: ["learner-1", "ai"],
    lastMessagePreview:
      "I've shared a mobility-focused plan. Should I schedule it?",
    lastMessageAt: isoMinutesAgo(15),
    unreadCount: 1,
    isAI: true,
  },
  {
    id: "thread-1",
    participantIds: ["learner-1", "coach-3"],
    lastMessagePreview: "Awesome, see you at 8am tomorrow!",
    lastMessageAt: isoMinutesAgo(45),
    unreadCount: 0,
  },
  {
    id: "thread-2",
    participantIds: ["learner-1", "coach-1"],
    lastMessagePreview: "Sent you the drills video — let me know what you think.",
    lastMessageAt: isoMinutesAgo(180),
    unreadCount: 2,
  },
  {
    id: "thread-3",
    participantIds: ["learner-1", "coach-4"],
    lastMessagePreview: "Good work today on the conditioning circuit.",
    lastMessageAt: isoMinutesAgo(60 * 6),
    unreadCount: 0,
  },
  {
    id: "thread-4",
    participantIds: ["coach-1", "learner-7"],
    lastMessagePreview: "Could we move Friday's session to Saturday?",
    lastMessageAt: isoMinutesAgo(30),
    unreadCount: 1,
  },
  {
    id: "thread-5",
    participantIds: ["coach-1", "learner-2"],
    lastMessagePreview: "Strides felt strong — uploading my HR data now.",
    lastMessageAt: isoMinutesAgo(120),
    unreadCount: 0,
  },
  {
    id: "thread-6",
    participantIds: ["coach-1", "learner-4"],
    lastMessagePreview: "Plan for next week is in your calendar.",
    lastMessageAt: isoMinutesAgo(60 * 24),
    unreadCount: 0,
  },
  {
    id: "thread-7",
    participantIds: ["coach-1", "learner-9"],
    lastMessagePreview: "Re-test 1RM next Tuesday?",
    lastMessageAt: isoMinutesAgo(60 * 48),
    unreadCount: 0,
  },
];

export const mockMessages: Message[] = [
  // Thread AI-1 (learner 1 ↔ AI)
  {
    id: "m-ai-1",
    threadId: "thread-ai-1",
    senderId: "ai",
    text: "Hi Alex! How was your recovery yesterday? I noticed your heart rate variability was slightly lower than usual.",
    sentAt: isoMinutesAgo(28),
    isAI: true,
  },
  {
    id: "m-ai-2",
    threadId: "thread-ai-1",
    senderId: "learner-1",
    text: "A bit tired but okay. Any adjustments for today's workout?",
    sentAt: isoMinutesAgo(22),
  },
  {
    id: "m-ai-3",
    threadId: "thread-ai-1",
    senderId: "ai",
    text: "I've shared a mobility-focused plan. It will help with recovery while maintaining your streak. Should I schedule it?",
    sentAt: isoMinutesAgo(15),
    isAI: true,
  },

  // Thread 1 (learner 1 ↔ coach 3 Elena)
  {
    id: "m-1-1",
    threadId: "thread-1",
    senderId: "coach-3",
    text: "Welcome — I've added your intake notes to the plan.",
    sentAt: isoMinutesAgo(60 * 24),
  },
  {
    id: "m-1-2",
    threadId: "thread-1",
    senderId: "learner-1",
    text: "Thanks! Quick q — do I need a strap for tomorrow?",
    sentAt: isoMinutesAgo(120),
  },
  {
    id: "m-1-3",
    threadId: "thread-1",
    senderId: "coach-3",
    text: "Awesome, see you at 8am tomorrow!",
    sentAt: isoMinutesAgo(45),
  },

  // Thread 2 (learner 1 ↔ coach 1 Sarah)
  {
    id: "m-2-1",
    threadId: "thread-2",
    senderId: "coach-1",
    text: "Sent you the drills video — let me know what you think.",
    sentAt: isoMinutesAgo(180),
  },
  {
    id: "m-2-2",
    threadId: "thread-2",
    senderId: "coach-1",
    text: "Also — try the split-step exercise for 5 minutes daily.",
    sentAt: isoMinutesAgo(170),
  },

  // Thread 4 (coach 1 ↔ learner 7 Lila)
  {
    id: "m-4-1",
    threadId: "thread-4",
    senderId: "learner-7",
    text: "Could we move Friday's session to Saturday?",
    sentAt: isoMinutesAgo(30),
  },

  // Thread 5 (coach 1 ↔ learner 2 James)
  {
    id: "m-5-1",
    threadId: "thread-5",
    senderId: "coach-1",
    text: "How did the tempo run go?",
    sentAt: isoMinutesAgo(60 * 3),
  },
  {
    id: "m-5-2",
    threadId: "thread-5",
    senderId: "learner-2",
    text: "Strides felt strong — uploading my HR data now.",
    sentAt: isoMinutesAgo(120),
  },
];

export function getThreadsForUser(userId: string) {
  return mockThreads
    .filter((t) => t.participantIds.includes(userId))
    .sort(
      (a, b) =>
        new Date(b.lastMessageAt).getTime() -
        new Date(a.lastMessageAt).getTime(),
    );
}

export function getMessagesForThread(threadId: string) {
  return mockMessages
    .filter((m) => m.threadId === threadId)
    .sort(
      (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime(),
    );
}

export function getThreadById(id: string) {
  return mockThreads.find((t) => t.id === id);
}
