// ============================================================================
// Domain types for Smart Coach Hub. All UI components import from this file.
// ============================================================================

export type Role = "learner" | "coach" | "admin";

export type Sport =
  | "Tennis"
  | "Yoga"
  | "HIIT"
  | "Strength"
  | "Running"
  | "Swimming"
  | "Boxing"
  | "Pilates"
  | "Cycling"
  | "Basketball"
  | "Football"
  | "Golf"
  | "Mindfulness";

export interface UserBase {
  id: string;
  name: string;
  avatarUrl: string;
  email: string;
  joinedAt: string; // ISO date
  role: Role;
}

export interface Learner extends UserBase {
  role: "learner";
  totalHoursTrained: number;
  upcomingSessions: number;
  streakDays: number;
  goals: string[];
  preferredSports: Sport[];
  matchRate?: number; // 0..100
}

export interface Coach extends UserBase {
  role: "coach";
  headline: string; // short tagline
  bio: string;
  hourlyRate: number;
  currency: string;
  rating: number; // 0..5
  reviewCount: number;
  sport: Sport;
  specialties: string[];
  yearsExperience: number;
  verified: boolean;
  location: string;
  coverImage?: string;
  matchPercent?: number; // computed for current learner
  activeLearners: number;
  totalEarningsThisMonth?: number;
}

export interface Admin extends UserBase {
  role: "admin";
  permissions: string[];
}

export type AnyUser = Learner | Coach | Admin;

// ============================================================================
// Sessions
// ============================================================================

export type SessionStatus =
  | "scheduled"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "pending_confirmation";

export interface Session {
  id: string;
  title: string;
  coachId: string;
  learnerId: string;
  start: string; // ISO datetime
  durationMinutes: number;
  status: SessionStatus;
  type: "1-on-1" | "Group" | "AI-Guided";
  notes?: string;
  location?: string;
  price: number;
  aiPlan?: string; // optional AI suggestion preview
}

// ============================================================================
// Messages
// ============================================================================

export interface MessageThread {
  id: string;
  participantIds: string[];
  lastMessagePreview: string;
  lastMessageAt: string;
  unreadCount: number;
  isAI?: boolean;
}

export interface Message {
  id: string;
  threadId: string;
  senderId: string; // 'ai' for AI assistant
  text: string;
  sentAt: string;
  isAI?: boolean;
}

// ============================================================================
// Earnings / Analytics
// ============================================================================

export interface EarningPoint {
  month: string; // 'Jan', 'Feb'...
  gross: number;
  net: number;
  sessions: number;
}

export interface Payout {
  id: string;
  coachId: string;
  amount: number;
  currency: string;
  status: "paid" | "pending" | "processing" | "failed";
  date: string; // ISO
  method: string;
}

export interface AnalyticsDailyPoint {
  date: string; // ISO date
  activeUsers: number;
  sessions: number;
  revenue: number;
}

// ============================================================================
// AI Insights
// ============================================================================

export interface AIInsight {
  id: string;
  audience: Role;
  title: string;
  body: string;
  cta?: { label: string; href: string };
  severity?: "info" | "success" | "warning";
  createdAt: string;
}

// ============================================================================
// Progress
// ============================================================================

export interface ProgressMetric {
  id: string;
  learnerId: string;
  label: string;
  current: number;
  target: number;
  unit: string;
}

export interface ProgressTrendPoint {
  week: string;
  score: number;
}

// ============================================================================
// Notifications
// ============================================================================

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  href?: string;
  icon?: string;
}

// ============================================================================
// Admin / Verification
// ============================================================================

export interface VerificationRequest {
  id: string;
  coachId: string;
  coachName: string;
  coachAvatar: string;
  sport: Sport;
  submittedAt: string;
  status: "pending" | "approved" | "rejected";
  documents: { id: string; name: string; type: string }[];
  notes?: string;
}
