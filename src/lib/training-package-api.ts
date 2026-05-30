// ============================================================================
// Training Package API — the current coach offering flow (replaces the legacy
// posting-package / CoachPackage purchase flow, which is NOT implemented here).
//
//   POST /api/training-packages              → TrainingPackageResponse (pending)
//   GET  /api/training-packages/me           → PagedResult<TrainingPackageResponse>
//   GET  /api/training-packages/me/{id}      → TrainingPackageResponse
//   PUT  /api/training-packages/{id}         → TrainingPackageResponse
//   PUT  /api/training-packages/{id}/archive → TrainingPackageResponse
//
// Status lifecycle (backend-owned — the frontend never fakes a transition):
//   pending → admin approves → published
//   pending → admin rejects  → rejected
//   any     → coach archives → archived   (only published shows publicly)
// ============================================================================

import { callData, callPage, jsonBody } from "@/lib/api-result";
import { backendEndpoints as ep } from "@/lib/backend/endpoints";
import type {
  TrainingPackageResponse,
  TrainingPackageRequest,
  TrainingPackageFilter,
  PagedResult,
} from "@/lib/types/coach";

function filterQuery(f: TrainingPackageFilter = {}): string {
  const sp = new URLSearchParams();
  if (f.keyword) sp.set("Keyword", f.keyword);
  if (f.sportId != null) sp.set("SportId", String(f.sportId));
  if (f.status) sp.set("Status", f.status);
  sp.set("PageNumber", String(f.pageNumber ?? 1));
  sp.set("PageSize", String(f.pageSize ?? 20));
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export function createTrainingPackage(
  payload: TrainingPackageRequest,
): Promise<TrainingPackageResponse> {
  return callData<TrainingPackageResponse>(ep.trainingPackages, {
    method: "POST",
    ...jsonBody(payload),
  });
}

export function getMyTrainingPackages(
  filter?: TrainingPackageFilter,
): Promise<PagedResult<TrainingPackageResponse>> {
  return callPage<TrainingPackageResponse>(
    ep.myTrainingPackages + filterQuery(filter),
  );
}

export function getMyTrainingPackageById(
  id: string,
): Promise<TrainingPackageResponse> {
  return callData<TrainingPackageResponse>(ep.myTrainingPackageById(id));
}

export function updateTrainingPackage(
  id: string,
  payload: TrainingPackageRequest,
): Promise<TrainingPackageResponse> {
  return callData<TrainingPackageResponse>(ep.trainingPackageById(id), {
    method: "PUT",
    ...jsonBody(payload),
  });
}

export function archiveTrainingPackage(
  id: string,
): Promise<TrainingPackageResponse> {
  return callData<TrainingPackageResponse>(ep.trainingPackageArchive(id), {
    method: "PUT",
  });
}

// ---- Status presentation ---------------------------------------------------

export const TRAINING_PACKAGE_STATUS_LABELS: Record<string, string> = {
  pending: "Chờ duyệt",
  published: "Đã xuất bản",
  rejected: "Bị từ chối",
  archived: "Đã lưu trữ",
};

export const TRAINING_PACKAGE_STATUS_ORDER = [
  "pending",
  "published",
  "rejected",
  "archived",
] as const;

export function trainingPackageStatusLabel(status: string | null | undefined): string {
  const s = (status ?? "").toLowerCase();
  return TRAINING_PACKAGE_STATUS_LABELS[s] ?? (status ?? "Không rõ");
}

/** Tailwind classes for the status badge (kept consistent across pages). */
export function trainingPackageStatusBadge(status: string | null | undefined): string {
  switch ((status ?? "").toLowerCase()) {
    case "published":
      return "bg-success-container text-[#1f7a4d] border-[#bce8c8]";
    case "rejected":
      return "bg-[#ffdad6] text-[#ba1a1a] border-[#ffbbb3]";
    case "archived":
      return "bg-surface-container-high text-on-surface-variant border-[var(--color-border-soft)]";
    case "pending":
    default:
      return "bg-[#fff5d6] text-[#b95000] border-[#f4d68a]/60";
  }
}
