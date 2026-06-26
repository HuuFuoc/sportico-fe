// ============================================================================
// Contract types for the Coach flow (onboarding, profile, media, training
// packages). These mirror the backend DTOs exactly — request payload field
// names are the source of truth for what gets serialized to the API.
//
// Response shapes are re-exported from `@/lib/backend/dto` (single source of
// truth for raw backend shapes); request payload types live here.
// ============================================================================

import type { CoachMediaType } from "@/lib/constants/coach-media";

export type {
  CoachProfileResponse,
  CoachProfileMediaResponse,
  CoachTeachingLocationResponse,
  CurrentUserResponse,
  CoachProfileSummaryResponse,
  LearnerProfileSummaryResponse,
  TrainingPackageResponse,
  TrainingPackageSessionResponse,
  SportResponse,
  PagedResult,
} from "@/lib/backend/dto";

// ---- Coach onboarding ------------------------------------------------------

export interface RegisterCoachRequest {
  headline: string;
  bio?: string;
  experienceYears: number;
  sportIds: number[];
}

// ---- Coach profile update (PUT /api/coaches/me) ----------------------------
// Field names MUST match UpdateCoachProfileRequest on the backend exactly.

export interface UpdateCoachProfileRequest {
  headline?: string;
  bio?: string;
  experienceYears?: number;
  coverImageUrl?: string;
  teachingAddress?: string;
  teachingCity?: string;
  teachingDistrict?: string;
  teachingLatitude?: number;
  teachingLongitude?: number;
  isOnlineAvailable?: boolean;
  isOfflineAvailable?: boolean;
  specialties?: string;
  certificationsSummary?: string;
  achievementsSummary?: string;
  facebookUrl?: string;
  instagramUrl?: string;
  websiteUrl?: string;
}

// ---- Coach media (POST/PUT /api/coaches/me/media[/{id}]) --------------------

export interface CoachProfileMediaRequest {
  mediaType: CoachMediaType;
  mediaUrl: string;
  title?: string;
  description?: string;
  orderIndex: number;
}

// ---- Training packages (POST/PUT /api/training-packages) -------------------
// New backend model: "gói tập luyện theo lịch cố định" (fixed-schedule package).
// The package now carries a date window (startDate/endDate) plus the full list of
// fixed sessions. `durationDays` is DERIVED by the backend from the window and is
// therefore NOT part of the create/update request. `sessionCount` must equal
// `sessions.length`, and each `sessionNumber` must be unique and cover 1..N.

/** One fixed lesson inside the package schedule. */
export interface TrainingPackageSessionRequest {
  sessionNumber: number;
  /** ISO datetime (UTC). startTime < endTime, within [startDate, endDate]. */
  startTime: string;
  endTime: string;
  level?: string;
  /** Must be > 0. */
  maxParticipants: number;
  /** Required when isOnline === false. */
  location?: string;
  isOnline: boolean;
  meetingUrl?: string | null;
  note?: string;
}

export interface TrainingPackageRequest {
  sportId: number;
  title: string;
  description?: string;
  price: number;
  sessionCount: number;
  /** ISO datetime window of the package. */
  startDate: string;
  endDate: string;
  location?: string;
  isOnline: boolean;
  level?: string;
  goalType?: string;
  /** Fixed schedule — sessions.length must equal sessionCount. */
  sessions: TrainingPackageSessionRequest[];
}

export interface TrainingPackageFilter {
  keyword?: string;
  sportId?: number;
  status?: string;
  pageNumber?: number;
  pageSize?: number;
}

// ---- Sports (no GET endpoint yet — see sports-api.ts) ----------------------

export interface SportOption {
  id: number;
  name: string;
}
