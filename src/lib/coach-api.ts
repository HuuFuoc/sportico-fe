// ============================================================================
// Coach API — profile + media management. Wraps the real backend behind the
// `Result<T>` envelope helper (api-result.ts). Components import these typed
// functions; they never call `fetch` directly.
//
//   GET    /api/coaches/me            → CoachProfileResponse
//   PUT    /api/coaches/me            → CoachProfileResponse
//   POST   /api/coaches/register      → CoachProfileResponse
//   GET    /api/coaches/me/media      → CoachProfileMediaResponse[]
//   POST   /api/coaches/me/media      → CoachProfileMediaResponse
//   PUT    /api/coaches/me/media/{id} → CoachProfileMediaResponse
//   DELETE /api/coaches/me/media/{id} → (void)
// ============================================================================

import { callData, callVoid, jsonBody } from "@/lib/api-result";
import { backendEndpoints as ep } from "@/lib/backend/endpoints";
import type {
  CoachProfileResponse,
  CoachProfileMediaResponse,
  CoachTeachingLocationResponse,
  RegisterCoachRequest,
  UpdateCoachProfileRequest,
  CoachProfileMediaRequest,
} from "@/lib/types/coach";
import type {
  CreateTeachingLocationRequest,
  UpdateTeachingLocationRequest,
} from "@/lib/backend/dto";

// ---- Onboarding ------------------------------------------------------------

/** Promote the authenticated user to coach and create their profile. */
export function registerCoach(
  payload: RegisterCoachRequest,
): Promise<CoachProfileResponse> {
  return callData<CoachProfileResponse>(ep.coachRegister, {
    method: "POST",
    ...jsonBody(payload),
  });
}

// ---- Profile ---------------------------------------------------------------

export function getMyCoachProfile(): Promise<CoachProfileResponse> {
  return callData<CoachProfileResponse>(ep.coachMe);
}

export function updateMyCoachProfile(
  payload: UpdateCoachProfileRequest,
): Promise<CoachProfileResponse> {
  return callData<CoachProfileResponse>(ep.coachMe, {
    method: "PUT",
    ...jsonBody(payload),
  });
}

// ---- Media -----------------------------------------------------------------

export function getMyCoachMedia(): Promise<CoachProfileMediaResponse[]> {
  return callData<CoachProfileMediaResponse[]>(ep.coachMedia);
}

export function createCoachMedia(
  payload: CoachProfileMediaRequest,
): Promise<CoachProfileMediaResponse> {
  return callData<CoachProfileMediaResponse>(ep.coachMedia, {
    method: "POST",
    ...jsonBody(payload),
  });
}

export function updateCoachMedia(
  id: string,
  payload: CoachProfileMediaRequest,
): Promise<CoachProfileMediaResponse> {
  return callData<CoachProfileMediaResponse>(ep.coachMediaById(id), {
    method: "PUT",
    ...jsonBody(payload),
  });
}

export function deleteCoachMedia(id: string): Promise<void> {
  return callVoid(ep.coachMediaById(id), { method: "DELETE" });
}

// ---- Teaching locations ----------------------------------------------------

export function getMyTeachingLocations(): Promise<CoachTeachingLocationResponse[]> {
  return callData<CoachTeachingLocationResponse[]>(ep.coachTeachingLocations);
}

export function createTeachingLocation(
  payload: CreateTeachingLocationRequest,
): Promise<CoachTeachingLocationResponse> {
  return callData<CoachTeachingLocationResponse>(ep.coachTeachingLocations, {
    method: "POST",
    ...jsonBody(payload),
  });
}

export function updateTeachingLocation(
  id: string,
  payload: UpdateTeachingLocationRequest,
): Promise<CoachTeachingLocationResponse> {
  return callData<CoachTeachingLocationResponse>(ep.coachTeachingLocationById(id), {
    method: "PUT",
    ...jsonBody(payload),
  });
}

export function deleteTeachingLocation(id: string): Promise<void> {
  return callVoid(ep.coachTeachingLocationById(id), { method: "DELETE" });
}

export function setDefaultTeachingLocation(id: string): Promise<CoachTeachingLocationResponse> {
  return callData<CoachTeachingLocationResponse>(ep.coachTeachingLocationSetDefault(id), {
    method: "PUT",
    ...jsonBody({}),
  });
}
