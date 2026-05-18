import type { EarningPoint, Payout } from "@/types";

export const mockEarnings: EarningPoint[] = [
  { month: "Jun", gross: 2800, net: 2380, sessions: 28 },
  { month: "Jul", gross: 3100, net: 2635, sessions: 31 },
  { month: "Aug", gross: 2950, net: 2507, sessions: 30 },
  { month: "Sep", gross: 3400, net: 2890, sessions: 34 },
  { month: "Oct", gross: 3850, net: 3272, sessions: 38 },
  { month: "Nov", gross: 3700, net: 3145, sessions: 36 },
  { month: "Dec", gross: 3200, net: 2720, sessions: 32 },
  { month: "Jan", gross: 3950, net: 3357, sessions: 39 },
  { month: "Feb", gross: 4100, net: 3485, sessions: 41 },
  { month: "Mar", gross: 4250, net: 3612, sessions: 42 },
  { month: "Apr", gross: 4480, net: 3808, sessions: 44 },
  { month: "May", gross: 4250, net: 3612, sessions: 42 },
];

export const mockPayouts: Payout[] = [
  {
    id: "pay-1",
    coachId: "coach-1",
    amount: 4250,
    currency: "USD",
    status: "paid",
    date: "2026-05-01",
    method: "Stripe — Bank ••4521",
  },
  {
    id: "pay-2",
    coachId: "coach-3",
    amount: 5200,
    currency: "USD",
    status: "paid",
    date: "2026-05-01",
    method: "Stripe — Bank ••8819",
  },
  {
    id: "pay-3",
    coachId: "coach-5",
    amount: 3850,
    currency: "USD",
    status: "processing",
    date: "2026-05-16",
    method: "Stripe — Bank ••2210",
  },
  {
    id: "pay-4",
    coachId: "coach-14",
    amount: 3900,
    currency: "USD",
    status: "pending",
    date: "2026-05-18",
    method: "Stripe — Bank ••7711",
  },
  {
    id: "pay-5",
    coachId: "coach-2",
    amount: 3100,
    currency: "USD",
    status: "paid",
    date: "2026-04-01",
    method: "Stripe — Bank ••1133",
  },
  {
    id: "pay-6",
    coachId: "coach-13",
    amount: 4400,
    currency: "USD",
    status: "paid",
    date: "2026-04-01",
    method: "Stripe — Bank ••6655",
  },
  {
    id: "pay-7",
    coachId: "coach-10",
    amount: 1450,
    currency: "USD",
    status: "failed",
    date: "2026-04-01",
    method: "Stripe — Bank ••9001",
  },
];

export function getEarnings() {
  return mockEarnings;
}

export function getPayouts() {
  return mockPayouts;
}

export function getEarningsTotal() {
  return mockEarnings.reduce(
    (acc, p) => ({
      gross: acc.gross + p.gross,
      net: acc.net + p.net,
      sessions: acc.sessions + p.sessions,
    }),
    { gross: 0, net: 0, sessions: 0 },
  );
}
