import type { EarningPoint, Payout } from "@/types";

export const mockEarnings: EarningPoint[] = [
  { month: "T6", gross: 3_000_000, net: 3_000_000, sessions: 12 },
  { month: "T7", gross: 3_500_000, net: 3_500_000, sessions: 14 },
  { month: "T8", gross: 3_200_000, net: 3_200_000, sessions: 13 },
  { month: "T9", gross: 4_000_000, net: 4_000_000, sessions: 16 },
  { month: "T10", gross: 4_500_000, net: 4_500_000, sessions: 18 },
  { month: "T11", gross: 4_200_000, net: 4_200_000, sessions: 17 },
  { month: "T12", gross: 3_800_000, net: 3_800_000, sessions: 15 },
  { month: "T1", gross: 4_800_000, net: 4_800_000, sessions: 19 },
  { month: "T2", gross: 5_000_000, net: 5_000_000, sessions: 20 },
  { month: "T3", gross: 5_500_000, net: 5_500_000, sessions: 22 },
  { month: "T4", gross: 6_000_000, net: 6_000_000, sessions: 24 },
  { month: "T5", gross: 5_500_000, net: 5_500_000, sessions: 22 },
];

export const mockPayouts: Payout[] = [
  {
    id: "wd-001",
    coachId: "coach-1",
    amount: 5_000_000,
    currency: "VND",
    status: "paid",
    date: "2026-05-01T00:00:00Z",
    method: "Chuyển khoản ngân hàng",
    payOsPayoutId: "payout_abc001",
    payOsPayoutStatus: "COMPLETED",
    processingAt: "2026-05-01T01:00:00Z",
    paidAt: "2026-05-01T01:02:00Z",
  },
  {
    id: "wd-002",
    coachId: "coach-1",
    amount: 10_000_000,
    currency: "VND",
    status: "paid",
    date: "2026-04-01T00:00:00Z",
    method: "Chuyển khoản ngân hàng",
    payOsPayoutId: "payout_abc002",
    payOsPayoutStatus: "COMPLETED",
    processingAt: "2026-04-01T02:00:00Z",
    paidAt: "2026-04-01T02:05:00Z",
  },
  {
    id: "wd-003",
    coachId: "coach-1",
    amount: 8_000_000,
    currency: "VND",
    status: "processing",
    date: "2026-05-16T00:00:00Z",
    method: "Chuyển khoản ngân hàng",
    payOsPayoutId: "payout_xyz003",
    payOsPayoutStatus: "PROCESSING",
    processingAt: "2026-05-16T08:00:00Z",
    paidAt: undefined,
  },
  {
    id: "wd-004",
    coachId: "coach-1",
    amount: 4_000_000,
    currency: "VND",
    status: "pending",
    date: "2026-05-20T00:00:00Z",
    method: "Chuyển khoản ngân hàng",
    payOsPayoutId: undefined,
    payOsPayoutStatus: undefined,
    processingAt: undefined,
    paidAt: undefined,
  },
  {
    id: "wd-005",
    coachId: "coach-1",
    amount: 3_000_000,
    currency: "VND",
    status: "failed",
    date: "2026-04-15T00:00:00Z",
    method: "Chuyển khoản ngân hàng",
    payOsPayoutId: "payout_zzz005",
    payOsPayoutStatus: "FAILED",
    processingAt: "2026-04-15T09:00:00Z",
    paidAt: undefined,
    failureReason: "Số tài khoản ngân hàng không hợp lệ hoặc đã bị khoá.",
  },
  {
    id: "wd-006",
    coachId: "coach-1",
    amount: 2_500_000,
    currency: "VND",
    status: "approved",
    date: "2026-05-22T00:00:00Z",
    method: "Chuyển khoản ngân hàng",
    payOsPayoutId: undefined,
    payOsPayoutStatus: undefined,
    processingAt: undefined,
    paidAt: undefined,
    adminNote: "Đã duyệt — admin sẽ chuyển khoản thủ công.",
  },
  {
    id: "wd-007",
    coachId: "coach-1",
    amount: 1_000_000,
    currency: "VND",
    status: "cancelled",
    date: "2026-05-10T00:00:00Z",
    method: "Chuyển khoản ngân hàng",
    payOsPayoutId: undefined,
    payOsPayoutStatus: undefined,
    processingAt: undefined,
    paidAt: undefined,
  },
];

export function getEarnings() {
  return mockEarnings;
}

export function getPayouts() {
  return mockPayouts;
}

export function getEarningsTotal() {
  // totalEarned = sum of all monthly gross = 53_000_000
  const totalEarned = mockEarnings.reduce((s, p) => s + p.gross, 0);
  // Kept consistent: availableBalance + pendingBalance + totalWithdrawn === totalEarned
  const totalWithdrawn = 15_000_000;
  const pendingBalance = 3_000_000;
  const availableBalance = totalEarned - totalWithdrawn - pendingBalance;
  return {
    totalEarned,
    availableBalance,
    pendingBalance,
    totalWithdrawn,
    sessions: mockEarnings.reduce((s, p) => s + p.sessions, 0),
  };
}
