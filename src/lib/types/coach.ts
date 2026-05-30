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

export interface TrainingPackageRequest {
  sportId: number;
  title: string;
  description?: string;
  price: number;
  sessionCount: number;
  durationDays: number;
  location?: string;
  isOnline: boolean;
  level?: string;
  goalType?: string;
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
