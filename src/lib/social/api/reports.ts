// ============================================================================
// User-facing report API (community post / comment / chat message).
// Admin listing + resolution lives in `@/lib/social/api/admin-reports`.
// ============================================================================

import { callData, postJson } from "@/lib/social/http";
import { socialEndpoints as ep } from "@/lib/social/endpoints";
import type { CreateReportRequest, ReportResponse } from "@/lib/social/types";

export const REPORT_REASON_MAX_LENGTH = 200;
export const REPORT_DESCRIPTION_MAX_LENGTH = 1000;

export function createReport(payload: CreateReportRequest): Promise<ReportResponse> {
  return callData<ReportResponse>(ep.reports, postJson(payload));
}
